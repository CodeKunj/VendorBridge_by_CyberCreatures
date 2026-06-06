const BaseRepository = require('../repositories/base.repository');
const { getPagination } = require('../utils/paginate');
const { sendSuccess } = require('../utils/response');

const notificationRepository = new BaseRepository('notifications');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, from, to } = getPagination(req.query);

    let query = notificationRepository
      .query()
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (req.user?.role !== 'admin') {
      query = query.eq('user_id', req.user.id);
    }

    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Notifications fetched', data || [], {
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    next(error);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    const { data, error } = await notificationRepository
      .query()
      .update({ read_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Notification marked as read', data);
  } catch (error) {
    next(error);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const { error } = await notificationRepository
      .query()
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', req.user.id);

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { error } = await notificationRepository.query().delete().eq('id', req.params.id);

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Notification deleted');
  } catch (error) {
    next(error);
  }
};