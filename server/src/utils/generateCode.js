const supabase = require('../config/db');

/**
 * Generate auto-incrementing code with prefix
 * Examples: RFQ-2024-0001, PO-2024-0001, INV-2024-0001
 */
const generateCode = async (prefix, table, column) => {
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${year}-`;

  const { data, error } = await supabase
    .from(table)
    .select(column)
    .ilike(column, `${fullPrefix}%`)
    .order(column, { ascending: false })
    .limit(1);

  if (error) throw error;

  let nextNum = 1;
  if (data && data.length > 0) {
    const lastCode = data[0][column];
    const lastNum = parseInt(lastCode.split('-').pop(), 10);
    nextNum = lastNum + 1;
  }

  return `${fullPrefix}${String(nextNum).padStart(4, '0')}`;
};

const generateRFQNumber   = () => generateCode('RFQ', 'rfqs', 'rfq_number');
const generatePONumber    = () => generateCode('PO', 'purchase_orders', 'po_number');
const generateINVNumber   = () => generateCode('INV', 'invoices', 'invoice_number');

module.exports = { generateRFQNumber, generatePONumber, generateINVNumber };
