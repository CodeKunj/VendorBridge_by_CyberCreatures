const BaseRepository = require('../repositories/base.repository');
const { getPagination } = require('../utils/paginate');
const { sendSuccess } = require('../utils/response');

const activityLogRepository = new BaseRepository('activity_logs');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, from, to } = getPagination(req.query);

    const { data, count, error } = await activityLogRepository
      .query()
      .select('*, users(name, email, role)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Activity logs fetched', data || [], {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    next(error);
  }
};