const authService = require('../services/auth.service');
const { sendSuccess, sendError } = require('../utils/response');

exports.login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body, req);
    return sendSuccess(res, 200, 'Login successful', result);
  } catch (err) {
    next(err);
  }
};

exports.signup = async (req, res, next) => {
  try {
    const result = await authService.signup(req.body, req);
    return sendSuccess(res, 201, 'Account created successfully', result);
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const tokens = await authService.refresh(req.body.refreshToken);
    return sendSuccess(res, 200, 'Token refreshed', tokens);
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res) => {
  const result = await authService.logout(req.user, req.session);
  return sendSuccess(res, 200, result.message);
};

exports.me = async (req, res, next) => {
  try {
    const user = await authService.me(req.user.id);
    return sendSuccess(res, 200, 'User fetched', user);
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    return sendSuccess(res, 200, result.message);
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body);
    return sendSuccess(res, 200, result.message);
  } catch (err) {
    next(err);
  }
};
