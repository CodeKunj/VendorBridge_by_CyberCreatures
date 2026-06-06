const supabase = require('../config/db');
const { sendSuccess } = require('../utils/response');

const countRows = async (table, filters = []) => {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });

  filters.forEach(([method, field, value]) => {
    query = query[method](field, value);
  });

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count || 0;
};

exports.dashboard = async (req, res, next) => {
  try {
    const [vendors, rfqs, quotations, purchaseOrders, invoices, notifications] = await Promise.all([
      countRows('vendors'),
      countRows('rfqs'),
      countRows('quotations'),
      countRows('purchase_orders'),
      countRows('invoices'),
      countRows('notifications'),
    ]);

    return sendSuccess(res, 200, 'Dashboard report fetched', {
      vendors,
      rfqs,
      quotations,
      purchaseOrders,
      invoices,
      notifications,
    });
  } catch (error) {
    next(error);
  }
};

exports.spending = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('purchase_orders').select('id, total_amount, status, created_at').order('created_at', { ascending: false }).limit(100);

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Spending report fetched', data || []);
  } catch (error) {
    next(error);
  }
};

exports.vendorPerformance = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('vendors').select('id, company_name, vendor_code, status, created_at').order('created_at', { ascending: false }).limit(100);

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'Vendor performance report fetched', data || []);
  } catch (error) {
    next(error);
  }
};

exports.rfqStatistics = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('rfqs').select('id, rfq_number, title, status, created_at').order('created_at', { ascending: false }).limit(100);

    if (error) {
      throw error;
    }

    return sendSuccess(res, 200, 'RFQ statistics fetched', data || []);
  } catch (error) {
    next(error);
  }
};

exports.exportSpending = async (req, res) => {
  return sendSuccess(res, 200, 'Export endpoint is ready to integrate', { format: 'csv' });
};