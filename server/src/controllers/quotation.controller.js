const supabase = require('../config/db');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { getPagination } = require('../utils/paginate');
const { uploadQuotationAttachment, removeQuotationAttachment } = require('../utils/quotationsStorage');

const quotationColumns = `*, rfqs(rfq_number, title, deadline, status), vendors(company_name, vendor_code), quotation_items(*), quotation_attachments(*)`;

const parseJsonField = (value, fallback = []) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  return fallback;
};

exports.list = async (req, res, next) => {
  try {
    const { page, limit, from, to } = getPagination(req.query);
    const { rfq_id, status } = req.query;
    const user = req.user;

    let query = supabase
      .from('quotations')
      .select(quotationColumns, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (rfq_id) query = query.eq('rfq_id', rfq_id);
    if (status)  query = query.eq('status', status);

    // Vendors only see their own quotations
    if (user.role === 'vendor') {
      const { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', user.id).single();
      if (vendor) query = query.eq('vendor_id', vendor.id);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return sendPaginated(res, data, count, page, limit);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select(quotationColumns)
      .eq('id', req.params.id)
      .single();

    if (error || !data) return sendError(res, 404, 'Quotation not found');
    return sendSuccess(res, 200, 'Quotation fetched', data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { rfq_id, total_amount, delivery_days, notes } = req.body;
    const items = parseJsonField(req.body.items, []);
    const user = req.user;
    const files = req.files || [];

    const { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', user.id).single();
    if (!vendor) return sendError(res, 400, 'No vendor profile linked to your account');

    // Check vendor is assigned to this RFQ
    const { data: assignment } = await supabase
      .from('rfq_vendor_assignments')
      .select('id')
      .eq('rfq_id', rfq_id)
      .eq('vendor_id', vendor.id)
      .single();

    if (!assignment) return sendError(res, 403, 'You are not assigned to this RFQ');

    // Check RFQ deadline
    const { data: rfq } = await supabase.from('rfqs').select('deadline, status, rfq_number').eq('id', rfq_id).single();
    if (!rfq || rfq.status !== 'published') return sendError(res, 400, 'RFQ is not accepting quotations');
    if (new Date(rfq.deadline) < new Date()) return sendError(res, 400, 'RFQ deadline has passed');

    const { data: quotation, error } = await supabase
      .from('quotations')
      .insert({ rfq_id, vendor_id: vendor.id, total_amount, delivery_days, notes, status: 'submitted', submitted_at: new Date() })
      .select()
      .single();

    if (error) throw error;

    if (items.length > 0) {
      await supabase.from('quotation_items').insert(items.map(item => ({ ...item, quotation_id: quotation.id })));
    }

    if (files.length > 0) {
      const attachments = [];

      for (const file of files) {
        attachments.push(await uploadQuotationAttachment(file));
      }

      await supabase.from('quotation_attachments').insert(
        attachments.map((attachment) => ({
          quotation_id: quotation.id,
          file_name: attachment.fileName,
          file_path: attachment.filePath,
          file_url: attachment.fileUrl,
          mime_type: attachment.mimeType,
          file_size: attachment.fileSize,
        }))
      );
    }

    // Notify procurement officers
    const { data: officers } = await supabase.from('users').select('id').eq('role', 'procurement_officer').eq('status', 'active');
    if (officers?.length > 0) {
      await supabase.from('notifications').insert(
        officers.map(o => ({
          user_id: o.id,
          title: 'New Quotation Submitted',
          message: `A quotation has been submitted for RFQ ${rfq.rfq_number}`,
          type: 'quotation',
          entity_id: quotation.id,
          entity_type: 'quotation',
        }))
      );
    }

    return sendSuccess(res, 201, 'Quotation submitted', quotation);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { total_amount, delivery_days, notes } = req.body;
    const items = req.body.items !== undefined ? parseJsonField(req.body.items, []) : null;
    const user = req.user;

    const { data: existing } = await supabase.from('quotations').select('*, rfqs(deadline), quotation_attachments(*), vendors(user_id)').eq('id', req.params.id).single();
    if (!existing) return sendError(res, 404, 'Quotation not found');
    if (existing.vendors?.user_id !== user.id) return sendError(res, 403, 'You can only edit your own quotation');
    if (new Date(existing.rfqs.deadline) < new Date()) return sendError(res, 400, 'Cannot edit after deadline');

    const files = req.files || [];

    const { data, error } = await supabase
      .from('quotations')
      .update({ total_amount, delivery_days, notes })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    if (items !== null) {
      await supabase.from('quotation_items').delete().eq('quotation_id', data.id);
      if (items.length > 0) {
        await supabase.from('quotation_items').insert(items.map(i => ({ ...i, quotation_id: data.id })));
      }
    }

    if (files.length > 0) {
      const attachments = [];

      for (const file of files) {
        attachments.push(await uploadQuotationAttachment(file));
      }

      await supabase.from('quotation_attachments').insert(
        attachments.map((attachment) => ({
          quotation_id: data.id,
          file_name: attachment.fileName,
          file_path: attachment.filePath,
          file_url: attachment.fileUrl,
          mime_type: attachment.mimeType,
          file_size: attachment.fileSize,
        }))
      );
    }

    return sendSuccess(res, 200, 'Quotation updated', data);
  } catch (err) { next(err); }
};

exports.withdraw = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .update({ status: 'withdrawn' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    return sendSuccess(res, 200, 'Quotation withdrawn', data);
  } catch (err) { next(err); }
};

exports.compare = async (req, res, next) => {
  try {
    const { rfqId } = req.params;

    const { data: quotations, error } = await supabase
      .from('quotations')
      .select(`*, vendors(company_name, vendor_code, gst_number), quotation_items(*)`)
      .eq('rfq_id', rfqId)
      .eq('status', 'submitted')
      .order('total_amount', { ascending: true });

    if (error) throw error;

    // Annotate with recommendation
    const annotated = quotations.map((q, idx) => ({
      ...q,
      is_cheapest: idx === 0,
      is_fastest: q.delivery_days === Math.min(...quotations.map(x => x.delivery_days)),
    }));

    return sendSuccess(res, 200, 'Quotation comparison', annotated);
  } catch (err) { next(err); }
};
