const otpService = require('../services/otpService');
const User = require('../models/User');

/**
 * Generate and send OTP for email verification
 * @route POST /api/auth/send-otp
 * @access Public
 */
exports.sendOTP = async (req, res) => {
    try {
        const { email, type = 'registration' } = req.body;

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

        // For registration type, check if email is already registered and verified
        if (type === 'registration') {
            const existingUser = await User.findOne({ email, isVerified: true });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already registered and verified'
                });
            }
        }

        // For password reset, check if user exists
        if (type === 'password_reset') {
            const user = await User.findOne({ email });
            if (!user) {
                // Don't reveal if email exists or not for security
                return res.json({
                    success: true,
                    message: 'If the email exists, an OTP has been sent'
                });
            }
        }

        // Check rate limiting
        const rateLimit = await otpService.checkRateLimit(email, type);
        if (!rateLimit.canRequest) {
            const waitMinutes = Math.ceil(rateLimit.waitTime / (60 * 1000));
            return res.status(429).json({
                success: false,
                message: `Too many requests. Please wait ${waitMinutes} minutes before requesting another OTP`,
                waitTime: rateLimit.waitTime,
                nextRequestAt: rateLimit.nextRequestAt
            });
        }

        // Generate and send OTP
        const result = await otpService.generateAndSendOTP(email, type);

        res.json({
            success: true,
            message: 'OTP sent successfully to your email',
            expiresAt: result.expiresAt,
            ...(process.env.NODE_ENV === 'development' && { 
                emailPreview: result.emailPreview 
            })
        });

    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to send OTP'
        });
    }
};

/**
 * Verify OTP
 * @route POST /api/auth/verify-otp
 * @access Public
 */
exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp, type = 'registration' } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        // Validate OTP format (6 digits)
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: 'OTP must be 6 digits'
            });
        }

        // Verify OTP
        const verificationResult = await otpService.verifyOTP(email, otp, type);

        if (!verificationResult.success) {
            return res.status(400).json(verificationResult);
        }

        // Handle different OTP types
        if (type === 'registration') {
            // Find and verify the user
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found. Please register first.',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Check if user is already verified
            if (user.isVerified) {
                // If already verified, create session and auto-login
                const sessionService = require('../services/sessionService');
                const deviceInfo = sessionService.detectDeviceInfo(req);
                deviceInfo.loginMethod = 'otp_already_verified';

                const sessionResult = await sessionService.createSession(user._id, {
                    role: user.role,
                    name: user.name,
                    email: user.email,
                    department: user.department,
                    permissions: user.permissions,
                    lastLogin: user.lastLogin
                }, deviceInfo);

                if (!sessionResult.success) {
                    return res.status(400).json({
                        success: false,
                        message: 'Email is already verified. Please try logging in manually.',
                        code: 'ALREADY_VERIFIED'
                    });
                }

                return res.json({
                    success: true,
                    message: 'Email is already verified. Welcome back!',
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        department: user.department,
                        isVerified: user.isVerified,
                        isActive: user.isActive,
                        permissions: user.permissions,
                        lastLogin: user.lastLogin
                    },
                    accessToken: sessionResult.tokens.accessToken,
                    refreshToken: sessionResult.tokens.refreshToken,
                    expiresIn: sessionResult.tokens.expiresIn,
                    tokenType: sessionResult.tokens.tokenType,
                    sessionId: sessionResult.session.id,
                    redirectTo: user.role === 'citizen' ? '/dashboard' : '/admin-dashboard'
                });
            }

            // Mark user as verified
            user.isVerified = true;
            user.emailVerifiedAt = new Date();
            user.lastLogin = new Date(); // Set first login time
            await user.save();

            console.log('User email verified successfully:', {
                id: user._id,
                email: user.email,
                verifiedAt: user.emailVerifiedAt
            });

            // Create session with enhanced session service
            const sessionService = require('../services/sessionService');
            const deviceInfo = sessionService.detectDeviceInfo(req);
            deviceInfo.loginMethod = 'otp';

            const sessionResult = await sessionService.createSession(user._id, {
                role: user.role,
                name: user.name,
                email: user.email,
                department: user.department,
                permissions: user.permissions,
                lastLogin: user.lastLogin
            }, deviceInfo);

            if (!sessionResult.success) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create session after verification'
                });
            }

            res.json({
                success: true,
                message: 'Email verified successfully! Welcome to QuickCare.',
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    department: user.department,
                    isVerified: user.isVerified,
                    isActive: user.isActive,
                    permissions: user.permissions,
                    emailVerifiedAt: user.emailVerifiedAt,
                    lastLogin: user.lastLogin
                },
                accessToken: sessionResult.tokens.accessToken,
                refreshToken: sessionResult.tokens.refreshToken,
                expiresIn: sessionResult.tokens.expiresIn,
                tokenType: sessionResult.tokens.tokenType,
                sessionId: sessionResult.session.id,
                redirectTo: user.role === 'citizen' ? '/dashboard' : '/admin-dashboard'
            });
        } else if (type === 'password_reset') {
            // For password reset, return verification confirmation with reset token
            res.json({
                success: true,
                message: 'OTP verified successfully. You can now reset your password.',
                otpId: verificationResult.otpId,
                verified: true,
                nextStep: 'password_reset'
            });
        } else if (type === 'email_change') {
            // For email change, just confirm verification
            res.json({
                success: true,
                message: 'New email address verified successfully.',
                otpId: verificationResult.otpId,
                verified: true,
                nextStep: 'email_update'
            });
        } else {
            // For other types, generic confirmation
            res.json({
                success: true,
                message: 'OTP verified successfully',
                otpId: verificationResult.otpId,
                verified: true
            });
        }

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to verify OTP'
        });
    }
};

/**
 * Resend OTP
 * @route POST /api/auth/resend-otp
 * @access Public
 */
exports.resendOTP = async (req, res) => {
    try {
        const { email, type = 'registration' } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Resend OTP
        const result = await otpService.resendOTP(email, type);

        res.json({
            success: true,
            message: 'OTP resent successfully',
            expiresAt: result.expiresAt,
            ...(process.env.NODE_ENV === 'development' && { 
                emailPreview: result.emailPreview 
            })
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to resend OTP'
        });
    }
};

/**
 * Get OTP status (for debugging/admin purposes)
 * @route GET /api/auth/otp-status
 * @access Private (Admin only)
 */
exports.getOTPStatus = async (req, res) => {
    try {
        const { email, type = 'registration' } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Check if user has admin permissions
        if (!req.user || !req.user.hasPermission('canManageUsers')) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin permissions required.'
            });
        }

        const status = await otpService.getOTPStatus(email, type);
        const rateLimit = await otpService.checkRateLimit(email, type);

        res.json({
            success: true,
            otpStatus: status,
            rateLimit
        });

    } catch (error) {
        console.error('Get OTP status error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get OTP status'
        });
    }
};

/**
 * Cleanup expired OTPs (admin endpoint)
 * @route POST /api/auth/cleanup-otps
 * @access Private (Admin only)
 */
exports.cleanupOTPs = async (req, res) => {
    try {
        // Check if user has admin permissions
        if (!req.user || !req.user.hasPermission('canSystemConfig')) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. System admin permissions required.'
            });
        }

        const result = await otpService.cleanupExpiredOTPs();

        res.json({
            success: true,
            message: `Cleaned up ${result.deletedCount} expired OTPs`,
            deletedCount: result.deletedCount
        });

    } catch (error) {
        console.error('Cleanup OTPs error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to cleanup OTPs'
        });
    }
};