import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('🔍 API REQUEST:', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      hasUser: !!user,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'None'
    });
    
    // Check for inconsistent auth state
    if (user && !token) {
      console.error('❌ INCONSISTENT AUTH STATE DETECTED!', {
        hasUser: !!user,
        hasToken: !!token,
        url: config.url
      });
      // Clear the inconsistent state
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      // Redirect to login if this is a protected endpoint
      const protectedEndpoints = ['/issues', '/assignments', '/auth/me'];
      const isProtectedEndpoint = protectedEndpoints.some(endpoint => config.url.includes(endpoint));
      if (isProtectedEndpoint) {
        console.log('🔄 Redirecting to login due to protected endpoint');
        window.location.href = '/login';
        return Promise.reject(new Error('Authentication required'));
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Token added to request headers');
    } else {
      console.log('⚠️ No token available for request');
    }
    
    return config;
  },
  (error) => {
    console.error('❌ REQUEST INTERCEPTOR ERROR:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const message = error.response?.data?.message || 'An error occurred';
    const url = error.config?.url || '';
    const status = error.response?.status;
    const fullError = {
      url,
      status,
      message,
      fullResponse: error.response?.data,
      requestHeaders: error.config?.headers,
      hasAuthHeader: !!error.config?.headers?.Authorization
    };
    
    console.error('❌ API RESPONSE ERROR:', fullError);
    
    // Handle specific error cases
    if (status === 401) {
      console.error('🚫 401 UNAUTHORIZED ERROR DETAILS:', {
        url,
        message,
        hasAuthHeader: !!error.config?.headers?.Authorization,
        authHeader: error.config?.headers?.Authorization ? 
          `${error.config.headers.Authorization.substring(0, 30)}...` : 'None',
        fullErrorData: error.response?.data
      });
      
      // Only logout for critical authentication failures
      const criticalAuthEndpoints = ['/auth/me', '/auth/refresh'];
      const isCriticalAuth = criticalAuthEndpoints.some(endpoint => url.includes(endpoint));
      const isTokenError = message.toLowerCase().includes('token') || 
                          message.toLowerCase().includes('session') ||
                          message.toLowerCase().includes('expired') ||
                          message.toLowerCase().includes('invalid');
      
      if (isCriticalAuth || isTokenError) {
        console.error('💥 CRITICAL AUTH ERROR - FORCING LOGOUT:', { url, message, isCriticalAuth, isTokenError });
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Use a small delay to prevent race conditions
        setTimeout(() => {
          console.log('🔄 Redirecting to login page...');
          window.location.href = '/login';
        }, 100);
        toast.error('Session expired. Please login again.');
      } else {
        // For other 401s, just log and continue
        console.warn('⚠️ Non-critical 401 error (not forcing logout):', url, message);
      }
    } else if (status === 403) {
      console.error('🚫 403 FORBIDDEN:', fullError);
      toast.error('Access denied. Insufficient permissions.');
    } else if (status >= 500) {
      console.error('🔥 SERVER ERROR:', fullError);
      toast.error('Server error. Please try again later.');
    } else if (status >= 400) {
      console.warn('⚠️ CLIENT ERROR:', fullError);
    }
    
    return Promise.reject(error);
  }
);

// Admin API endpoints
export const adminAPI = {
  // User management
  getUsers: () => api.get('/admin/users'),
  createUser: (userData) => api.post('/admin/create-user', userData),
  updateUser: (userId, updates) => api.put(`/admin/users/${userId}`, updates),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  
  // Dashboard stats
  getDashboardStats: () => api.get('/admin/dashboard-stats'),
  
  // Bulk operations
  bulkUpdateIssues: (issueIds, updates) => api.put('/admin/bulk-update-issues', { issueIds, updates }),
  assignIssues: (issueIds, assignedTo, department) => api.put('/admin/assign-issues', { issueIds, assignedTo, department }),
  
  // Analytics
  getAnalytics: (timeRange = 30) => api.get(`/admin/analytics?timeRange=${timeRange}`)
};

export default api;