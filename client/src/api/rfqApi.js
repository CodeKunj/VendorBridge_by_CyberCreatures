import { request } from './httpClient';

export const rfqApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/rfqs${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getById: (id) => request(`/rfqs/${id}`, { method: 'GET' }),
  create: (formData) => request('/rfqs', { method: 'POST', body: formData, headers: {} }),
  update: (id, formData) => request(`/rfqs/${id}`, { method: 'PUT', body: formData, headers: {} }),
  remove: (id) => request(`/rfqs/${id}`, { method: 'DELETE' }),
  publish: (id) => request(`/rfqs/${id}/publish`, { method: 'POST' }),
  close: (id) => request(`/rfqs/${id}/close`, { method: 'POST' }),
};