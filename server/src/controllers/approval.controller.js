const BaseRepository = require('../repositories/base.repository');
const { getPagination } = require('../utils/paginate');
const { sendSuccess } = require('../utils/response');

const approvalRepository = new BaseRepository('approvals');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, from, to } = getPagination(req.query);

    const { data, count, error } = await approvalRepository
      .query()
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Approvals fetched', data || [], {
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
    const { data, error } = await approvalRepository
      .query()
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Approval history fetched', data || []);
  } catch (error) {
    next(error);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { data, error } = await approvalRepository.query().select('*').eq('id', req.params.id).maybeSingle();

    if (error || !data) {
      return sendSuccess(res, 404, 'Approval not found');
    }

    return sendSuccess(res, 200, 'Approval fetched', data);
  } catch (error) {
    next(error);
  }
};

exports.decide = async (req, res, next) => {
  try {
    const { id, status, comments } = req.body;
    const { data, error } = await approvalRepository
      .query()
      .update({ status, comments, decided_by: req.user.id, decided_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Approval decision saved', data);
  } catch (error) {
    next(error);
  }
};