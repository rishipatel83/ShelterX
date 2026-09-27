import axios from 'axios';

const resolveBaseUrl = (): string => {
  const rawUrl = (import.meta as any).env?.VITE_API_URL?.trim();
  if (!rawUrl) {
    return 'http://localhost:5000/api/v1';
  }
  const cleanUrl = rawUrl.replace(/\/+$/, '');
  if (cleanUrl.endsWith('/api/v1')) {
    return cleanUrl;
  }
  return `${cleanUrl}/api/v1`;
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
