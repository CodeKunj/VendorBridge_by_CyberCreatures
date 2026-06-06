const supabase = require('../config/db');
const { sendSuccess } = require('../utils/response');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

const countRows = async (table, filters = []) => {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });

  filters.forEach(([method, field, value]) => {
    query = query[method](field, value);
  });

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count || 0;
};

// 1. Dashboard Metrics
exports.dashboard = async (req, res, next) => {
  try {
    const [vendors, rfqs, quotations, purchaseOrders, invoices, notifications] = await Promise.all([
      countRows('vendors'),
      countRows('rfqs'),
      countRows('quotations'),
      countRows('purchase_orders'),
      countRows('invoices'),
      countRows('notifications'),
    ]);

    return sendSuccess(res, 200, 'Dashboard report fetched', {
      vendors,
      rfqs,
      quotations,
      purchaseOrders,
      invoices,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

// 2. Spending Analysis
exports.spending = async (req, res, next) => {
  try {
    const { data: pos, error } = await supabase
      .from('purchase_orders')
      .select('*, vendors(company_name, vendor_code)');

    if (error) throw error;

    const activePOs = (pos || []).filter(po => po.status !== 'cancelled' && po.status !== 'draft');
    
    // Total Spending
    const totalSpend = activePOs.reduce((sum, po) => sum + Number(po.total_amount), 0);

    // Spending by Vendor
    const vendorSpendMap = {};
    activePOs.forEach(po => {
      const vendorName = po.vendors?.company_name || 'Unknown Vendor';
      vendorSpendMap[vendorName] = (vendorSpendMap[vendorName] || 0) + Number(po.total_amount);
    });
    const vendorSpending = Object.entries(vendorSpendMap).map(([name, amount]) => ({
      name,
      amount
    })).sort((a, b) => b.amount - a.amount);

    // Monthly Trend
    const monthlyTrendMap = {};
    activePOs.forEach(po => {
      const date = new Date(po.created_at || po.issued_at || new Date());
      const monthKey = date.toLocaleString('default', { year: 'numeric', month: 'short' });
      monthlyTrendMap[monthKey] = (monthlyTrendMap[monthKey] || 0) + Number(po.total_amount);
    });

    const monthlyTrend = Object.entries(monthlyTrendMap).map(([month, amount]) => ({
      month,
      amount
    })).sort((a, b) => {
      return new Date(a.month) - new Date(b.month);
    });

    return sendSuccess(res, 200, 'Spending report fetched', {
      totalSpend,
      vendorSpending,
      monthlyTrend,
      allPOs: activePOs
    });
  } catch (error) {
    next(error);
  }
};

// 3. Vendor Performance Analytics
exports.vendorPerformance = async (req, res, next) => {
  try {
    const [
      { data: vendors, error: vErr },
      { data: quotations, error: qErr },
      { data: assignments, error: aErr },
      { data: pos, error: pErr }
    ] = await Promise.all([
      supabase.from('vendors').select('id, company_name, vendor_code, status'),
      supabase.from('quotations').select('id, vendor_id, status, delivery_days'),
      supabase.from('rfq_vendor_assignments').select('vendor_id, rfq_id'),
      supabase.from('purchase_orders').select('vendor_id, total_amount, status')
    ]);

    if (vErr) throw vErr;
    if (qErr) throw qErr;
    if (aErr) throw aErr;
    if (pErr) throw pErr;

    const performanceData = (vendors || []).map(v => {
      const vendorQuotes = (quotations || []).filter(q => q.vendor_id === v.id);
      const vendorAssigns = (assignments || []).filter(a => a.vendor_id === v.id);
      const vendorPOs = (pos || []).filter(p => p.vendor_id === v.id && p.status !== 'cancelled' && p.status !== 'draft');

      const totalAssignments = vendorAssigns.length;
      const totalBids = vendorQuotes.length;
      const acceptedQuotes = vendorQuotes.filter(q => q.status === 'accepted').length;

      // Participation rate
      const participationRate = totalAssignments > 0 
        ? Math.round((totalBids / totalAssignments) * 100) 
        : 0;

      // Win rate
      const winRate = totalBids > 0 
        ? Math.round((acceptedQuotes / totalBids) * 100) 
        : 0;

      // Avg delivery speed
      const deliverySum = vendorQuotes.reduce((sum, q) => sum + Number(q.delivery_days), 0);
      const avgDeliveryDays = totalBids > 0 ? Math.round(deliverySum / totalBids) : 0;

      // Total Spend
      const totalSpend = vendorPOs.reduce((sum, p) => sum + Number(p.total_amount), 0);

      // Score logic: 40% win rate + 30% participation + 30% delivery speed factor
      const speedScore = avgDeliveryDays > 0 ? Math.max(0, 100 - (avgDeliveryDays * 3)) : 70;
      const score = Math.round((winRate * 0.4) + (participationRate * 0.3) + (speedScore * 0.3));

      return {
        id: v.id,
        name: v.company_name,
        code: v.vendor_code,
        status: v.status,
        participationRate,
        winRate,
        avgDeliveryDays,
        totalPOs: vendorPOs.length,
        totalSpend,
        score: Math.min(100, Math.max(0, score))
      };
    }).sort((a, b) => b.score - a.score);

    return sendSuccess(res, 200, 'Vendor performance report fetched', performanceData);
  } catch (error) {
    next(error);
  }
};

// 4. Procurement Statistics
exports.rfqStatistics = async (req, res, next) => {
  try {
    const [
      { data: rfqs, error: rErr },
      { data: quotations, error: qErr },
      { data: rfqItems, error: riErr },
      { data: pos, error: pErr }
    ] = await Promise.all([
      supabase.from('rfqs').select('id, rfq_number, status, created_at'),
      supabase.from('quotations').select('id, rfq_id, status'),
      supabase.from('rfq_items').select('id, rfq_id'),
      supabase.from('purchase_orders').select('id, rfq_id, total_amount')
    ]);

    if (rErr) throw rErr;
    if (qErr) throw qErr;
    if (riErr) throw riErr;
    if (pErr) throw pErr;

    const totalRfqs = (rfqs || []).length;
    const totalBids = (quotations || []).length;
    const totalItems = (rfqItems || []).length;

    // Average bids per RFQ
    const avgBidsPerRfq = totalRfqs > 0 ? Number((totalBids / totalRfqs).toFixed(1)) : 0;

    // Conversion rate (RFQs that resulted in a Purchase Order)
    const rfqsWithPO = new Set((pos || []).filter(p => p.rfq_id).map(p => p.rfq_id)).size;
    const poConversionRate = totalRfqs > 0 ? Math.round((rfqsWithPO / totalRfqs) * 100) : 0;

    // Status breakdown
    const statusCounts = {};
    (rfqs || []).forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    return sendSuccess(res, 200, 'RFQ statistics fetched', {
      totalRfqs,
      totalBids,
      totalItems,
      avgBidsPerRfq,
      poConversionRate,
      statusCounts,
    });
  } catch (error) {
    next(error);
  }
};

// 5. Unified Document Exporter (PDF and Excel)
exports.exportReport = async (req, res, next) => {
  try {
    const { type, format } = req.query; // type: 'spending' | 'performance' | 'procurement', format: 'pdf' | 'xlsx'

    if (!type || !format) {
      return res.status(400).json({ success: false, message: 'Missing type or format query parameter' });
    }

    // Fetch appropriate data
    let reportTitle = '';
    let headers = [];
    let rows = [];

    if (type === 'spending') {
      reportTitle = 'Spending Analysis Report';
      const { data: pos, error } = await supabase
        .from('purchase_orders')
        .select('po_number, total_amount, status, created_at, vendors(company_name)');
      if (error) throw error;

      headers = ['PO Number', 'Vendor', 'Total Amount ($)', 'Status', 'Date'];
      rows = (pos || []).map(p => [
        p.po_number,
        p.vendors?.company_name || 'N/A',
        Number(p.total_amount).toFixed(2),
        p.status.toUpperCase(),
        new Date(p.created_at).toLocaleDateString()
      ]);
    } else if (type === 'performance') {
      reportTitle = 'Vendor Performance Rating Report';
      const [
        { data: vendors, error: vErr },
        { data: quotations, error: qErr },
        { data: assignments, error: aErr },
        { data: pos, error: pErr }
      ] = await Promise.all([
        supabase.from('vendors').select('id, company_name, vendor_code'),
        supabase.from('quotations').select('vendor_id, status, delivery_days'),
        supabase.from('rfq_vendor_assignments').select('vendor_id'),
        supabase.from('purchase_orders').select('vendor_id, total_amount, status')
      ]);

      if (vErr || qErr || aErr || pErr) throw (vErr || qErr || aErr || pErr);

      headers = ['Vendor Code', 'Company Name', 'Bids Won', 'Participation (%)', 'Avg Delivery Speed', 'Total PO Spend ($)', 'Score'];
      rows = (vendors || []).map(v => {
        const vendorQuotes = (quotations || []).filter(q => q.vendor_id === v.id);
        const vendorAssigns = (assignments || []).filter(a => a.vendor_id === v.id);
        const vendorPOs = (pos || []).filter(p => p.vendor_id === v.id && p.status !== 'cancelled' && p.status !== 'draft');

        const totalQuotes = vendorQuotes.length;
        const totalAssigns = vendorAssigns.length;
        const acceptedQuotes = vendorQuotes.filter(q => q.status === 'accepted').length;

        const participation = totalAssigns > 0 ? Math.round((totalQuotes / totalAssigns) * 100) : 0;
        const deliverySum = vendorQuotes.reduce((sum, q) => sum + Number(q.delivery_days), 0);
        const avgDelivery = totalQuotes > 0 ? Math.round(deliverySum / totalQuotes) : 0;
        const spendSum = vendorPOs.reduce((sum, p) => sum + Number(p.total_amount), 0);

        const speedScore = avgDelivery > 0 ? Math.max(0, 100 - (avgDelivery * 3)) : 70;
        const winRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;
        const score = Math.round((winRate * 0.4) + (participation * 0.3) + (speedScore * 0.3));

        return [
          v.vendor_code,
          v.company_name,
          acceptedQuotes,
          participation,
          avgDelivery > 0 ? `${avgDelivery} days` : 'N/A',
          spendSum.toFixed(2),
          Math.min(100, Math.max(0, score))
        ];
      });
    } else if (type === 'procurement') {
      reportTitle = 'Procurement Sourcing Statistics';
      const { data: rfqs, error } = await supabase
        .from('rfqs')
        .select('rfq_number, title, status, created_at, rfq_items(id), quotations(id)');
      if (error) throw error;

      headers = ['RFQ Number', 'RFQ Title', 'Status', 'Line Items', 'Bids Received', 'Created Date'];
      rows = (rfqs || []).map(r => [
        r.rfq_number,
        r.title,
        r.status.toUpperCase(),
        r.rfq_items?.length || 0,
        r.quotations?.length || 0,
        new Date(r.created_at).toLocaleDateString()
      ]);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    // EXPORT PDF
    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_report.pdf"`);
      doc.pipe(res);

      // Print Header Banner
      doc.rect(0, 0, doc.page.width, 100).fill('#1f4f86');
      doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('VendorBridge ERP Operations', 50, 25);
      doc.fontSize(12).font('Helvetica').text(reportTitle, 50, 55);

      // Footer printing
      let pageNumber = 1;
      doc.on('pageAdded', () => {
        pageNumber++;
        doc.fillColor('#64748b').fontSize(8).text(`Page ${pageNumber}`, 50, doc.page.height - 40, { align: 'right' });
      });

      // Meta info
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold').text(`Generated on: ${new Date().toLocaleString()}`, 50, 120);

      // Draw Grid Table
      let currentY = 155;
      const colWidth = (doc.page.width - 100) / headers.length;

      // Header Row
      doc.rect(45, currentY - 5, doc.page.width - 90, 22).fill('#eaf2fb');
      doc.fillColor('#1f4f86').font('Helvetica-Bold').fontSize(9);
      headers.forEach((h, i) => {
        doc.text(h, 50 + (i * colWidth), currentY);
      });
      currentY += 25;

      // Data Rows
      doc.fillColor('#334155').font('Helvetica').fontSize(8.5);
      rows.forEach((row) => {
        if (currentY > doc.page.height - 80) {
          doc.addPage();
          currentY = 50;
        }

        row.forEach((cell, i) => {
          doc.text(String(cell), 50 + (i * colWidth), currentY, { width: colWidth - 10 });
        });

        // Add visual horizontal divider line
        doc.moveTo(45, currentY + 14).lineTo(doc.page.width - 45, currentY + 14).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        currentY += 22;
      });

      doc.end();
    } 
    // EXPORT EXCEL
    else if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();

      // Format row arrays as JSON objects matching headers
      const sheetData = rows.map(row => {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = row[idx];
        });
        return obj;
      });

      const ws = XLSX.utils.json_to_sheet(sheetData);
      
      // Auto-fit column widths
      const colWidths = headers.map(h => ({ wch: Math.max(h.length + 4, 12) }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Report Data');
      
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_report.xlsx"`);
      res.send(buffer);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid format requested.' });
    }
  } catch (error) {
    next(error);
  }
};

// Keep old exportSpending for backwards compatibility
exports.exportSpending = async (req, res, next) => {
  req.query.type = 'spending';
  req.query.format = 'xlsx';
  return exports.exportReport(req, res, next);
};