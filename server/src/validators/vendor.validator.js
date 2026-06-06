const { body, query } = require('express-validator');
const { ROLE_VALUES } = require('../constants/roles');

const vendorStatusValues = ['active', 'inactive', 'pending_verification', 'suspended'];

const vendorBaseValidation = [
  body('company_name').trim().isLength({ min: 2 }).withMessage('Company name is required'),
  body('gst_number').trim().isLength({ min: 6 }).withMessage('GST number is required'),
  body('contact_person').trim().isLength({ min: 2 }).withMessage('Contact person is required'),
  body('email').trim().isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('phone').trim().isLength({ min: 7 }).withMessage('Phone number is required'),
  body('address').trim().isLength({ min: 5 }).withMessage('Address is required'),
  body('category').trim().isLength({ min: 2 }).withMessage('Category is required'),
  body('status').optional().isIn(vendorStatusValues).withMessage('Invalid vendor status'),
];

const createVendorValidation = [
  ...vendorBaseValidation,
];

const updateVendorValidation = [
  body('company_name').optional().trim().isLength({ min: 2 }).withMessage('Company name must be at least 2 characters'),
  body('gst_number').optional().trim().isLength({ min: 6 }).withMessage('GST number must be at least 6 characters'),
  body('contact_person').optional().trim().isLength({ min: 2 }).withMessage('Contact person must be at least 2 characters'),
  body('email').optional().trim().isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('phone').optional().trim().isLength({ min: 7 }).withMessage('Phone number must be at least 7 characters'),
  body('address').optional().trim().isLength({ min: 5 }).withMessage('Address must be at least 5 characters'),
  body('category').optional().trim().isLength({ min: 2 }).withMessage('Category must be at least 2 characters'),
  body('status').optional().isIn(vendorStatusValues).withMessage('Invalid vendor status'),
];

const listVendorValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isString(),
  query('status').optional().isIn(vendorStatusValues).withMessage('Invalid vendor status'),
  query('category').optional().trim().isString(),
];

module.exports = {
  vendorStatusValues,
  createVendorValidation,
  updateVendorValidation,
  listVendorValidation,
};