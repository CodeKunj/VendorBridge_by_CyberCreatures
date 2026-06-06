const supabase = require('../config/db');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { getPagination } = require('../utils/paginate');
const { generateRFQNumber } = require('../utils/generateCode');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, from, to } = getPagination(req.query);
    const { status, search } = req.query;
    const user = req.user;

    let query = supabase
      .from('rfqs')
      .select(`*, users!rfqs_created_by_fkey(name, email), rfq_items(*), rfq_vendor_assignments(vendor_id, vendors(company_name))`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status) query = query.eq('status', status);
    if (search) query = query.or(`title.ilike.%${search}%,rfq_number.ilike.%${search}%`);

    // Vendors only see RFQs assigned to them
    if (user.role === 'vendor') {
      const { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', user.id).single();
      if (vendor) {
        const { data: assignments } = await supabase.from('rfq_vendor_assignments').select('rfq_id').eq('vendor_id', vendor.id);
        const rfqIds = assignments?.map(a => a.rfq_id) || [];
        if (rfqIds.length === 0) return sendPaginated(res, [], 0, page, limit);
        query = query.in('id', rfqIds);
      }
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return sendPaginated(res, data, count, page, limit);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rfqs')
      .select(`*, users!rfqs_created_by_fkey(name, email), rfq_items(*), rfq_attachments(*), rfq_vendor_assignments(vendor_id, vendors(*))`)
      .eq('id', req.params.id)
      .single();

    if (error || !data) return sendError(res, 404, 'RFQ not found');
    return sendSuccess(res, 200, 'RFQ fetched', data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { title, description, deadline, items = [], vendor_ids = [] } = req.body;

    const rfq_number = await generateRFQNumber();

    const { data: rfq, error } = await supabase
      .from('rfqs')
      .insert({ rfq_number, title, description, deadline, status: 'draft', created_by: req.user.id })
      .select()
      .single();

    if (error) throw error;

    // Insert items
    if (items.length > 0) {
      await supabase.from('rfq_items').insert(items.map(item => ({ ...item, rfq_id: rfq.id })));
    }

    // Assign vendors
    if (vendor_ids.length > 0) {
      await supabase.from('rfq_vendor_assignments').insert(vendor_ids.map(vid => ({ rfq_id: rfq.id, vendor_id: vid })));
    }

    return sendSuccess(res, 201, 'RFQ created', rfq);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { title, description, deadline, items, vendor_ids } = req.body;

    const { data: rfq, error } = await supabase
      .from('rfqs')
      .update({ title, description, deadline })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // Replace items
    if (items) {
      await supabase.from('rfq_items').delete().eq('rfq_id', rfq.id);
      await supabase.from('rfq_items').insert(items.map(item => ({ ...item, rfq_id: rfq.id })));
    }

    // Replace vendor assignments
    if (vendor_ids) {
      await supabase.from('rfq_vendor_assignments').delete().eq('rfq_id', rfq.id);
      if (vendor_ids.length > 0) {
        await supabase.from('rfq_vendor_assignments').insert(vendor_ids.map(vid => ({ rfq_id: rfq.id, vendor_id: vid })));
      }
    }

    return sendSuccess(res, 200, 'RFQ updated', rfq);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const { error } = await supabase.from('rfqs').delete().eq('id', req.params.id);
    if (error) throw error;
    return sendSuccess(res, 200, 'RFQ deleted');
  } catch (err) { next(err); }
};

exports.publish = async (req, res, next) => {
  try {
    const { data: rfq, error } = await supabase
      .from('rfqs')
      .update({ status: 'published' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // Notify assigned vendors
    const { data: assignments } = await supabase
      .from('rfq_vendor_assignments')
      .select('vendor_id, vendors(user_id, company_name)')
      .eq('rfq_id', rfq.id);

    if (assignments) {
      const notifications = assignments
        .filter(a => a.vendors?.user_id)
        .map(a => ({
          user_id: a.vendors.user_id,
          title: 'New RFQ Assigned',
          message: `You have been assigned RFQ: ${rfq.rfq_number} - ${rfq.title}`,
          type: 'rfq',
          entity_id: rfq.id,
          entity_type: 'rfq',
        }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }
    }

    // Create approval request
    await supabase.from('approvals').insert({
      rfq_id: rfq.id,
      approver_id: req.user.id, // Will be assigned properly in full workflow
      status: 'pending',
      level: 1,
    });

    return sendSuccess(res, 200, 'RFQ published and vendors notified', rfq);
  } catch (err) { next(err); }
};

exports.close = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rfqs')
      .update({ status: 'closed' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    return sendSuccess(res, 200, 'RFQ closed', data);
  } catch (err) { next(err); }
};
