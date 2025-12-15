/**
 * Configured Axios Instance with Interceptors
 * Automatically handles token injection, refresh, and error handling
 */

import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE = 'http://localhost:8000/api';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Store reference to auth functions (will be set by AuthProvider)
let authFunctions = {
  getAccessToken: null,
  handleAuthError: null,
};

export const setAuthFunctions = (getAccessToken, handleAuthError) => {
  authFunctions.getAccessToken = getAccessToken;
  authFunctions.handleAuthError = handleAuthError;
};

// Request interceptor: Add token to all requests
axiosInstance.interceptors.request.use(
  async (config) => {
    // Skip token for public endpoints
    if (config.url === '/' || config.url === '/health') {
      return config;
    }

    try {
      if (authFunctions.getAccessToken) {
        const token = await authFunctions.getAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to get access token:', error);
      // Let the request proceed without token, will be caught by response interceptor
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle errors globally
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Prevent infinite retry loop
      if (originalRequest._retry) {
        if (authFunctions.handleAuthError) {
          authFunctions.handleAuthError();
        }
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // Try to refresh token
        if (authFunctions.getAccessToken) {
          const token = await authFunctions.getAccessToken(true); // Force refresh
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        if (authFunctions.handleAuthError) {
          authFunctions.handleAuthError();
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.', {
        position: 'top-right',
        autoClose: 5000,
      });
      return Promise.reject(error);
    }

    // Handle other errors
    const status = error.response?.status;
    const message = error.response?.data?.detail || error.message;

    switch (status) {
      case 403:
        toast.error('Access denied. You do not have permission.', {
          position: 'top-right',
          autoClose: 5000,
        });
        break;
      case 404:
        toast.error('Resource not found.', {
          position: 'top-right',
          autoClose: 3000,
        });
        break;
      case 500:
      case 502:
      case 503:
        toast.error('Server error. Please try again later.', {
          position: 'top-right',
          autoClose: 5000,
        });
        break;
      default:
        toast.error(`Error: ${message}`, {
          position: 'top-right',
          autoClose: 5000,
        });
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
