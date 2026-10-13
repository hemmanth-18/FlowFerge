import axiosInstance from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== ''
    ? import.meta.env.VITE_API_URL
    : (import.meta.env.PROD ? '' : 'http://localhost:5000');


export const api = axiosInstance.create({
  baseURL: `${API_BASE_URL}/api`,
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
