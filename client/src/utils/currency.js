/**
 * Shared currency formatting utility for VendorBridge.
 * All monetary values are displayed in Indian Rupees (INR).
 */

/**
 * Format a number as Indian Rupees.
 * e.g. formatCurrency(150000) => "₹1,50,000"
 *
 * @param {number|string} value - The amount to format
 * @param {boolean} [compact=false] - If true, use compact notation (₹1.5L)
 * @returns {string}
 */
export const formatCurrency = (value, compact = false) => {
  const num = parseFloat(value) || 0;

  if (compact) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(num);
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(num);
};

/**
 * Format as INR with no decimal places (for large whole amounts).
 * e.g. formatCurrencyWhole(150000) => "₹1,50,000"
 */
export const formatCurrencyWhole = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(parseFloat(value) || 0);
};

/**
 * Format axis tick values as compact INR for charts.
 * e.g. formatAxisINR(150000) => "₹1.5L"
 */
export const formatAxisINR = (value) => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value}`;
};
