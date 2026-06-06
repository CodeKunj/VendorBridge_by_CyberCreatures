/**
 * Indian Rupee formatting for server-side PDFs and emails.
 * Uses "Rs." prefix because PDFKit's default Helvetica font does not render ₹ reliably.
 */

const formatINR = (value, { decimals = 2 } = {}) => {
  const num = parseFloat(value) || 0;
  const amount = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
  return `Rs. ${amount}`;
};

module.exports = { formatINR };
