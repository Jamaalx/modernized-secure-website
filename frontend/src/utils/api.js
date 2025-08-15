// frontend/src/utils/api.js
import axios from 'axios';
import { toast } from 'react-hot-toast';

// Create axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = new Date() - response.config.metadata.startTime;
    
    // Log slow requests in development
    if (import.meta.env.DEV && duration > 2000) {
      console.warn(`Slow API request: ${response.config.url} took ${duration}ms`);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post('/api/auth/refresh', { refreshToken });
          const { token } = response.data.data;

          // Update stored token
          localStorage.setItem('token', token);
          
          // Update default header
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Retry original request
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        delete api.defaults.headers.common['Authorization'];
        
        // Only redirect if not already on auth pages
        if (!window.location.pathname.includes('/auth')) {
          window.location.href = '/auth/login';
        }
      }
    }

    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          // Bad request - usually validation errors
          if (data.errors && Array.isArray(data.errors)) {
            data.errors.forEach(err => toast.error(err.msg || err.message));
          } else {
            toast.error(data.message || 'Invalid request');
          }
          break;
          
        case 403:
          toast.error('Access denied. You don\'t have permission for this action.');
          break;
          
        case 404:
          toast.error('Resource not found');
          break;
          
        case 409:
          toast.error(data.message || 'Conflict occurred');
          break;
          
        case 423:
          toast.error('Account is temporarily locked');
          break;
          
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
          
        case 500:
          toast.error('Server error. Please try again later.');
          break;
          
        default:
          toast.error(data.message || 'An unexpected error occurred');
      }
    } else if (error.request) {
      // Network error
      toast.error('Network error. Please check your connection.');
    } else {
      // Other error
      toast.error('An unexpected error occurred');
    }

    return Promise.reject(error);
  }
);

// API endpoint helpers
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
};

export const documentsAPI = {
  getAll: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  view: (id) => api.get(`/documents/${id}/view`, { responseType: 'blob' }),
  grantPermission: (id, userData) => api.post(`/documents/${id}/permissions`, userData),
  revokePermission: (id, userId) => api.delete(`/documents/${id}/permissions/${userId}`),
  delete: (id) => api.delete(`/documents/${id}`),
  getAccessLog: (id, params) => api.get(`/documents/${id}/access-log`, { params }),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  
  // User management
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (userData) => api.post('/admin/users', userData),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  
  // Document upload
  uploadDocument: (formData) => api.post('/admin/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // 60 seconds for file uploads
  }),
  
  // Invitations
  getInvitations: () => api.get('/admin/invitations'),
  approveInvitation: (id) => api.put(`/admin/invitations/${id}/approve`),
  rejectInvitation: (id) => api.put(`/admin/invitations/${id}/reject`),
  
  // Logs and monitoring
  getActivityLogs: (params) => api.get('/admin/activity-logs', { params }),
  getSecurityEvents: (params) => api.get('/admin/security-events', { params }),
};

export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (profileData) => api.put('/users/profile', profileData),
  changePassword: (passwordData) => api.post('/users/change-password', passwordData),
  
  // Invitations (for moderators)
  sendInvitation: (email) => api.post('/users/invite', { email }),
  getInvitations: () => api.get('/users/invitations'),
  
  // Activity
  getActivity: (params) => api.get('/users/activity', { params }),
  getDocumentHistory: (params) => api.get('/users/document-history', { params }),
  
  // Sessions
  getSessions: () => api.get('/users/sessions'),
  terminateSession: (sessionId) => api.delete(`/users/sessions/${sessionId}`),
  
  // Stats
  getStats: () => api.get('/users/stats'),
  
  // Notifications
  getNotifications: () => api.get('/users/notifications'),
  markNotificationRead: (id) => api.put(`/users/notifications/${id}/read`),
};

// File download helper
export const downloadFile = async (url, filename) => {
  try {
    const response = await api.get(url, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    toast.error('Failed to download file');
    throw error;
  }
};

// Upload progress helper
export const uploadWithProgress = (url, formData, onProgress) => {
  return api.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000, // 5 minutes for large uploads
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      onProgress?.(percentCompleted);
    },
  });
};

// Retry helper for failed requests
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;