import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Function to refresh user data from server
  const refreshUser = async () => {
    try {
      const token = authService.getToken();
      if (!token) return;

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('🔄 User data refreshed:', userData);
        setUser(userData);
        // Update localStorage with fresh user data
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  useEffect(() => {
    // Check if user is logged in on app start
    const initializeAuth = () => {
      try {
        const token = authService.getToken();
        const userData = authService.getCurrentUser();
        
        console.log('🔐 AUTH INITIALIZATION:', { 
          hasToken: !!token, 
          hasUserData: !!userData,
          tokenPreview: token ? `${token.substring(0, 20)}...` : 'None',
          userPreview: userData ? { name: userData.name, email: userData.email } : 'None'
        });
        
        // Both token and user data must be present for valid authentication
        if (token && userData) {
          console.log('✅ Valid auth state - setting user as authenticated:', userData);
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          console.log('❌ Invalid auth state detected');
          // If we have inconsistent state (user without token or vice versa), clear everything
          if (userData && !token) {
            console.log('🚨 CRITICAL: User data exists but no token! Clearing all auth data...');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Show a message to the user
            setTimeout(() => {
              alert('Your session has expired. Please login again.');
              window.location.href = '/login';
            }, 1000);
          } else if (token && !userData) {
            console.log('🚨 Token exists but no user data! Clearing all auth data...');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear invalid data
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);
      const result = await authService.login(credentials);
      
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      const result = await authService.register(userData);
      
      // If registration includes auto-login, update auth state
      if (result.success && result.autoLogin && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
      }
      
      return result;
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      setLoading(true);
      const result = await authService.verifyOTP(email, otp);
      
      // If verification includes auto-login tokens, update auth state
      if (result.success && result.data && result.data.accessToken && result.data.user) {
        setUser(result.data.user);
        setIsAuthenticated(true);
      }
      
      return result;
    } catch (error) {
      console.error('OTP verification error:', error);
      return { success: false, message: 'OTP verification failed' };
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async (email) => {
    try {
      const result = await authService.resendOTP(email);
      return result;
    } catch (error) {
      console.error('Resend OTP error:', error);
      return { success: false, message: 'Failed to resend OTP' };
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const forceLogout = () => {
    console.log('Force logout - clearing all auth data');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const hasRole = (requiredRole) => {
    return user && user.role === requiredRole;
  };

  const hasAnyRole = (roles) => {
    return user && roles.includes(user.role);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    verifyOTP,
    resendOTP,
    refreshUser,
    updateUser,
    hasRole,
    hasAnyRole,
    forceLogout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};