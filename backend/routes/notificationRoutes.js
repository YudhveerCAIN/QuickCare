const express = require('express');
const router = express.Router();
const {auth} = require('../middlewares/authMiddleware');
const {
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getNotificationStats
} = require('../controllers/notificationController');

// Get user notifications
router.get('/', 
    auth, 
    getUserNotifications
);

// Get notification statistics
router.get('/stats', 
    auth, 
    getNotificationStats
);

// Mark notification as read
router.put('/:notificationId/read', 
    auth, 
    markAsRead
);

// Mark all notifications as read
router.put('/mark-all-read', 
    auth, 
    markAllAsRead
);

// Delete notification
router.delete('/:notificationId', 
    auth, 
    deleteNotification
);

module.exports = router;
