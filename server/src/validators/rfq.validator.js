const { body, query } = require('express-validator');

const rfqStatusValues = ['draft', 'published', 'closed', 'awarded', 'cancelled'];

const itemValidation = body('items').custom((value) => {
  const items = typeof value === 'string' ? JSON.parse(value) : value;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one item is required');
  }

  for (const item of items) {
    // Accept both item_name (frontend) and product_name (legacy)
    const name = item.item_name || item.product_name;
    if (!name || String(name).trim().length < 2) {
      throw new Error('Each item requires a valid name (at least 2 characters)');
    }

    if (!item.quantity || Number(item.quantity) <= 0) {
      throw new Error('Each item requires a valid quantity greater than 0');
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

// Also accept camelCase vendorIds sent by the frontend
const vendorIdsCamelValidation = body('vendorIds').optional().custom((value) => {
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
  body('deadline').custom((value) => {
    if (!value || isNaN(Date.parse(value))) {
      throw new Error('Deadline must be a valid date');
    }
    return true;
  }),
  itemValidation,
  vendorIdsValidation,
  vendorIdsCamelValidation,
  body('status').optional().isIn(rfqStatusValues).withMessage('Invalid RFQ status'),
];

const updateRfqValidation = [
  body('title').trim().isLength({ min: 3 }).withMessage('Title is required'),
  body('description').optional().trim().isString(),
  body('deadline').custom((value) => {
    if (!value || isNaN(Date.parse(value))) {
      throw new Error('Deadline must be a valid date');
    }
    return true;
  }),
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
  vendorIdsCamelValidation,
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