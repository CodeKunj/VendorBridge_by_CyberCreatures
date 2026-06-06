const { sendError } = require('../utils/response');
const AppError = require('../errors/AppError');
const logger = require('../config/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.path} failed`, {
    name: err.name,
    statusCode: err.statusCode,
    message: err.message,
  });

  if (err instanceof AppError || err.isOperational) {
    return sendError(res, err.statusCode || 500, err.message, err.details || null);
  }

  if (err.name === 'ValidationError') {
    return sendError(res, 400, err.message);
  }

  if (err.name === 'UnauthorizedError') {
    return sendError(res, 401, 'Unauthorized');
  }

  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'Invalid token');
  }

  if (err.code && err.code.startsWith('PGRST')) {
    return sendError(res, 400, err.message);
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';

  return sendError(res, statusCode, message);
};

module.exports = errorHandler;
