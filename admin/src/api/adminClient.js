import axios from 'axios';
import { clearAdminToken, getAdminToken } from '../utils/adminSession';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const adminClient = axios.create({ baseURL });

adminClient.interceptors.request.use((config) => {
  const t = getAdminToken();
  if (t) {
    config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

adminClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      const path = window.location.pathname || '';
      const onPublicAuthPage =
        path === '/login' ||
        path.endsWith('/login') ||
        path === '/forgot-password' ||
        path.endsWith('/forgot-password');
      if (!onPublicAuthPage) {
        clearAdminToken();
        window.location.replace('/login');
      }
    }
    return Promise.reject(err);
  },
);

export default adminClient;
