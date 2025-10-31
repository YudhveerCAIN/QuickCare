class NotificationService {
  constructor() {
    this.notifications = new Map();
  }

  async createNotification(notificationData) {
    try {
      const notification = {
        id: Date.now() + Math.random(),
        userId: notificationData.userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        relatedId: notificationData.relatedId,
        priority: notificationData.priority || 'medium',
        actionUrl: notificationData.actionUrl,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (!this.notifications.has(notification.userId)) {
        this.notifications.set(notification.userId, []);
      }
      this.notifications.get(notification.userId).push(notification);

      // Emit real-time notification via Socket.IO
      try {
        const socketService = require('./socketService');
        socketService.emitToUser(notification.userId, 'new_notification', {
          notification: {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            actionUrl: notification.actionUrl,
            createdAt: notification.createdAt
          }
        });
      } catch (socketError) {
        console.log('Socket service not available:', socketError.message);
      }

      console.log(`Notification created for user ${notification.userId}: ${notification.title}`);
      
      return {
        success: true,
        notification
      };
    } catch (error) {
      console.error('Error creating notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUserNotifications(userId, options = {}) {
    try {
      const userNotifications = this.notifications.get(userId) || [];
      let filteredNotifications = [...userNotifications];

      if (options.unreadOnly) {
        filteredNotifications = filteredNotifications.filter(n => !n.isRead);
      }

      filteredNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const limit = options.limit || 50;
      const offset = options.offset || 0;
      const paginatedNotifications = filteredNotifications.slice(offset, offset + limit);

      return {
        success: true,
        notifications: paginatedNotifications,
        total: filteredNotifications.length,
        unreadCount: userNotifications.filter(n => !n.isRead).length
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async markAsRead(userId, notificationId) {
    try {
      const userNotifications = this.notifications.get(userId) || [];
      const notification = userNotifications.find(n => n.id === notificationId);
      
      if (notification) {
        notification.isRead = true;
        notification.updatedAt = new Date();
        return { success: true };
      }
      
      return {
        success: false,
        error: 'Notification not found'
      };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendIssueStatusNotification(issue, oldStatus, newStatus, updatedBy) {
    try {
      if (issue.submittedBy) {
        await this.createNotification({
          userId: issue.submittedBy.toString(),
          type: 'issue_status_changed',
          title: 'Issue Status Updated',
          message: `Your issue "${issue.title}" status changed from ${oldStatus} to ${newStatus}`,
          relatedId: issue._id,
          priority: newStatus === 'Resolved' ? 'high' : 'medium',
          actionUrl: `/issues/${issue._id}`
        });
      }

      if (issue.assignedTo && issue.assignedTo.toString() !== updatedBy.toString()) {
        await this.createNotification({
          userId: issue.assignedTo.toString(),
          type: 'assigned_issue_updated',
          title: 'Assigned Issue Updated',
          message: `Issue "${issue.title}" status changed to ${newStatus}`,
          relatedId: issue._id,
          priority: 'medium',
          actionUrl: `/issues/${issue._id}`
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending issue status notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendNewIssueNotification(issue) {
    try {
      console.log(`New issue notification would be sent for: ${issue.title}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending new issue notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new NotificationService();