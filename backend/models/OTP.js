const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
        index: true
    },
    otp: {
        type: String,
        required: [true, 'OTP is required'],
        length: 6,
        match: [/^\d{6}$/, 'OTP must be 6 digits']
    },
    type: {
        type: String,
        enum: ['registration', 'password_reset', 'email_change'],
        required: [true, 'OTP type is required'],
        default: 'registration'
    },
    expiresAt: {
        type: Date,
        required: [true, 'Expiration time is required'],
        default: () => new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        index: { expireAfterSeconds: 0 }
    },
    attempts: {
        type: Number,
        default: 0,
        max: [3, 'Maximum 3 verification attempts allowed']
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        sparse: true // Allow null for registration OTPs
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
otpSchema.index({ email: 1, type: 1, isUsed: 1 });

// Method to check if OTP is expired
otpSchema.methods.isExpired = function() {
    return new Date() > this.expiresAt;
};

// Method to check if OTP can be used (not expired, not used, attempts < 3)
otpSchema.methods.canBeUsed = function() {
    return !this.isExpired() && !this.isUsed && this.attempts < 3;
};

// Method to increment attempts
otpSchema.methods.incrementAttempts = function() {
    this.attempts += 1;
    return this.save();
};

// Method to mark as used
otpSchema.methods.markAsUsed = function() {
    this.isUsed = true;
    return this.save();
};

// Static method to generate 6-digit OTP
otpSchema.statics.generateOTP = function() {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static method to find valid OTP
otpSchema.statics.findValidOTP = async function(email, otp, type = 'registration') {
    const otpDoc = await this.findOne({
        email,
        otp,
        type,
        isUsed: false,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: 3 }
    });
    
    return otpDoc;
};

// Static method to cleanup expired OTPs
otpSchema.statics.cleanupExpired = async function() {
    const result = await this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { isUsed: true },
            { attempts: { $gte: 3 } }
        ]
    });
    
    return result;
};

module.exports = mongoose.model('OTP', otpSchema);