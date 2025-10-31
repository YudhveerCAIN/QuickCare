import { io } from 'socket.io-client';
import authService from './authService';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect() {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    const serverUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
    
    this.socket = io(serverUrl, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });

    this.socket.connect();

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
      
      // Authenticate user if logged in
      const user = authService.getCurrentUser();
      if (user) {
        this.authenticate(user.id);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  authenticate(userId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('authenticate', { userId });
    }
  }

  // Issue-related events
  joinIssue(issueId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_issue', issueId);
    }
  }

  leaveIssue(issueId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_issue', issueId);
    }
  }

  // Admin dashboard events
  joinAdminDashboard() {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_admin_dashboard');
    }
  }

  // Event listeners
  onNewNotification(callback) {
    if (this.socket) {
      this.socket.on('new_notification', callback);
    }
  }

  onIssueStatusChanged(callback) {
    if (this.socket) {
      this.socket.on('issue_status_changed', callback);
    }
  }

  onIssueAssigned(callback) {
    if (this.socket) {
      this.socket.on('issue_assigned', callback);
    }
  }

  onNewComment(callback) {
    if (this.socket) {
      this.socket.on('new_comment', callback);
    }
  }

  onCommentDeleted(callback) {
    if (this.socket) {
      this.socket.on('comment_deleted', callback);
    }
  }

  onIssueCreated(callback) {
    if (this.socket) {
      this.socket.on('issue_created', callback);
    }
  }

  onIssueUpdated(callback) {
    if (this.socket) {
      this.socket.on('issue_updated', callback);
    }
  }

  onBulkOperationStarted(callback) {
    if (this.socket) {
      this.socket.on('bulk_operation_started', callback);
    }
  }

  onBulkOperationProgress(callback) {
    if (this.socket) {
      this.socket.on('bulk_operation_progress', callback);
    }
  }

  onBulkOperationCompleted(callback) {
    if (this.socket) {
      this.socket.on('bulk_operation_completed', callback);
    }
  }

  onAnalyticsUpdate(callback) {
    if (this.socket) {
      this.socket.on('analytics_update', callback);
    }
  }

  // Remove event listeners
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
    };
  }
}

export default new SocketService();