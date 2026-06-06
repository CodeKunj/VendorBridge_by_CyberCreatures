import { request } from './httpClient';

export const vendorApi = {
  list: (params = {}) => {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
    );
    const query = new URLSearchParams(filteredParams).toString();
    return request(`/vendors${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getById: (id) => request(`/vendors/${id}`, { method: 'GET' }),
  create: (body) => request('/vendors', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/vendors/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => request(`/vendors/${id}`, { method: 'DELETE' }),
};