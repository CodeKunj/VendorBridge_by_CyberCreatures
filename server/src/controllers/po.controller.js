const BaseRepository = require('../repositories/base.repository');
const { getPagination } = require('../utils/paginate');
const { sendSuccess, sendError } = require('../utils/response');
const supabase = require('../config/db');
const { logActivity, notifyUser } = require('../utils/logger');
const PDFDocument = require('pdfkit');

const poRepository = new BaseRepository('purchase_orders');

// Auto PO number generator
const nextPoNumber = async () => {
  const { count, error } = await poRepository.query().select('id', { count: 'exact', head: true });
  if (error) {
    throw error;
  }
  const year = new Date().getFullYear();
  return `PO-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
};

exports.list = async (req, res, next) => {
  try {
    const { page, limit, from, to } = getPagination(req.query);

    const { data: pos, count, error } = await poRepository
      .query()
      .select(`
        *,
        vendors(company_name, vendor_code),
        rfqs(rfq_number, title)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Purchase orders fetched', pos || [], {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Fetch PO
    const { data: po, error } = await poRepository
      .query()
      .select(`
        *,
        vendors(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !po) {
      return sendError(res, 404, 'Purchase order not found');
    }

    // Load buyer details
    const { data: buyer } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', po.buyer_id)
      .maybeSingle();

    // Load RFQ details
    let rfq = null;
    if (po.rfq_id) {
      const { data: rfqData } = await supabase
        .from('rfqs')
        .select('*')
        .eq('id', po.rfq_id)
        .maybeSingle();
      rfq = rfqData;
    }

    // Load quotation items (with pricing)
    let items = [];
    if (po.quotation_id) {
      const { data: quotItems } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', po.quotation_id);
      items = quotItems || [];
    }

    // Fallback to RFQ items if no quotation items exist
    if (items.length === 0 && po.rfq_id) {
      const { data: rfqItems } = await supabase
        .from('rfq_items')
        .select('*')
        .eq('rfq_id', po.rfq_id);
      
      items = (rfqItems || []).map(item => ({
        id: item.id,
        item_name: item.item_name || item.product_name || 'Item',
        description: item.description || item.notes || '',
        quantity: item.quantity || 1,
        unit_price: 0,
        total_price: 0
      }));
    }

    return sendSuccess(res, 200, 'Purchase order fetched', {
      ...po,
      buyer,
      rfq,
      items
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    
    // Generate auto PO number if not provided
    if (!payload.po_number) {
      payload.po_number = await nextPoNumber();
    }

    // Assign buyer id from auth token
    payload.buyer_id = req.user.id;
    payload.status = payload.status || 'issued';
    payload.issued_at = new Date().toISOString();

    const { data, error } = await poRepository
      .query()
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Create a notification for the vendor
    if (data.vendor_id) {
      const { data: vendor } = await supabase
        .from('vendors')
        .select('user_id')
        .eq('id', data.vendor_id)
        .maybeSingle();

      if (vendor?.user_id) {
        await notifyUser(
          vendor.user_id,
          'New Purchase Order Issued',
          `Purchase order ${data.po_number} has been issued to you.`,
          'po',
          data.id,
          'purchase_orders'
        );
      }
    }

    // Audit Log
    await logActivity(req.user.id, `Issued Purchase Order ${data.po_number}`, 'Purchasing', data.id, { amount: data.total_amount }, req.ip);

    return sendSuccess(res, 201, 'Purchase order created', data);
  } catch (error) {
    next(error);
  }
};

exports.downloadPdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Load PO and relations
    const { data: po, error } = await poRepository
      .query()
      .select('*, vendors(*)')
      .eq('id', id)
      .maybeSingle();

    if (error || !po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    const { data: buyer } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', po.buyer_id)
      .maybeSingle();

    let items = [];
    if (po.quotation_id) {
      const { data: quotItems } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', po.quotation_id);
      items = quotItems || [];
    }

    if (items.length === 0 && po.rfq_id) {
      const { data: rfqItems } = await supabase
        .from('rfq_items')
        .select('*')
        .eq('rfq_id', po.rfq_id);
      
      items = (rfqItems || []).map(item => ({
        item_name: item.item_name || item.product_name || 'Item',
        description: item.description || item.notes || '',
        quantity: item.quantity || 1,
        unit_price: 0,
        total_price: 0
      }));
    }

    // Construct PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${po.po_number}.pdf"`);

    doc.pipe(res);

    // Header Title
    doc.fontSize(20).text('PURCHASE ORDER', { align: 'right' });
    doc.fontSize(10).text(`PO Number: ${po.po_number}`, { align: 'right' });
    doc.text(`Date: ${po.issued_at ? new Date(po.issued_at).toLocaleDateString() : new Date().toLocaleDateString()}`, { align: 'right' });
    doc.text(`Status: ${po.status.toUpperCase()}`, { align: 'right' });
    doc.moveDown();

    // Company Brand / Info
    doc.fontSize(14).text('VendorBridge ERP System', 50, 50);
    doc.fontSize(9).text('Corporate Procurement Department', 50, 70);
    doc.text('procurement@vendorbridge.com', 50, 85);
    doc.moveDown(2);

    // Vendor / Buyer Columns
    const startY = doc.y;
    doc.fontSize(11).text('ISSUED TO (VENDOR):', 50, startY, { underline: true });
    doc.fontSize(10).text(po.vendors?.company_name || 'N/A', 50, startY + 15);
    doc.text(`Code: ${po.vendors?.vendor_code || 'N/A'}`, 50, startY + 30);
    doc.text(`Email: ${po.vendors?.email || 'N/A'}`, 50, startY + 45);
    doc.text(`Phone: ${po.vendors?.phone || 'N/A'}`, 50, startY + 60);

    doc.fontSize(11).text('SHIP / BILL TO (BUYER):', 300, startY, { underline: true });
    doc.fontSize(10).text(buyer?.name || 'Procurement Agent', 300, startY + 15);
    doc.text(`Email: ${buyer?.email || 'N/A'}`, 300, startY + 30);
    doc.text('VendorBridge Headquarters', 300, startY + 45);
    doc.moveDown(4);

    // Draw Line items header
    const tableTop = doc.y + 40;
    doc.fontSize(10).text('Item Description', 50, tableTop, { bold: true });
    doc.text('Qty', 300, tableTop, { align: 'right', bold: true });
    doc.text('Unit Price', 400, tableTop, { align: 'right', bold: true });
    doc.text('Total', 500, tableTop, { align: 'right', bold: true });
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Draw Line items body
    let currentY = tableTop + 25;
    items.forEach((item) => {
      doc.text(item.item_name, 50, currentY);
      doc.fontSize(8).text(item.description || '', 50, currentY + 12, { width: 200, color: 'gray' });
      doc.fontSize(10);

      doc.text(item.quantity.toString(), 300, currentY, { align: 'right' });
      doc.text(`$${parseFloat(item.unit_price || 0).toFixed(2)}`, 400, currentY, { align: 'right' });
      doc.text(`$${parseFloat(item.total_price || 0).toFixed(2)}`, 500, currentY, { align: 'right' });
      currentY += 30;
    });

    // Total Amount line
    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 15;
    doc.fontSize(12).text('TOTAL AMOUNT:', 350, currentY, { bold: true });
    doc.text(`$${parseFloat(po.total_amount || 0).toFixed(2)}`, 500, currentY, { align: 'right', bold: true });

    // Footer terms
    doc.fontSize(9).text('Terms & Conditions:', 50, currentY + 60, { underline: true });
    doc.text('1. Please reference the Purchase Order number on all invoices and shipping documents.', 50, currentY + 75);
    doc.text('2. Goods are subject to inspection and approval upon delivery.', 50, currentY + 90);

    doc.end();
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { data, error } = await poRepository
      .query()
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Audit Log
    await logActivity(req.user.id, `Updated Purchase Order status to ${status}`, 'Purchasing', data.id, { status }, req.ip);

    // Notify appropriate party
    if (status === 'accepted') {
      // Vendor accepted -> notify buyer
      await notifyUser(
        data.buyer_id,
        'Purchase Order Accepted',
        `Purchase order ${data.po_number} has been accepted by the supplier.`,
        'po',
        data.id,
        'purchase_orders'
      );
    } else {
      // Buyer changed status -> notify vendor
      const { data: vendor } = await supabase
        .from('vendors')
        .select('user_id')
        .eq('id', data.vendor_id)
        .maybeSingle();
      if (vendor?.user_id) {
        await notifyUser(
          vendor.user_id,
          `Purchase Order Status: ${status.toUpperCase()}`,
          `Purchase order ${data.po_number} status has been updated to ${status}.`,
          'po',
          data.id,
          'purchase_orders'
        );
      }
    }

    return sendSuccess(res, 200, 'Purchase order status updated', data);
  } catch (error) {
    next(error);
  }
};