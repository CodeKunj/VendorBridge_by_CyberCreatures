import { request } from './httpClient';

export const aiApi = {
  chat: (message) => request('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),
  history: (params = {}) => {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
    );
    const query = new URLSearchParams(filteredParams).toString();
    return request(`/ai/history${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  status: () => request('/ai/status', { method: 'GET' }),
};
