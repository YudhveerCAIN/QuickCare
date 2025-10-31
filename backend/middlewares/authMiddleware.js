const User = require('../models/User');
const jwtService = require('../services/jwtService');
const sessionService = require('../services/sessionService');

/**
 * Enhanced authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access token required',
                code: 'TOKEN_REQUIRED'
            });
        }

        const token = authHeader.split(' ')[1];

        // Validate session using enhanced session service
        const sessionValidation = await sessionService.validateSession(token);

        if (!sessionValidation.valid) {
            return res.status(401).json({
                success: false,
                message: sessionValidation.error,
                code: sessionValidation.code
            });
        }

        const user = sessionValidation.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }

        // Check if user is verified (for endpoints that require verification)
        if (!user.isVerified && req.path !== '/me') {
            return res.status(403).json({
                success: false,
                message: 'Email verification required',
                code: 'EMAIL_NOT_VERIFIED'
            });
        }

        // Attach user, session, and token info to request
        req.user = user;
        req.session = sessionValidation.session;
        req.tokenPayload = sessionValidation.tokenPayload;
        req.tokenInfo = {
            jti: sessionValidation.tokenPayload.jti,
            iat: sessionValidation.tokenPayload.iat,
            exp: sessionValidation.tokenPayload.exp
        };

        // Log authentication for security monitoring
        console.log('Authentication successful:', {
            userId: user._id,
            email: user.email,
            role: user.role,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: `${req.method} ${req.path}`,
            tokenId: sessionValidation.tokenPayload.jti,
            sessionId: sessionValidation.session._id
        });

        next();

    } catch (error) {
        console.error('Authentication middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 * @param {Object} req - Express request object
 * @param {Object} _res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token provided, continue without authentication
            req.user = null;
            return next();
        }

        const token = authHeader.split(' ')[1];
        const verification = jwtService.verifyAccessToken(token);

        if (verification.valid) {
            const user = await User.findById(verification.payload.id).select('-password');
            if (user && user.isActive) {
                req.user = user;
                req.tokenPayload = verification.payload;
            }
        }

        next();

    } catch (error) {
        // Continue without authentication on error
        req.user = null;
        next();
    }
};

/**
 * Admin authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const adminAuth = async (req, res, next) => {
    // First run regular auth
    await auth(req, res, () => {
        // Check if user has admin role
        if (!req.user || !['admin', 'system_admin'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Admin access required',
                code: 'ADMIN_ACCESS_REQUIRED'
            });
        }
        next();
    });
};

/**
 * Token refresh middleware (for refresh token endpoints)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const refreshTokenAuth = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token required',
                code: 'REFRESH_TOKEN_REQUIRED'
            });
        }

        const verification = jwtService.verifyRefreshToken(refreshToken);

        if (!verification.valid) {
            return res.status(401).json({
                success: false,
                message: verification.error,
                code: verification.code
            });
        }

        req.refreshTokenPayload = verification.payload;
        next();

    } catch (error) {
        console.error('Refresh token auth error:', error);
        return res.status(500).json({
            success: false,
            message: 'Refresh token authentication error',
            code: 'REFRESH_AUTH_ERROR'
        });
    }
};

/**
 * Role-based access control middleware
 * @param {Array} allowedRoles - Array of allowed roles
 * @returns {Function} Middleware function
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: allowedRoles,
                current: req.user.role
            });
        }

        next();
    };
};

// Alias for backward compatibility
const authenticateToken = auth;

module.exports = {
    auth,
    authenticateToken,
    optionalAuth,
    adminAuth,
    refreshTokenAuth,
    requireRole
};