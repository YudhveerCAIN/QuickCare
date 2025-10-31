import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOTP from './pages/auth/VerifyOTP';
import Dashboard from './pages/Dashboard';
import IssueList from './pages/issues/IssueList';
import IssueDetail from './pages/issues/IssueDetail';
import CreateIssue from './pages/issues/CreateIssue';
import AdminDashboard from './pages/admin/AdminDashboard';
import Analytics from './pages/admin/Analytics';
import UserManagement from './pages/admin/UserManagement';
import EnhancedAdminDashboard from './pages/admin/EnhancedAdminDashboard';
import AdminIssueList from './pages/admin/AdminIssueList';
import SmartRoute from './components/common/SmartRoute';
import RoleBasedRedirect from './components/common/RoleBasedRedirect';
import RoleChangeNotification from './components/common/RoleChangeNotification';
import AuthDebug from './components/common/AuthDebug';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <RoleBasedRedirect>
              <main className="container mx-auto px-4 py-8">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-otp" element={<VerifyOTP />} />
                
                {/* Protected routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <SmartRoute 
                      adminComponent={EnhancedAdminDashboard}
                      userComponent={Dashboard}
                    />
                  </ProtectedRoute>
                } />
                
                <Route path="/issues" element={
                  <ProtectedRoute>
                    <SmartRoute 
                      adminComponent={AdminIssueList}
                      userComponent={IssueList}
                    />
                  </ProtectedRoute>
                } />
                
                <Route path="/issues/:id" element={
                  <ProtectedRoute>
                    <IssueDetail />
                  </ProtectedRoute>
                } />
                
                <Route path="/create-issue" element={
                  <ProtectedRoute>
                    <CreateIssue />
                  </ProtectedRoute>
                } />
                
                {/* Admin routes - now accessible via regular paths for admins */}
                <Route path="/users" element={
                  <ProtectedRoute requiredRole="Admin">
                    <UserManagement />
                  </ProtectedRoute>
                } />
                
                <Route path="/analytics" element={
                  <ProtectedRoute requiredRole="Admin">
                    <Analytics />
                  </ProtectedRoute>
                } />
                
                {/* Legacy admin routes - redirect to new enhanced pages */}
                <Route path="/admin" element={
                  <ProtectedRoute requiredRole="Admin">
                    <EnhancedAdminDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/analytics" element={
                  <ProtectedRoute requiredRole="Admin">
                    <Analytics />
                  </ProtectedRoute>
                } />
                
                <Route path="/admin/users" element={
                  <ProtectedRoute requiredRole="Admin">
                    <UserManagement />
                  </ProtectedRoute>
                } />
              </Routes>
              </main>
            </RoleBasedRedirect>
            
            {/* Toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
            
            {/* Debug component for development */}
            <AuthDebug />
            
            {/* Role change notifications */}
            <RoleChangeNotification />
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;