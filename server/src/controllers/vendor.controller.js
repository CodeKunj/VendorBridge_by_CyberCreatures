const supabase = require('../config/db');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { getPagination } = require('../utils/paginate');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, from, to } = getPagination(req.query);
    const { search, status, category } = req.query;

    let query = supabase
      .from('vendors')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status)   query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,vendor_code.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return sendPaginated(res, data, count, page, limit);
  } catch (err) { next(err); }
};

exports.getById = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return sendError(res, 404, 'Vendor not found');
    return sendSuccess(res, 200, 'Vendor fetched', data);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { company_name, category, gst_number, contact_person, phone, email, address, status } = req.body;

    // Auto-generate vendor code
    const { count } = await supabase.from('vendors').select('*', { count: 'exact', head: true });
    const vendorCode = `VND-${String((count || 0) + 1).padStart(4, '0')}`;

    const { data, error } = await supabase
      .from('vendors')
      .insert({ vendor_code: vendorCode, company_name, category, gst_number, contact_person, phone, email, address, status: status || 'pending_verification' })
      .select()
      .single();

    if (error) throw error;
    return sendSuccess(res, 201, 'Vendor created', data);
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { company_name, category, gst_number, contact_person, phone, email, address, status } = req.body;

    const { data, error } = await supabase
      .from('vendors')
      .update({ company_name, category, gst_number, contact_person, phone, email, address, status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    return sendSuccess(res, 200, 'Vendor updated', data);
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const { error } = await supabase.from('vendors').delete().eq('id', req.params.id);
    if (error) throw error;
    return sendSuccess(res, 200, 'Vendor deleted');
  } catch (err) { next(err); }
};
