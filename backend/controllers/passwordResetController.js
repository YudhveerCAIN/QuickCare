const passwordResetService = require('../services/passwordResetService');
const User = require('../models/User');

/**
 * Request password reset
 * @route POST /api/auth/forgot-password
 * @access Public
 */
exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Validate email format
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address'
            });
        }

        // Get client information
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');

        // Initiate password reset
        const result = await passwordResetService.initiatePasswordReset(
            email.toLowerCase().trim(),
            ipAddress,
            userAgent
        );

        // Always return success for security (don't reveal if email exists)
        res.json({
            success: true,
            message: result.message,
            ...(result.expiresAt && { expiresAt: result.expiresAt })
        });

    } catch (error) {
        console.error('Request password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process password reset request'
        });
    }
};

/**
 * Verify reset token
 * @route GET /api/auth/verify-reset-token/:token
 * @access Public
 */
exports.verifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Reset token is required'
            });
        }

        const result = await passwordResetService.verifyResetToken(token);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            message: result.message,
            email: result.email,
            expiresAt: result.expiresAt
        });

    } catch (error) {
        console.error('Verify reset token error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify reset token'
        });
    }
};

/**
 * Reset password
 * @route POST /api/auth/reset-password
 * @access Public
 */
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        if (!token || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token, new password, and password confirmation are required'
            });
        }

        // Validate password match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match'
            });
        }

        // Validate password strength
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        // Additional password strength validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
            });
        }

        // Get client IP
        const ipAddress = req.ip || req.connection.remoteAddress;

        // Complete password reset
        const result = await passwordResetService.completePasswordReset(
            token,
            newPassword,
            ipAddress
        );

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
};

/**
 * Get reset token status (admin endpoint)
 * @route GET /api/auth/reset-token-status/:token
 * @access Private (Admin only)
 */
exports.getResetTokenStatus = async (req, res) => {
    try {
        const { token } = req.params;

        // Check if user has admin permissions
        if (!req.user || !req.user.hasPermission('canManageUsers')) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin permissions required.'
            });
        }

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required'
            });
        }

        const status = await passwordResetService.getTokenStatus(token);

        res.json({
            success: true,
            tokenStatus: status
        });

    } catch (error) {
        console.error('Get reset token status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get token status'
        });
    }
};

/**
 * Get user's active reset tokens (admin endpoint)
 * @route GET /api/auth/user-reset-tokens/:userId
 * @access Private (Admin only)
 */
exports.getUserResetTokens = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if user has admin permissions
        if (!req.user || !req.user.hasPermission('canManageUsers')) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin permissions required.'
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const tokens = await passwordResetService.getUserActiveTokens(userId);

        res.json({
            success: true,
            activeTokens: tokens,
            count: tokens.length
        });

    } catch (error) {
        console.error('Get user reset tokens error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user reset tokens'
        });
    }
};

/**
 * Invalidate user's reset tokens (admin endpoint)
 * @route POST /api/auth/invalidate-user-tokens/:userId
 * @access Private (Admin only)
 */
exports.invalidateUserTokens = async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if user has admin permissions
        if (!req.user || !req.user.hasPermission('canManageUsers')) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin permissions required.'
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const result = await passwordResetService.invalidateUserTokens(userId);

        res.json({
            success: true,
            message: `Invalidated ${result.invalidatedCount} reset tokens`,
            invalidatedCount: result.invalidatedCount
        });

    } catch (error) {
        console.error('Invalidate user tokens error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to invalidate user tokens'
        });
    }
};

/**
 * Cleanup expired tokens (admin endpoint)
 * @route POST /api/auth/cleanup-reset-tokens
 * @access Private (System Admin only)
 */
exports.cleanupExpiredTokens = async (req, res) => {
    try {
        // Check if user has system admin permissions
        if (!req.user || !req.user.hasPermission('canSystemConfig')) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. System admin permissions required.'
            });
        }

        const result = await passwordResetService.cleanupExpiredTokens();

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            message: `Cleaned up ${result.deletedCount} expired reset tokens`,
            deletedCount: result.deletedCount
        });

    } catch (error) {
        console.error('Cleanup expired tokens error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cleanup expired tokens'
        });
    }
};