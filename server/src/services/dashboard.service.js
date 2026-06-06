const dashboardRepository = require('../repositories/dashboard.repository');
const logger = require('../config/logger');

const monthKey = (date) => {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value.toLocaleString('en-US', { month: 'short' });
};

const startOfMonthOffset = (monthsAgo) => {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  date.setMonth(date.getMonth() - monthsAgo);
  return date;
};

const safeNumber = (value) => Number(value || 0);

class DashboardService {
  async safeCall(label, fallback, fn) {
    try {
      return await fn();
    } catch (error) {
      logger.warn(`Dashboard data source unavailable: ${label}`, { message: error.message });
      return fallback;
    }
  }

  async getOverview() {
    const [vendors, activeRfqs, pendingApprovals, purchaseOrders, invoices] = await Promise.all([
      this.safeCall('vendors count', 0, () => dashboardRepository.countRows('vendors')),
      this.safeCall('active rfqs count', 0, () => dashboardRepository.countRows('rfqs', [{ field: 'status', value: 'active' }])),
      this.safeCall('pending approvals count', 0, () => dashboardRepository.countRows('approvals', [{ field: 'status', value: 'pending' }])),
      this.safeCall('purchase orders count', 0, () => dashboardRepository.countRows('purchase_orders')),
      this.safeCall('invoices count', 0, () => dashboardRepository.countRows('invoices')),
    ]);

    return { vendors, activeRfqs, pendingApprovals, purchaseOrders, invoices };
  }

  async getMonthlyProcurementTrend() {
    const since = startOfMonthOffset(5).toISOString();
    const purchaseOrders = await this.safeCall('monthly purchase orders', [], () => dashboardRepository.fetchRows('purchase_orders', 'created_at, status', [
      { field: 'created_at', method: 'gte', value: since },
    ]));

    const invoices = await this.safeCall('monthly invoices', [], () => dashboardRepository.fetchRows('invoices', 'created_at, status', [
      { field: 'created_at', method: 'gte', value: since },
    ]));

    const months = Array.from({ length: 6 }, (_, index) => monthKey(startOfMonthOffset(5 - index)));

    return months.map((month) => ({
      month,
      purchaseOrders: purchaseOrders.filter((item) => monthKey(item.created_at) === month).length,
      invoices: invoices.filter((item) => monthKey(item.created_at) === month).length,
    }));
  }

  async getVendorPerformance() {
    const vendors = await this.safeCall('vendor performance', [], () => dashboardRepository.fetchRows('vendors', 'name, status, rating, created_at', [], 'created_at', false, 12));

    if (vendors.length === 0) {
      return [];
    }

    return vendors.map((vendor, index) => ({
      name: vendor.name || `Vendor ${index + 1}`,
      score: safeNumber(vendor.rating) || (vendor.status === 'active' ? 92 : 68),
    }));
  }

  async getSpendingSummary() {
    const invoices = await this.safeCall('spending summary', [], () => dashboardRepository.fetchRows('invoices', 'total_amount, grand_total, amount, net_amount, created_at', [], 'created_at', false, 50));

    const months = Array.from({ length: 6 }, (_, index) => monthKey(startOfMonthOffset(5 - index)));

    return months.map((month) => {
      const monthInvoices = invoices.filter((invoice) => monthKey(invoice.created_at) === month);

      const amount = monthInvoices.reduce((sum, invoice) => (
        sum
        + safeNumber(invoice.grand_total)
        + safeNumber(invoice.total_amount)
        + safeNumber(invoice.amount)
        + safeNumber(invoice.net_amount)
      ), 0);

      return {
        month,
        spent: amount,
      };
    });
  }

  async getRecentActivities() {
    const activities = await this.safeCall('recent activities', [], () => dashboardRepository.fetchRows('activity_logs', 'id, action, module, metadata, created_at', [], 'created_at', false, 8));

    return activities.map((activity) => ({
      id: activity.id,
      title: activity.action?.replaceAll('_', ' ') || 'Activity',
      message: `${activity.module || 'System'} activity logged`,
      time: activity.created_at,
    }));
  }

  async getNotifications() {
    const notifications = await this.safeCall('notifications', [], () => dashboardRepository.fetchRows('notifications', 'id, title, message, type, created_at', [], 'created_at', false, 6));

    return notifications.map((notification) => ({
      id: notification.id,
      title: notification.title || 'Notification',
      message: notification.message || 'System update',
      category: notification.type || 'System',
      time: notification.created_at,
    }));
  }

  getQuickActions() {
    return [
      { id: 'new-rfq', label: 'Create RFQ', href: '/rfqs' },
      { id: 'new-po', label: 'Create Purchase Order', href: '/purchase-orders' },
      { id: 'new-invoice', label: 'Create Invoice', href: '/invoices' },
      { id: 'new-vendor', label: 'Add Vendor', href: '/vendors' },
    ];
  }

  async getDashboardData() {
    const [overview, monthlyTrend, vendorPerformance, spendingSummary, recentActivities, notifications] = await Promise.all([
      this.getOverview(),
      this.getMonthlyProcurementTrend(),
      this.getVendorPerformance(),
      this.getSpendingSummary(),
      this.getRecentActivities(),
      this.getNotifications(),
    ]);

    return {
      overview,
      charts: {
        monthlyTrend,
        vendorPerformance,
        spendingSummary,
      },
      sections: {
        recentActivities,
        quickActions: this.getQuickActions(),
        notifications,
      },
    };
  }
}

module.exports = new DashboardService();