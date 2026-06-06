const BaseRepository = require('../repositories/base.repository');
const { getPagination } = require('../utils/paginate');
const { sendSuccess } = require('../utils/response');
const supabase = require('../config/db');

const approvalRepository = new BaseRepository('approvals');

// Utility to assemble the timeline for a given approval, RFQ, PO, and Invoice
const constructTimeline = (approval, rfq, po, invoice) => {
  return [
    { state: 'Draft', completed: true, date: rfq?.created_at || approval.created_at },
    { 
      state: 'Submitted', 
      completed: rfq ? rfq.status !== 'draft' : true, 
      date: (rfq && rfq.status !== 'draft') ? rfq.created_at : null 
    },
    { 
      state: 'Under Review', 
      completed: approval.status !== 'pending', 
      date: approval.created_at 
    },
    { 
      state: 'Approved', 
      completed: approval.status === 'approved', 
      date: approval.decided_at || null 
    },
    { 
      state: 'PO Generated', 
      completed: !!po, 
      date: po ? po.created_at : null 
    },
    { 
      state: 'Invoice Generated', 
      completed: !!invoice, 
      date: invoice ? invoice.created_at : null 
    }
  ];
};

exports.list = async (req, res, next) => {
  try {
    const { page, limit, from, to } = getPagination(req.query);

    // Query approvals with RFQ and Quotation (including Vendor) details
    const { data: approvals, count, error } = await approvalRepository
      .query()
      .select(`
        *,
        rfqs(id, rfq_number, title, status, created_at),
        quotations(
          id, total_amount, delivery_days, status,
          vendors(company_name, vendor_code)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    // Load POs and Invoices to build timeline
    const enriched = [];
    for (const app of (approvals || [])) {
      // Find PO
      const { data: po } = await supabase
        .from('purchase_orders')
        .select('id, po_number, status, created_at')
        .eq('rfq_id', app.rfq_id)
        .maybeSingle();

      // Find Invoice
      let invoice = null;
      if (po) {
        const { data: inv } = await supabase
          .from('invoices')
          .select('id, invoice_number, status, created_at')
          .eq('po_id', po.id)
          .maybeSingle();
        invoice = inv;
      }

      const timeline = constructTimeline(app, app.rfqs, po, invoice);
      enriched.push({
        ...app,
        po,
        invoice,
        timeline
      });
    }

    return sendSuccess(res, 200, 'Approvals fetched', enriched, {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    next(error);
  }
};

exports.history = async (req, res, next) => {
  try {
    const { data: approvals, error } = await approvalRepository
      .query()
      .select(`
        *,
        rfqs(id, rfq_number, title, status, created_at),
        quotations(
          id, total_amount, delivery_days, status,
          vendors(company_name, vendor_code)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Approval history fetched', approvals || []);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { data: app, error } = await approvalRepository
      .query()
      .select(`
        *,
        rfqs(id, rfq_number, title, status, created_at),
        quotations(
          id, total_amount, delivery_days, status,
          vendors(company_name, vendor_code)
        )
      `)
      .eq('id', req.params.id)
      .maybeSingle();

    if (error || !app) {
      return sendSuccess(res, 404, 'Approval not found');
    }

    // Load PO and Invoice
    const { data: po } = await supabase
      .from('purchase_orders')
      .select('id, po_number, status, created_at')
      .eq('rfq_id', app.rfq_id)
      .maybeSingle();

    let invoice = null;
    if (po) {
      const { data: inv } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, created_at')
        .eq('po_id', po.id)
        .maybeSingle();
      invoice = inv;
    }

    const timeline = constructTimeline(app, app.rfqs, po, invoice);

    return sendSuccess(res, 200, 'Approval fetched', {
      ...app,
      po,
      invoice,
      timeline
    });
  } catch (error) {
    next(error);
  }
};

exports.decide = async (req, res, next) => {
  try {
    const { id, status, comments } = req.body;
    
    // Update approval status
    const { data: app, error } = await approvalRepository
      .query()
      .update({ 
        status, 
        comments, 
        decided_by: req.user.id, 
        decided_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // If approved, update rfq status or quotation status as appropriate
    if (status === 'approved' && app.rfq_id) {
      await supabase
        .from('rfqs')
        .update({ status: 'closed' })
        .eq('id', app.rfq_id);
      
      if (app.quotation_id) {
        await supabase
          .from('quotations')
          .update({ status: 'accepted' })
          .eq('id', app.quotation_id);
      }
    } else if (status === 'rejected' && app.quotation_id) {
      await supabase
        .from('quotations')
        .update({ status: 'rejected' })
        .eq('id', app.quotation_id);
    }

    return sendSuccess(res, 200, 'Approval decision saved', app);
  } catch (error) {
    next(error);
  }
};