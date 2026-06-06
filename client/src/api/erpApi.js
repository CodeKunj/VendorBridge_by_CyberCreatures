import { request, API_BASE_URL } from './httpClient';

export const erpApi = {
  // Users
  users: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/users?${q}`, { method: 'GET' });
    },
    getById: (id) => request(`/users/${id}`, { method: 'GET' }),
    create: (body) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
    updateProfile: (body) => request('/users/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  },

  // Vendors
  vendors: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/vendors?${q}`, { method: 'GET' });
    },
    getById: (id) => request(`/vendors/${id}`, { method: 'GET' }),
    create: (body) => request('/vendors', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => request(`/vendors/${id}`, { method: 'DELETE' }),
  },

  // RFQs
  rfqs: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/rfqs?${q}`, { method: 'GET' });
    },
    getById: (id) => request(`/rfqs/${id}`, { method: 'GET' }),
    create: (body) => request('/rfqs', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/rfqs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => request(`/rfqs/${id}`, { method: 'DELETE' }),
    publish: (id) => request(`/rfqs/${id}/publish`, { method: 'POST' }),
    close: (id) => request(`/rfqs/${id}/close`, { method: 'POST' }),
  },

  // Quotations
  quotations: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/quotations?${q}`, { method: 'GET' });
    },
    getById: (id) => request(`/quotations/${id}`, { method: 'GET' }),
    create: (body) => request('/quotations', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/quotations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    withdraw: (id) => request(`/quotations/${id}/withdraw`, { method: 'POST' }),
    compare: (rfqId) => request(`/quotations/compare/${rfqId}`, { method: 'GET' }),
  },

  // Approvals
  approvals: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/approvals?${q}`, { method: 'GET' });
    },
    history: () => request('/approvals/history', { method: 'GET' }),
    getById: (id) => request(`/approvals/${id}`, { method: 'GET' }),
    decide: (body) => request('/approvals', { method: 'POST', body: JSON.stringify(body) }),
  },

  // Purchase Orders
  purchaseOrders: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/purchase-orders?${q}`, { method: 'GET' });
    },
    getById: (id) => request(`/purchase-orders/${id}`, { method: 'GET' }),
    create: (body) => request('/purchase-orders', { method: 'POST', body: JSON.stringify(body) }),
    updateStatus: (id, status) => request(`/purchase-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    downloadPdfUrl: (id) => `${API_BASE_URL}/purchase-orders/${id}/pdf`,
  },

  // Invoices
  invoices: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/invoices?${q}`, { method: 'GET' });
    },
    getById: (id) => request(`/invoices/${id}`, { method: 'GET' }),
    create: (body) => request('/invoices', { method: 'POST', body: JSON.stringify(body) }),
    updateStatus: (id, status) => request(`/invoices/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    sendEmail: (id) => request(`/invoices/${id}/send-email`, { method: 'POST' }),
    downloadPdfUrl: (id) => `${API_BASE_URL}/invoices/${id}/pdf`,
  },

  // Reports
  reports: {
    dashboard: () => request('/reports/dashboard', { method: 'GET' }),
    spending: () => request('/reports/spending', { method: 'GET' }),
    vendorPerformance: () => request('/reports/vendor-performance', { method: 'GET' }),
    rfqStatistics: () => request('/reports/rfq-statistics', { method: 'GET' }),
  },

  // Settings
  settings: {
    getAll: () => request('/settings', { method: 'GET' }),
    getByCategory: (category) => request(`/settings/${category}`, { method: 'GET' }),
    update: (body) => request('/settings', { method: 'PUT', body: JSON.stringify(body) }),
    testEmail: (body) => request('/settings/test-email', { method: 'POST', body: JSON.stringify(body) }),
    auditLogs: () => request('/settings/audit-logs', { method: 'GET' }),
  },

  // Notifications
  notifications: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/notifications?${q}`, { method: 'GET' });
    },
    markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request('/notifications/mark-all-read', { method: 'PATCH' }),
    delete: (id) => request(`/notifications/${id}`, { method: 'DELETE' }),
  },

  // AI Assistant
  ai: {
    chat: (message) => request('/ai/chat', { method: 'POST', body: JSON.stringify({ message }) }),
    history: (params = {}) => {
      const filteredParams = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '' && v != null),
      );
      const q = new URLSearchParams(filteredParams).toString();
      return request(`/ai/history${q ? `?${q}` : ''}`, { method: 'GET' });
    },
    status: () => request('/ai/status', { method: 'GET' }),
  },

  // Activity Logs
  activityLogs: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/activity-logs?${q}`, { method: 'GET' });
    },
  },
};
