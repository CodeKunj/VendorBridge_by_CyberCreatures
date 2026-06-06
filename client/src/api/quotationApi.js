import { request } from './httpClient';

export const quotationApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/quotations${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getById: (id) => request(`/quotations/${id}`, { method: 'GET' }),
  create: (formData) => request('/quotations', { method: 'POST', body: formData, headers: {} }),
  update: (id, formData) => request(`/quotations/${id}`, { method: 'PUT', body: formData, headers: {} }),
  withdraw: (id) => request(`/quotations/${id}/withdraw`, { method: 'POST' }),
  compare: (rfqId) => request(`/quotations/compare/${rfqId}`, { method: 'GET' }),
};