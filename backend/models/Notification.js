const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['issue_created', 'issue_assigned', 'issue_updated', 'issue_resolved', 'comment_added', 'user_mentioned', 'system_alert'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: {
        issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue' },
        commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
        fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        metadata: mongoose.Schema.Types.Mixed
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    expiresAt: {
        type: Date
    }
}, { timestamps: true });

// Index for efficient queries
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);
