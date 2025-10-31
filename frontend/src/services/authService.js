import api from './api';

class AuthService {
  async login(credentials) {
    try {
      const response = await api.post('/auth/login', credentials);
      const { accessToken, user } = response.data;  // Use 'accessToken' instead of 'token'
      
      console.log('🔐 Login response:', { hasAccessToken: !!accessToken, hasUser: !!user });
      
      localStorage.setItem('token', accessToken);  // Store as 'token' for consistency
      localStorage.setItem('user', JSON.stringify(user));
      
      return { success: true, user, token: accessToken };
    } catch (error) {
      console.error('❌ Login error:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  }

  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      
      // If registration includes token and user data, store them for auto-login
      const token = response.data.token || response.data.accessToken;
      if (token && response.data.user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        return { 
          success: true, 
          data: response.data,
          autoLogin: true,
          user: response.data.user,
          token: token
        };
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      const errorData = error.response?.data;
      return {
        success: false,
        message: errorData?.message || 'Registration failed',
        errors: errorData?.errors || []
      };
    }
  }

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  async verifyOTP(email, otp) {
    try {
      const response = await api.post('/auth/verify-otp', { email, otp });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'OTP verification failed'
      };
    }
  }

  async resendOTP(email) {
    try {
      const response = await api.post('/auth/resend-otp', { email });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to resend OTP'
      };
    }
  }

  async forgotPassword(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Password reset request failed'
      };
    }
  }

  async resetPassword(token, password) {
    try {
      const response = await api.post('/auth/reset-password', { token, password });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Password reset failed'
      };
    }
  }

  getCurrentUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }

  getToken() {
    return localStorage.getItem('token');
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  hasRole(requiredRole) {
    const user = this.getCurrentUser();
    return user && user.role === requiredRole;
  }
}

export default new AuthService();