const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  issueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    required: true,
    index: true
  },
  
  actionType: {
    type: String,
    required: true,
    enum: [
      'issue_created',
      'status_changed',
      'issue_assigned',
      'issue_reassigned',
      'priority_changed',
      'comment_added',
      'image_uploaded',
      'issue_updated',
      'issue_deleted',
      'bulk_operation'
    ],
    index: true
  },
  
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  departmentId: {
    type: String,
    index: true
  },
  
  actionDetails: {
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    reason: String,
    notes: String,
    metadata: {
      ipAddress: String,
      userAgent: String,
      source: {
        type: String,
        enum: ['web', 'mobile', 'api', 'system'],
        default: 'web'
      }
    }
  },
  
  visibility: {
    type: String,
    enum: ['public', 'internal', 'admin_only'],
    default: 'internal',
    index: true
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
activityLogSchema.index({ issueId: 1, timestamp: -1 });
activityLogSchema.index({ performedBy: 1, timestamp: -1 });

// Static method to log activity
activityLogSchema.statics.logActivity = async function(activityData) {
  try {
    const log = new this(activityData);
    await log.save();
    return { success: true, log };
  } catch (error) {
    console.error('Error logging activity:', error);
    return { success: false, error: error.message };
  }
};

module.exports = mongoose.model('ActivityLog', activityLogSchema);