import axios from 'axios';

// Connects to proxy or direct backend port 3000
export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token automatically from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('telewyz_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Simplify error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);
