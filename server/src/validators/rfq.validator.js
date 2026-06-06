const { body, query } = require('express-validator');

const rfqStatusValues = ['draft', 'published', 'closed', 'awarded', 'cancelled'];

const itemValidation = body('items').custom((value) => {
  const items = typeof value === 'string' ? JSON.parse(value) : value;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one product is required');
  }

  for (const item of items) {
    if (!item.product_name || String(item.product_name).trim().length < 2) {
      throw new Error('Each product requires a valid product name');
    }

    if (!item.quantity || Number(item.quantity) <= 0) {
      throw new Error('Each product requires a valid quantity');
    }
  }

  return true;
});

const vendorIdsValidation = body('vendor_ids').optional().custom((value) => {
  if (!value) return true;
  const vendorIds = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(vendorIds)) {
    throw new Error('Vendor assignments must be an array');
  }
  return true;
});

const createRfqValidation = [
  body('title').trim().isLength({ min: 3 }).withMessage('Title is required'),
  body('description').optional().trim().isString(),
  body('deadline').isISO8601().withMessage('Deadline must be a valid date'),
  itemValidation,
  vendorIdsValidation,
  body('status').optional().isIn(rfqStatusValues).withMessage('Invalid RFQ status'),
];

const updateRfqValidation = [
  body('title').trim().isLength({ min: 3 }).withMessage('Title is required'),
  body('description').optional().trim().isString(),
  body('deadline').isISO8601().withMessage('Deadline must be a valid date'),
  body('status').optional().isIn(rfqStatusValues).withMessage('Invalid RFQ status'),
  body('items').optional().custom((value) => {
    if (!value) return true;
    const items = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(items)) {
      throw new Error('Items must be an array');
    }
    return true;
  }),
  vendorIdsValidation,
];

const listRfqValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().trim().isString(),
  query('status').optional().isIn(rfqStatusValues).withMessage('Invalid RFQ status'),
];

module.exports = {
  rfqStatusValues,
  createRfqValidation,
  updateRfqValidation,
  listRfqValidation,
};