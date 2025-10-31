const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    token: {
        type: String,
        required: [true, 'Token is required'],
        unique: true,
        index: true
    },
    hashedToken: {
        type: String,
        required: [true, 'Hashed token is required']
    },
    expiresAt: {
        type: Date,
        required: [true, 'Expiration time is required'],
        default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        index: { expireAfterSeconds: 0 }
    },
    isUsed: {
        type: Boolean,
        default: false,
        index: true
    },
    ipAddress: {
        type: String,
        required: false
    },
    userAgent: {
        type: String,
        required: false
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
passwordResetTokenSchema.index({ userId: 1, isUsed: 1, expiresAt: 1 });

// Method to check if token is expired
passwordResetTokenSchema.methods.isExpired = function() {
    return new Date() > this.expiresAt;
};

// Method to check if token can be used (not expired, not used)
passwordResetTokenSchema.methods.canBeUsed = function() {
    return !this.isExpired() && !this.isUsed;
};

// Method to mark token as used
passwordResetTokenSchema.methods.markAsUsed = function() {
    this.isUsed = true;
    return this.save();
};

// Static method to generate secure token
passwordResetTokenSchema.statics.generateToken = function() {
    // Generate a 32-byte random token
    return crypto.randomBytes(32).toString('hex');
};

// Static method to hash token
passwordResetTokenSchema.statics.hashToken = function(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
};

// Static method to create new reset token
passwordResetTokenSchema.statics.createResetToken = async function(userId, ipAddress = null, userAgent = null) {
    try {
        // Invalidate any existing unused tokens for this user
        await this.updateMany(
            { userId, isUsed: false },
            { isUsed: true }
        );

        // Generate new token
        const token = this.generateToken();
        const hashedToken = this.hashToken(token);

        // Create token document
        const resetToken = new this({
            userId,
            token: token, // Store plain token temporarily for return
            hashedToken,
            ipAddress,
            userAgent,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
        });

        await resetToken.save();

        // Remove plain token from document after saving
        resetToken.token = undefined;

        return {
            token, // Return plain token to caller
            tokenId: resetToken._id,
            expiresAt: resetToken.expiresAt
        };
    } catch (error) {
        throw new Error('Failed to create reset token: ' + error.message);
    }
};

// Static method to find valid token
passwordResetTokenSchema.statics.findValidToken = async function(token) {
    try {
        const hashedToken = this.hashToken(token);
        
        const tokenDoc = await this.findOne({
            hashedToken,
            isUsed: false,
            expiresAt: { $gt: new Date() }
        }).populate('userId', 'email name isActive isVerified');

        return tokenDoc;
    } catch (error) {
        throw new Error('Failed to find token: ' + error.message);
    }
};

// Static method to cleanup expired tokens
passwordResetTokenSchema.statics.cleanupExpired = async function() {
    try {
        const result = await this.deleteMany({
            $or: [
                { expiresAt: { $lt: new Date() } },
                { isUsed: true }
            ]
        });

        return {
            success: true,
            deletedCount: result.deletedCount
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};

// Static method to get user's active reset tokens (for admin/debugging)
passwordResetTokenSchema.statics.getUserActiveTokens = async function(userId) {
    try {
        const tokens = await this.find({
            userId,
            isUsed: false,
            expiresAt: { $gt: new Date() }
        }).select('expiresAt createdAt ipAddress userAgent');

        return tokens;
    } catch (error) {
        throw new Error('Failed to get user tokens: ' + error.message);
    }
};

// Pre-save middleware to ensure token is hashed
passwordResetTokenSchema.pre('save', function(next) {
    // If token is being set and hashedToken is not set, hash it
    if (this.token && !this.hashedToken) {
        this.hashedToken = this.constructor.hashToken(this.token);
    }
    next();
});

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);