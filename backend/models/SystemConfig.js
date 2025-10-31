const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  appName: {
    type: String,
    default: 'QuickCare',
    trim: true
  },
  appDescription: {
    type: String,
    default: 'Community Issue Management Platform',
    trim: true
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  emailVerificationRequired: {
    type: Boolean,
    default: true
  },
  allowGuestReports: {
    type: Boolean,
    default: false
  },
  maxFileSize: {
    type: Number,
    default: 5 * 1024 * 1024 // 5MB in bytes
  },
  allowedFileTypes: {
    type: [String],
    default: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4']
  },
  notificationSettings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    }
  },
  issueSettings: {
    autoAssignEnabled: {
      type: Boolean,
      default: false
    },
    defaultPriority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    autoCloseAfterDays: {
      type: Number,
      default: 30
    }
  },
  mapSettings: {
    defaultLatitude: {
      type: Number,
      default: 28.6139 // Delhi coordinates
    },
    defaultLongitude: {
      type: Number,
      default: 77.2090
    },
    defaultZoom: {
      type: Number,
      default: 10
    }
  }
}, { timestamps: true });

// Ensure only one system config document exists
systemConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
