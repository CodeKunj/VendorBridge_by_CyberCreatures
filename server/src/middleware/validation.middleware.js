const { validationResult } = require('express-validator');
const AppError = require('../errors/AppError');

const validateRequest = (req, res, next) => {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  return next(new AppError('Validation failed', 422, result.array().map((item) => ({
    field: item.path,
    message: item.msg,
  }))));
};

module.exports = { validateRequest };