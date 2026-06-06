const { body, query } = require('express-validator');

const chatValidation = [
  body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be between 1 and 2000 characters'),
];

const historyValidation = [
  query('page').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional({ values: 'falsy' }).isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional({ values: 'falsy' }).trim().isString(),
];

module.exports = { chatValidation, historyValidation };
