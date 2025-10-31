import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AuthDebug = () => {
  const { user, isAuthenticated, loading, forceLogout } = useAuth();
  
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const hasInconsistentState = isAuthenticated && !token;
  
  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs max-w-sm">
      <h4 className="font-bold mb-2">Auth Debug</h4>
      <div className="space-y-1">
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</div>
        <div>User: {user ? user.name || user.email : 'None'}</div>
        <div>Token: {token ? `${token.substring(0, 20)}...` : 'None'}</div>
        <div>Stored User: {storedUser ? 'Yes' : 'No'}</div>
        {hasInconsistentState && (
          <div className="text-red-400 font-bold">⚠️ INCONSISTENT STATE!</div>
        )}
      </div>
      {hasInconsistentState && (
        <button
          onClick={forceLogout}
          className="mt-2 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
        >
          Force Logout
        </button>
      )}
    </div>
  );
};

export default AuthDebug;