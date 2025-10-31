import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Debug logging
  console.log('ProtectedRoute check:', {
    path: location.pathname,
    loading,
    isAuthenticated,
    user: user ? { id: user.id, name: user.name, role: user.role } : null,
    requiredRole
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    console.log('Redirecting to login - not authenticated');
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole) {
    const hasRequiredRole = requiredRole === 'Admin' 
      ? (user?.role === 'admin' || user?.role === 'system_admin')
      : user?.role === requiredRole;
      
    if (!hasRequiredRole) {
      // User doesn't have required role
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page.
            </p>
            <Navigate to="/dashboard" replace />
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;