const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

const getAccessToken = () => localStorage.getItem('vendorbridge.accessToken');

const request = async (path, options = {}) => {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = isFormData
    ? { ...(options.headers || {}) }
    : {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      };

  const token = getAccessToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export { API_BASE_URL, request, getAccessToken };