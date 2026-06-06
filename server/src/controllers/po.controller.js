const BaseRepository = require('../repositories/base.repository');
const { getPagination } = require('../utils/paginate');
const { sendSuccess, sendError } = require('../utils/response');

const poRepository = new BaseRepository('purchase_orders');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, from, to } = getPagination(req.query);

    const { data, count, error } = await poRepository
      .query()
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Purchase orders fetched', data || [], {
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
    const { data, error } = await poRepository.query().select('*').eq('id', req.params.id).maybeSingle();

    if (error || !data) {
      return sendError(res, 404, 'Purchase order not found');
    }

    return sendSuccess(res, 200, 'Purchase order fetched', data);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { data, error } = await poRepository.query().insert(req.body).select('*').single();

    if (error) {
      throw error;
    }

    return sendSuccess(res, 201, 'Purchase order created', data);
  } catch (error) {
    next(error);
  }
};

exports.downloadPdf = async (req, res) => {
  return sendSuccess(res, 200, 'PDF generation is not configured yet', { id: req.params.id });
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { data, error } = await poRepository
      .query()
      .update({ status })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Purchase order status updated', data);
  } catch (error) {
    next(error);
  }
};