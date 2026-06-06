const BaseRepository = require('../repositories/base.repository');
const { getPagination } = require('../utils/paginate');
const { sendSuccess, sendError } = require('../utils/response');
const supabase = require('../config/db');
const { logActivity, notifyUser } = require('../utils/logger');
const { createTransporter } = require('../config/mailer');
const PDFDocument = require('pdfkit');
const { formatINR } = require('../utils/currency');
const { drawLineItemHeader, drawLineItemRow, drawAmountRow } = require('../utils/pdfTable');

const invoiceRepository = new BaseRepository('invoices');

// Auto Invoice number generator
const nextInvoiceNumber = async () => {
  const { count, error } = await invoiceRepository.query().select('id', { count: 'exact', head: true });
  if (error) {
    throw error;
  }
  const year = new Date().getFullYear();
  return `INV-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
};

// Common PDF generation function returning a Promise of a Buffer
const generateInvoicePdfBuffer = (invoice, items, po, vendor) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      // Header Title
      doc.fontSize(20).text('TAX INVOICE', { align: 'right' });
      doc.fontSize(10).text(`Invoice Number: ${invoice.invoice_number}`, { align: 'right' });
      doc.text(`Date: ${invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : new Date().toLocaleDateString()}`, { align: 'right' });
      doc.text(`Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}`, { align: 'right' });
      doc.text(`Status: ${invoice.status.toUpperCase()}`, { align: 'right' });
      doc.moveDown();

      // Brand Info
      doc.fontSize(14).text('VendorBridge ERP System', 50, 50);
      doc.fontSize(9).text('Billing & Financial Operations', 50, 70);
      doc.text('billing@vendorbridge.com', 50, 85);
      doc.moveDown(2);

      // Bill From / Bill To details
      const startY = doc.y;
      doc.fontSize(11).text('BILL FROM (SUPPLIER / VENDOR):', 50, startY, { underline: true });
      doc.fontSize(10).text(vendor?.company_name || 'N/A', 50, startY + 15);
      doc.text(`GSTIN: ${vendor?.gst_number || 'N/A'}`, 50, startY + 30);
      doc.text(`Email: ${vendor?.email || 'N/A'}`, 50, startY + 45);
      doc.text(`Address: ${vendor?.address || 'N/A'}`, 50, startY + 60, { width: 220 });

      doc.fontSize(11).text('BILL TO (BUYER / COMPANY):', 300, startY, { underline: true });
      doc.fontSize(10).text('VendorBridge Corporate HQ', 300, startY + 15);
      doc.text('finance@vendorbridge.com', 300, startY + 30);
      doc.text('PO Reference: ' + (po?.po_number || 'N/A'), 300, startY + 45);
      doc.moveDown(4);

      const tableTop = doc.y + 45;
      let currentY = drawLineItemHeader(doc, tableTop);

      items.forEach((item) => {
        currentY = drawLineItemRow(doc, item, currentY);
      });

      doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
      currentY += 12;

      const subtotal = parseFloat(invoice.subtotal || 0);
      const tax = parseFloat(invoice.tax_amount || 0);
      const cgstSgst = tax / 2;
      const total = parseFloat(invoice.total_amount || 0);

      currentY = drawAmountRow(doc, 'SUBTOTAL (INR):', subtotal, currentY);
      currentY = drawAmountRow(doc, 'CGST (9.0%):', cgstSgst, currentY);
      currentY = drawAmountRow(doc, 'SGST (9.0%):', cgstSgst, currentY);
      currentY = drawAmountRow(doc, 'TOTAL DUE (INCL. GST):', total, currentY, { bold: true });

      // Sign-off / footer terms
      doc.fontSize(8).text('Disclaimer: This is a system-generated Tax Invoice and does not require a signature.', 50, currentY + 100, { align: 'center', color: 'gray' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

exports.list = async (req, res, next) => {
  try {
    const { page, limit, from, to } = getPagination(req.query);

    const { data: invoices, count, error } = await invoiceRepository
      .query()
      .select(`
        *,
        vendors(company_name, vendor_code, gst_number),
        purchase_orders(po_number)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Invoices fetched', invoices || [], {
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

    const { data: invoice, error } = await invoiceRepository
      .query()
      .select(`
        *,
        vendors(*),
        purchase_orders(*)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !invoice) {
      return sendError(res, 404, 'Invoice not found');
    }

    // Retrieve items from purchase order's linked quotation items
    let items = [];
    if (invoice.purchase_orders?.quotation_id) {
      const { data: quotItems } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', invoice.purchase_orders.quotation_id);
      items = quotItems || [];
    }

    return sendSuccess(res, 200, 'Invoice fetched', {
      ...invoice,
      items
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const payload = { ...req.body };

    // Auto Invoice number
    if (!payload.invoice_number) {
      payload.invoice_number = await nextInvoiceNumber();
    }

    // Calculate dynamic GST (18%) and total amount
    const subtotal = parseFloat(payload.subtotal || 0);
    payload.tax_amount = subtotal * 0.18; // 18% GST (9% CGST + 9% SGST)
    payload.total_amount = subtotal + payload.tax_amount;

    payload.status = payload.status || 'draft';
    payload.due_date = payload.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days default

    const { data, error } = await invoiceRepository
      .query()
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Audit Log
    await logActivity(req.user.id, `Created Invoice ${data.invoice_number}`, 'Billing', data.id, { amount: data.total_amount }, req.ip);

    // Notify buyer
    const { data: po } = await supabase.from('purchase_orders').select('buyer_id, po_number').eq('id', data.po_id).maybeSingle();
    if (po?.buyer_id) {
      await notifyUser(
        po.buyer_id,
        'New Invoice Submitted',
        `A new invoice ${data.invoice_number} has been submitted for Purchase Order ${po.po_number}.`,
        'invoice',
        data.id,
        'invoices'
      );
    }

    return sendSuccess(res, 201, 'Invoice created successfully', data);
  } catch (error) {
    next(error);
  }
};

exports.downloadPdf = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: invoice, error } = await invoiceRepository
      .query()
      .select('*, vendors(*), purchase_orders(*)')
      .eq('id', id)
      .maybeSingle();

    if (error || !invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    let items = [];
    if (invoice.purchase_orders?.quotation_id) {
      const { data: quotItems } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', invoice.purchase_orders.quotation_id);
      items = quotItems || [];
    }

    const pdfBuffer = await generateInvoicePdfBuffer(invoice, items, invoice.purchase_orders, invoice.vendors);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

exports.sendEmail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: invoice, error } = await invoiceRepository
      .query()
      .select('*, vendors(*), purchase_orders(*)')
      .eq('id', id)
      .maybeSingle();

    if (error || !invoice) {
      return sendError(res, 404, 'Invoice not found');
    }

    let items = [];
    if (invoice.purchase_orders?.quotation_id) {
      const { data: quotItems } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', invoice.purchase_orders.quotation_id);
      items = quotItems || [];
    }

    // Generate attachment PDF
    const pdfBuffer = await generateInvoicePdfBuffer(invoice, items, invoice.purchase_orders, invoice.vendors);

    // Get buyer email (or fall back to system email)
    let recipientEmail = 'procurement@vendorbridge.com';
    if (invoice.purchase_orders?.buyer_id) {
      const { data: buyer } = await supabase
        .from('users')
        .select('email')
        .eq('id', invoice.purchase_orders.buyer_id)
        .maybeSingle();
      if (buyer?.email) {
        recipientEmail = buyer.email;
      }
    }

    // Configure Mailer Transporter
    const transporter = createTransporter();
    
    const mailOptions = {
      from: '"VendorBridge Billing" <billing@vendorbridge.com>',
      to: recipientEmail,
      cc: invoice.vendors?.email || undefined,
      subject: `[INVOICE] Tax Invoice ${invoice.invoice_number} Issued`,
      text: `Dear Partner,\n\nPlease find attached the official Tax Invoice ${invoice.invoice_number} generated for Purchase Order ${invoice.purchase_orders?.po_number || 'N/A'}.\n\nInvoice Overview:\n- Subtotal: ${formatINR(invoice.subtotal)}\n- GST (18.00%): ${formatINR(invoice.tax_amount)}\n- Total Due: ${formatINR(invoice.total_amount)}\n\nBest Regards,\nVendorBridge Finance Team`,
      attachments: [
        {
          filename: `${invoice.invoice_number}.pdf`,
          content: pdfBuffer
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    return sendSuccess(res, 200, 'Invoice successfully emailed via SMTP', { recipient: recipientEmail });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { data, error } = await invoiceRepository
      .query()
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Audit Log
    await logActivity(req.user.id, `Updated Invoice status to ${status}`, 'Billing', data.id, { status }, req.ip);

    // Notify buyer and vendor
    const { data: po } = await supabase.from('purchase_orders').select('buyer_id, po_number').eq('id', data.po_id).maybeSingle();
    if (po?.buyer_id) {
      await notifyUser(
        po.buyer_id,
        'Invoice Status Updated',
        `Invoice ${data.invoice_number} status has been updated to ${status}.`,
        'invoice',
        data.id,
        'invoices'
      );
    }

    const { data: vendor } = await supabase.from('vendors').select('user_id').eq('id', data.vendor_id).maybeSingle();
    if (vendor?.user_id) {
      await notifyUser(
        vendor.user_id,
        'Invoice Status Updated',
        `Invoice ${data.invoice_number} status has been updated to ${status}.`,
        'invoice',
        data.id,
        'invoices'
      );
    }

    return sendSuccess(res, 200, 'Invoice status updated', data);
  } catch (error) {
    next(error);
  }
};