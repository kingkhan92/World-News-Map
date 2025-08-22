import axios from 'axios';
import { SessionManager } from '../utils/sessionManager';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? '/api' 
    : 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = SessionManager.getToken();
    if (token && !SessionManager.isTokenExpired()) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      SessionManager.clearSession();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;