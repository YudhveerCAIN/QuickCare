const Notification = require('../models/Notification');
const User = require('../models/User');
const Issue = require('../models/Issue');

// Get user notifications
exports.getUserNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, unreadOnly = false } = req.query;
        const userId = req.user._id;

        const filter = { userId };
        if (unreadOnly === 'true') {
            filter.isRead = false;
        }

        const notifications = await Notification.find(filter)
            .populate('data.issueId', 'title status')
            .populate('data.fromUserId', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Notification.countDocuments(filter);
        const unreadCount = await Notification.countDocuments({ userId, isRead: false });

        res.json({
            notifications,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total,
            unreadCount
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications', error: error.message });
    }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user._id;

        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: 'Error marking notification as read', error: error.message });
    }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;

        await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Error marking all notifications as read', error: error.message });
    }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user._id;

        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            userId
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting notification', error: error.message });
    }
};

// Create notification (internal function)
exports.createNotification = async (userId, type, title, message, data = {}) => {
    try {
        const notification = await Notification.create({
            userId,
            type,
            title,
            message,
            data
        });

        // Note: Socket.io integration will be handled in the route handler
        // where req.app is available

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
};

// Get notification statistics
exports.getNotificationStats = async (req, res) => {
    try {
        const userId = req.user._id;

        const stats = await Notification.aggregate([
            { $match: { userId: userId } },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    unreadCount: {
                        $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
                    }
                }
            }
        ]);

        const totalUnread = await Notification.countDocuments({
            userId,
            isRead: false
        });

        res.json({
            totalUnread,
            byType: stats
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notification statistics', error: error.message });
    }
};
