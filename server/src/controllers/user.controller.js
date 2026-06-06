const BaseRepository = require('../repositories/base.repository');
const { getPagination } = require('../utils/paginate');
const { sendSuccess, sendError } = require('../utils/response');

const userRepository = new BaseRepository('users');

exports.list = async (req, res, next) => {
  try {
    const { page, limit, from, to } = getPagination(req.query);
    const { search, role, status } = req.query;

    let query = userRepository
      .query()
      .select('id, name, email, role, status, avatar_url, created_at, last_login_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (role) {
      query = query.eq('role', role);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Users fetched', data, {
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
    const { data, error } = await userRepository
      .query()
      .select('id, name, email, role, status, avatar_url, created_at, last_login_at')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error || !data) {
      return sendError(res, 404, 'User not found');
    }

    return sendSuccess(res, 200, 'User fetched', data);
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      status: req.body.status || 'active',
    };

    const { data, error } = await userRepository.query().insert(payload).select('id, name, email, role, status, created_at').single();

    if (error) {
      throw error;
    }

    return sendSuccess(res, 201, 'User created', data);
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { data, error } = await userRepository
      .query()
      .update(req.body)
      .eq('id', req.params.id)
      .select('id, name, email, role, status, avatar_url, created_at, last_login_at')
      .single();

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'User updated', data);
  } catch (error) {
    next(error);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { error } = await userRepository.query().delete().eq('id', req.params.id);

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'User deleted');
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { data, error } = await userRepository
      .query()
      .update(req.body)
      .eq('id', req.user.id)
      .select('id, name, email, role, status, avatar_url, created_at, last_login_at')
      .single();

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Profile updated', data);
  } catch (error) {
    next(error);
  }
};