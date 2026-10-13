import axiosInstance from 'axios';

// Get API base URL with graceful fallback to production Render backend
const getBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envUrl) {
    const stripped = envUrl.replace(/\/+$/, '');
    return stripped.endsWith('/api') ? stripped : `${stripped}/api`;
  }
  if (import.meta.env.PROD) {
    return 'https://flowferge-backend.onrender.com/api';
  }
  return 'http://localhost:5000/api';
};

export const api = axiosInstance.create({
  baseURL: getBaseUrl(),
  withCredentials: true, // Send HTTP-only session cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to inject Authorization header & active Team ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('flowforge_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const activeTeamId = localStorage.getItem('flowforge_active_team_id');
    if (activeTeamId) {
      config.headers['x-team-id'] = activeTeamId;
    }

    // When sending FormData, remove Content-Type so Axios/browser computes multipart boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      if (typeof config.headers?.delete === 'function') {
        config.headers.delete('Content-Type');
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error formatting
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);
