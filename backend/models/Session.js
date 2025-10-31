const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    accessToken: {
        type: String,
        required: [true, 'Access token is required'],
        index: true
    },
    refreshToken: {
        type: String,
        required: [true, 'Refresh token is required'],
        index: true
    },
    tokenId: {
        type: String,
        required: [true, 'Token ID is required'],
        unique: true,
        index: true
    },
    deviceInfo: {
        userAgent: String,
        ipAddress: String,
        deviceType: {
            type: String,
            enum: ['desktop', 'mobile', 'tablet', 'unknown'],
            default: 'unknown'
        },
        browser: String,
        os: String,
        location: {
            country: String,
            city: String,
            region: String
        }
    },
    expiresAt: {
        type: Date,
        required: [true, 'Expiration time is required'],
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        index: { expireAfterSeconds: 0 }
    },
    refreshExpiresAt: {
        type: Date,
        required: [true, 'Refresh expiration time is required'],
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    lastActivity: {
        type: Date,
        default: Date.now,
        index: true
    },
    loginMethod: {
        type: String,
        enum: ['password', 'otp', 'social', 'admin_created'],
        default: 'password'
    },
    securityFlags: {
        isSuspicious: { type: Boolean, default: false },
        requiresReauth: { type: Boolean, default: false },
        isCompromised: { type: Boolean, default: false }
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ userId: 1, lastActivity: -1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if session is expired
sessionSchema.methods.isExpired = function() {
    return new Date() > this.expiresAt;
};

// Method to check if refresh token is expired
sessionSchema.methods.isRefreshExpired = function() {
    return new Date() > this.refreshExpiresAt;
};

// Method to check if session is valid
sessionSchema.methods.isValid = function() {
    return this.isActive && !this.isExpired() && !this.securityFlags.isCompromised;
};

// Method to update last activity
sessionSchema.methods.updateActivity = function() {
    this.lastActivity = new Date();
    return this.save();
};

// Method to invalidate session
sessionSchema.methods.invalidate = function(reason = 'manual') {
    this.isActive = false;
    this.invalidatedAt = new Date();
    this.invalidationReason = reason;
    return this.save();
};

// Method to mark as suspicious
sessionSchema.methods.markSuspicious = function(reason) {
    this.securityFlags.isSuspicious = true;
    this.securityFlags.suspiciousReason = reason;
    this.securityFlags.suspiciousAt = new Date();
    return this.save();
};

// Static method to create new session
sessionSchema.statics.createSession = async function(userId, tokenData, deviceInfo = {}) {
    const session = new this({
        userId,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        tokenId: tokenData.tokenId || require('crypto').randomUUID(),
        deviceInfo: {
            userAgent: deviceInfo.userAgent || 'Unknown',
            ipAddress: deviceInfo.ipAddress || 'Unknown',
            deviceType: this.detectDeviceType(deviceInfo.userAgent),
            browser: this.detectBrowser(deviceInfo.userAgent),
            os: this.detectOS(deviceInfo.userAgent),
            location: deviceInfo.location || {}
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        loginMethod: deviceInfo.loginMethod || 'password'
    });

    return await session.save();
};

// Static method to find active session by token
sessionSchema.statics.findByToken = async function(token, tokenType = 'access') {
    const field = tokenType === 'refresh' ? 'refreshToken' : 'accessToken';
    return await this.findOne({
        [field]: token,
        isActive: true,
        expiresAt: { $gt: new Date() }
    }).populate('userId', 'name email role isActive isVerified');
};

// Static method to invalidate all user sessions
sessionSchema.statics.invalidateUserSessions = async function(userId, reason = 'logout_all') {
    return await this.updateMany(
        { userId, isActive: true },
        { 
            isActive: false, 
            invalidatedAt: new Date(),
            invalidationReason: reason
        }
    );
};

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpired = async function() {
    const result = await this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { refreshExpiresAt: { $lt: new Date() } },
            { isActive: false, updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
        ]
    });
    
    return result;
};

// Static method to get user's active sessions
sessionSchema.statics.getUserActiveSessions = async function(userId) {
    return await this.find({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
    }).sort({ lastActivity: -1 });
};

// Static method to detect device type from user agent
sessionSchema.statics.detectDeviceType = function(userAgent) {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        return 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
        return 'tablet';
    } else {
        return 'desktop';
    }
};

// Static method to detect browser from user agent
sessionSchema.statics.detectBrowser = function(userAgent) {
    if (!userAgent) return 'Unknown';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';
    
    return 'Unknown';
};

// Static method to detect OS from user agent
sessionSchema.statics.detectOS = function(userAgent) {
    if (!userAgent) return 'Unknown';
    
    const ua = userAgent.toLowerCase();
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
    
    return 'Unknown';
};

// Static method to get session statistics
sessionSchema.statics.getSessionStats = async function() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
        totalActive,
        activeLast24h,
        activeLastWeek,
        suspiciousSessions,
        deviceStats
    ] = await Promise.all([
        this.countDocuments({ isActive: true, expiresAt: { $gt: now } }),
        this.countDocuments({ isActive: true, lastActivity: { $gte: oneDayAgo } }),
        this.countDocuments({ isActive: true, lastActivity: { $gte: oneWeekAgo } }),
        this.countDocuments({ 'securityFlags.isSuspicious': true, isActive: true }),
        this.aggregate([
            { $match: { isActive: true, expiresAt: { $gt: now } } },
            { $group: { _id: '$deviceInfo.deviceType', count: { $sum: 1 } } }
        ])
    ]);

    return {
        totalActiveSessions: totalActive,
        activeLast24Hours: activeLast24h,
        activeLastWeek: activeLastWeek,
        suspiciousSessions,
        deviceBreakdown: deviceStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
        }, {})
    };
};

module.exports = mongoose.model('Session', sessionSchema);