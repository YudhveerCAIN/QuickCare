const PasswordResetToken = require('../models/PasswordResetToken');
const User = require('../models/User');
const emailService = require('./emailService');
const crypto = require('crypto');

class PasswordResetService {
    constructor() {
        // Cleanup expired tokens every hour
        setInterval(() => {
            this.cleanupExpiredTokens();
        }, 60 * 60 * 1000);
    }

    /**
     * Initiate password reset process
     * @param {string} email - User email address
     * @param {string} ipAddress - Client IP address
     * @param {string} userAgent - Client user agent
     * @returns {Promise<Object>} - Result object
     */
    async initiatePasswordReset(email, ipAddress = null, userAgent = null) {
        try {
            // Find user by email
            const user = await User.findOne({ email, isActive: true });
            
            // For security, don't reveal if email exists or not
            if (!user) {
                return {
                    success: true,
                    message: 'If the email exists in our system, a password reset link has been sent.'
                };
            }

            // Check if user is verified
            if (!user.isVerified) {
                return {
                    success: false,
                    message: 'Please verify your email address first before resetting password.',
                    code: 'EMAIL_NOT_VERIFIED'
                };
            }

            // Check rate limiting - max 3 reset requests per hour per user
            const recentTokens = await PasswordResetToken.countDocuments({
                userId: user._id,
                createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
            });

            if (recentTokens >= 3) {
                return {
                    success: false,
                    message: 'Too many password reset requests. Please wait an hour before requesting again.',
                    code: 'RATE_LIMIT_EXCEEDED'
                };
            }

            // Create reset token
            const tokenResult = await PasswordResetToken.createResetToken(
                user._id, 
                ipAddress, 
                userAgent
            );

            // Generate reset URL
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${tokenResult.token}`;

            // Send password reset email
            await emailService.sendPasswordResetEmail(user.email, tokenResult.token, resetUrl);

            console.log('Password reset initiated:', {
                userId: user._id,
                email: user.email,
                tokenId: tokenResult.tokenId,
                expiresAt: tokenResult.expiresAt,
                ipAddress
            });

            return {
                success: true,
                message: 'Password reset link has been sent to your email address.',
                expiresAt: tokenResult.expiresAt
            };

        } catch (error) {
            console.error('Error initiating password reset:', error);
            throw new Error('Failed to initiate password reset');
        }
    }

    /**
     * Verify reset token
     * @param {string} token - Reset token
     * @returns {Promise<Object>} - Verification result
     */
    async verifyResetToken(token) {
        try {
            if (!token || token.length !== 64) { // 32 bytes = 64 hex chars
                return {
                    success: false,
                    message: 'Invalid reset token format',
                    code: 'INVALID_TOKEN_FORMAT'
                };
            }

            const tokenDoc = await PasswordResetToken.findValidToken(token);

            if (!tokenDoc) {
                return {
                    success: false,
                    message: 'Invalid or expired reset token',
                    code: 'TOKEN_INVALID'
                };
            }

            // Check if user is still active and verified
            if (!tokenDoc.userId.isActive) {
                return {
                    success: false,
                    message: 'User account is deactivated',
                    code: 'ACCOUNT_DEACTIVATED'
                };
            }

            if (!tokenDoc.userId.isVerified) {
                return {
                    success: false,
                    message: 'User email is not verified',
                    code: 'EMAIL_NOT_VERIFIED'
                };
            }

            return {
                success: true,
                message: 'Reset token is valid',
                userId: tokenDoc.userId._id,
                email: tokenDoc.userId.email,
                tokenId: tokenDoc._id,
                expiresAt: tokenDoc.expiresAt
            };

        } catch (error) {
            console.error('Error verifying reset token:', error);
            throw new Error('Failed to verify reset token');
        }
    }

    /**
     * Complete password reset
     * @param {string} token - Reset token
     * @param {string} newPassword - New password
     * @param {string} ipAddress - Client IP address
     * @returns {Promise<Object>} - Reset result
     */
    async completePasswordReset(token, newPassword, ipAddress = null) {
        try {
            // Verify token first
            const verificationResult = await this.verifyResetToken(token);
            
            if (!verificationResult.success) {
                return verificationResult;
            }

            // Validate new password
            if (!newPassword || newPassword.length < 8) {
                return {
                    success: false,
                    message: 'Password must be at least 8 characters long',
                    code: 'INVALID_PASSWORD'
                };
            }

            // Get user and token document
            const user = await User.findById(verificationResult.userId).select('+password');
            const tokenDoc = await PasswordResetToken.findById(verificationResult.tokenId);

            if (!user || !tokenDoc) {
                return {
                    success: false,
                    message: 'Invalid reset request',
                    code: 'INVALID_REQUEST'
                };
            }

            // Check if new password is different from current password
            const bcrypt = require('bcrypt');
            const isSamePassword = await bcrypt.compare(newPassword, user.password);
            
            if (isSamePassword) {
                return {
                    success: false,
                    message: 'New password must be different from your current password',
                    code: 'SAME_PASSWORD'
                };
            }

            // Update user password (will be hashed by pre-save middleware)
            user.password = newPassword;
            await user.save();

            // Mark token as used
            await tokenDoc.markAsUsed();

            // Invalidate all other reset tokens for this user
            await PasswordResetToken.updateMany(
                { userId: user._id, isUsed: false },
                { isUsed: true }
            );

            console.log('Password reset completed:', {
                userId: user._id,
                email: user.email,
                tokenId: tokenDoc._id,
                ipAddress
            });

            return {
                success: true,
                message: 'Password has been reset successfully. You can now log in with your new password.',
                userId: user._id
            };

        } catch (error) {
            console.error('Error completing password reset:', error);
            throw new Error('Failed to complete password reset');
        }
    }

    /**
     * Get reset token status (for debugging/admin purposes)
     * @param {string} token - Reset token
     * @returns {Promise<Object>} - Token status
     */
    async getTokenStatus(token) {
        try {
            const hashedToken = PasswordResetToken.hashToken(token);
            
            const tokenDoc = await PasswordResetToken.findOne({ hashedToken })
                .populate('userId', 'email name isActive isVerified');

            if (!tokenDoc) {
                return {
                    exists: false,
                    message: 'Token not found'
                };
            }

            return {
                exists: true,
                isExpired: tokenDoc.isExpired(),
                isUsed: tokenDoc.isUsed,
                canBeUsed: tokenDoc.canBeUsed(),
                expiresAt: tokenDoc.expiresAt,
                createdAt: tokenDoc.createdAt,
                user: tokenDoc.userId ? {
                    email: tokenDoc.userId.email,
                    name: tokenDoc.userId.name,
                    isActive: tokenDoc.userId.isActive,
                    isVerified: tokenDoc.userId.isVerified
                } : null
            };

        } catch (error) {
            console.error('Error getting token status:', error);
            throw new Error('Failed to get token status');
        }
    }

    /**
     * Cleanup expired tokens
     * @returns {Promise<Object>} - Cleanup result
     */
    async cleanupExpiredTokens() {
        try {
            const result = await PasswordResetToken.cleanupExpired();
            
            if (result.success && result.deletedCount > 0) {
                console.log(`Cleaned up ${result.deletedCount} expired password reset tokens`);
            }

            return result;
        } catch (error) {
            console.error('Error cleaning up expired tokens:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get user's active reset tokens (admin function)
     * @param {string} userId - User ID
     * @returns {Promise<Array>} - Active tokens
     */
    async getUserActiveTokens(userId) {
        try {
            return await PasswordResetToken.getUserActiveTokens(userId);
        } catch (error) {
            console.error('Error getting user active tokens:', error);
            throw error;
        }
    }

    /**
     * Invalidate all reset tokens for a user (security function)
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - Invalidation result
     */
    async invalidateUserTokens(userId) {
        try {
            const result = await PasswordResetToken.updateMany(
                { userId, isUsed: false },
                { isUsed: true }
            );

            console.log('User reset tokens invalidated:', {
                userId,
                modifiedCount: result.modifiedCount
            });

            return {
                success: true,
                invalidatedCount: result.modifiedCount
            };

        } catch (error) {
            console.error('Error invalidating user tokens:', error);
            throw new Error('Failed to invalidate user tokens');
        }
    }
}

module.exports = new PasswordResetService();