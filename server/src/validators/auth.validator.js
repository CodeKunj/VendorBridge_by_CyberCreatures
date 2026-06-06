const { body } = require('express-validator');
const { ROLE_VALUES } = require('../constants/roles');

const emailField = body('email')
  .trim()
  .isEmail()
  .withMessage('A valid email address is required')
  .normalizeEmail();

const passwordField = body('password')
  .trim()
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long');

const signupValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters long'),
  emailField,
  passwordField,
  body('role').optional().isString().isIn(ROLE_VALUES),
  body('deviceName').optional().trim().isString().isLength({ max: 120 }),
  body('rememberMe').optional().isBoolean(),
];

const loginValidation = [
  emailField,
  passwordField,
];

const refreshValidation = [
  body('refreshToken').trim().notEmpty().withMessage('Refresh token is required'),
];

const forgotPasswordValidation = [
  emailField,
];

const resetPasswordValidation = [
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  emailField,
  body('newPassword').trim().isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
];

const logoutValidation = [
  body('refreshToken').optional().trim().notEmpty().withMessage('Refresh token must not be empty'),
];

module.exports = {
  signupValidation,
  loginValidation,
  refreshValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  logoutValidation,
};