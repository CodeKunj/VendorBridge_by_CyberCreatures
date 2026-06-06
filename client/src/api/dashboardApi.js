import { request } from './httpClient';

export const dashboardApi = {
  getDashboard: () => request('/dashboard', { method: 'GET' }),
};