const { body, query } = require('express-validator');

const quotationStatusValues = ['draft', 'submitted', 'withdrawn', 'accepted', 'rejected'];

const itemValidation = body('items').custom((value) => {
  const items = typeof value === 'string' ? JSON.parse(value) : value;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one quotation item is required');
  }

  for (const item of items) {
    if (!item.product_name || String(item.product_name).trim().length < 2) {
      throw new Error('Each item requires a valid product name');
    }

    if (!item.quantity || Number(item.quantity) <= 0) {
      throw new Error('Each item requires a valid quantity');
    }

    if (!item.unit_price || Number(item.unit_price) < 0) {
      throw new Error('Each item requires a valid unit price');
    }
  }

  return true;
});

const createQuotationValidation = [
  body('rfq_id').isUUID().withMessage('Valid RFQ is required'),
  body('total_amount').optional().isNumeric().withMessage('Total amount must be numeric'),
  body('delivery_days').optional().isInt({ min: 1 }).withMessage('Delivery time must be a positive integer'),
  body('notes').optional().trim().isString(),
  itemValidation,
];

const updateQuotationValidation = [
  body('total_amount').optional().isNumeric().withMessage('Total amount must be numeric'),
  body('delivery_days').optional().isInt({ min: 1 }).withMessage('Delivery time must be a positive integer'),
  body('notes').optional().trim().isString(),
  body('items').optional().custom((value) => {
    if (!value) return true;
    const items = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(items)) {
      throw new Error('Items must be an array');
    }
    return true;
  }),
];

const quotationListValidation = [
  query('rfq_id').optional().isUUID().withMessage('Invalid RFQ id'),
  query('status').optional().isIn(quotationStatusValues).withMessage('Invalid quotation status'),
];

module.exports = {
  quotationStatusValues,
  createQuotationValidation,
  updateQuotationValidation,
  quotationListValidation,
};