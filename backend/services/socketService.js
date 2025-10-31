class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId mapping
  }

  // Initialize Socket.IO instance
  initialize(io) {
    this.io = io;
    this.setupEventHandlers();
  }

  // Set up Socket.IO event handlers
  setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle user authentication/identification
      socket.on('authenticate', (data) => {
        if (data.userId) {
          this.connectedUsers.set(data.userId, socket.id);
          socket.userId = data.userId;
          socket.join(`user_${data.userId}`);
          console.log(`User ${data.userId} authenticated with socket ${socket.id}`);
        }
      });

      // Handle joining issue-specific rooms
      socket.on('join_issue', (issueId) => {
        socket.join(`issue_${issueId}`);
        console.log(`Socket ${socket.id} joined issue room: ${issueId}`);
      });

      // Handle leaving issue-specific rooms
      socket.on('leave_issue', (issueId) => {
        socket.leave(`issue_${issueId}`);
        console.log(`Socket ${socket.id} left issue room: ${issueId}`);
      });

      // Handle joining admin dashboard room
      socket.on('join_admin_dashboard', () => {
        socket.join('admin_dashboard');
        console.log(`Socket ${socket.id} joined admin dashboard`);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          console.log(`User ${socket.userId} disconnected`);
        }
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  // Emit notification to specific user
  emitToUser(userId, event, data) {
    if (!this.io) return;
    
    this.io.to(`user_${userId}`).emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  // Emit to all users in an issue room
  emitToIssue(issueId, event, data) {
    if (!this.io) return;
    
    this.io.to(`issue_${issueId}`).emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  // Emit to admin dashboard
  emitToAdminDashboard(event, data) {
    if (!this.io) return;
    
    this.io.to('admin_dashboard').emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  // Broadcast to all connected clients
  broadcast(event, data) {
    if (!this.io) return;
    
    this.io.emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  // Issue-related real-time events
  emitIssueCreated(issue) {
    // Notify admin dashboard
    this.emitToAdminDashboard('issue_created', {
      issue: {
        id: issue._id,
        title: issue.title,
        category: issue.category,
        priority: issue.priority,
        location: issue.location,
        submittedBy: issue.submittedBy,
        createdAt: issue.createdAt
      }
    });

    // Notify relevant department users (if department assignment logic exists)
    // This would require additional logic to determine which users to notify
  }

  emitIssueStatusChanged(issue, oldStatus, newStatus, updatedBy) {
    // Notify issue reporter
    if (issue.submittedBy) {
      this.emitToUser(issue.submittedBy.toString(), 'issue_status_changed', {
        issueId: issue._id,
        title: issue.title,
        oldStatus,
        newStatus,
        updatedBy
      });
    }

    // Notify assigned user
    if (issue.assignedTo && issue.assignedTo.toString() !== updatedBy.toString()) {
      this.emitToUser(issue.assignedTo.toString(), 'assigned_issue_updated', {
        issueId: issue._id,
        title: issue.title,
        oldStatus,
        newStatus,
        updatedBy
      });
    }

    // Notify users following this issue
    this.emitToIssue(issue._id, 'issue_status_updated', {
      issueId: issue._id,
      oldStatus,
      newStatus,
      updatedBy
    });

    // Update admin dashboard
    this.emitToAdminDashboard('issue_updated', {
      issueId: issue._id,
      type: 'status_change',
      oldStatus,
      newStatus
    });
  }

  emitIssueAssigned(issue, assignedUser, assignedBy) {
    // Notify assigned user
    this.emitToUser(assignedUser.toString(), 'issue_assigned', {
      issueId: issue._id,
      title: issue.title,
      priority: issue.priority,
      assignedBy
    });

    // Notify issue reporter
    if (issue.submittedBy) {
      this.emitToUser(issue.submittedBy.toString(), 'issue_assigned_update', {
        issueId: issue._id,
        title: issue.title,
        assignedTo: assignedUser
      });
    }

    // Update admin dashboard
    this.emitToAdminDashboard('issue_assigned', {
      issueId: issue._id,
      assignedTo: assignedUser,
      assignedBy
    });
  }

  // Comment-related real-time events
  emitNewComment(comment, issue) {
    // Notify all users following this issue
    this.emitToIssue(issue._id, 'new_comment', {
      comment: {
        id: comment._id,
        content: comment.content,
        author: comment.author,
        createdAt: comment.createdAt,
        parentId: comment.parentId
      },
      issueId: issue._id
    });

    // Notify issue reporter (if not the commenter)
    if (issue.submittedBy && issue.submittedBy.toString() !== comment.author.toString()) {
      this.emitToUser(issue.submittedBy.toString(), 'comment_on_your_issue', {
        issueId: issue._id,
        issueTitle: issue.title,
        comment: {
          id: comment._id,
          content: comment.content,
          author: comment.author
        }
      });
    }

    // Notify assigned user (if not the commenter)
    if (issue.assignedTo && issue.assignedTo.toString() !== comment.author.toString()) {
      this.emitToUser(issue.assignedTo.toString(), 'comment_on_assigned_issue', {
        issueId: issue._id,
        issueTitle: issue.title,
        comment: {
          id: comment._id,
          content: comment.content,
          author: comment.author
        }
      });
    }
  }

  emitCommentDeleted(commentId, issueId, deletedBy) {
    // Notify all users following this issue
    this.emitToIssue(issueId, 'comment_deleted', {
      commentId,
      deletedBy
    });
  }

  // Bulk operation events
  emitBulkOperationStarted(operationId, operationType, totalIssues) {
    this.emitToAdminDashboard('bulk_operation_started', {
      operationId,
      operationType,
      totalIssues
    });
  }

  emitBulkOperationProgress(operationId, progress) {
    this.emitToAdminDashboard('bulk_operation_progress', {
      operationId,
      progress
    });
  }

  emitBulkOperationCompleted(operationId, result) {
    this.emitToAdminDashboard('bulk_operation_completed', {
      operationId,
      result
    });
  }

  // System-wide notifications
  emitSystemNotification(notification) {
    this.broadcast('system_notification', notification);
  }

  // Analytics updates
  emitAnalyticsUpdate(data) {
    this.emitToAdminDashboard('analytics_update', data);
  }

  // Get connection status
  getConnectionStatus() {
    return {
      connectedUsers: this.connectedUsers.size,
      totalConnections: this.io ? this.io.engine.clientsCount : 0
    };
  }

  // Check if user is online
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }
}

module.exports = new SocketService();