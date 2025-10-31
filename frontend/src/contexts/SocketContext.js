import React, { createContext, useContext, useEffect, useState } from 'react';
import socketService from '../services/socketService';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Connect to socket when user is authenticated
      const socket = socketService.connect();
      
      socket.on('connect', () => {
        setIsConnected(true);
        socketService.authenticate(user.id);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      // Set up notification listeners
      socketService.onNewNotification((data) => {
        const notification = data.notification;
        setNotifications(prev => [notification, ...prev]);
        
        // Show toast notification
        toast(notification.title, {
          icon: getNotificationIcon(notification.type),
          duration: 4000,
        });
      });

      socketService.onIssueStatusChanged((data) => {
        toast.success(`Issue status updated to ${data.newStatus}`);
      });

      socketService.onIssueAssigned((data) => {
        toast.success('New issue assigned to you');
      });

      socketService.onNewComment((data) => {
        toast('New comment on issue', {
          icon: '💬',
        });
      });

      // Admin-specific listeners
      if (user.role === 'Admin') {
        socketService.joinAdminDashboard();
        
        socketService.onIssueCreated((data) => {
          toast('New issue reported', {
            icon: '🚨',
          });
        });

        socketService.onBulkOperationCompleted((data) => {
          toast.success('Bulk operation completed');
        });
      }

      return () => {
        socketService.disconnect();
        setIsConnected(false);
      };
    }
  }, [isAuthenticated, user]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'issue_status_changed':
        return '📋';
      case 'issue_assigned':
        return '👤';
      case 'comment_on_issue':
        return '💬';
      case 'system_notification':
        return '🔔';
      default:
        return '📢';
    }
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const joinIssue = (issueId) => {
    socketService.joinIssue(issueId);
  };

  const leaveIssue = (issueId) => {
    socketService.leaveIssue(issueId);
  };

  const value = {
    isConnected,
    notifications,
    markNotificationAsRead,
    clearNotifications,
    joinIssue,
    leaveIssue,
    socketService,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};