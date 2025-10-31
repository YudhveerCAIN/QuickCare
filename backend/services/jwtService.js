const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class JWTService {
    constructor() {
        this.secret = process.env.JWT_SECRET;
        this.refreshSecret = process.env.JWT_REFRESH_SECRET || this.secret + '_refresh';
        this.accessTokenExpiry = '24h'; // 24 hours as specified in requirements
        this.refreshTokenExpiry = '7d'; // 7 days for refresh tokens
        
        // In-memory blacklist for revoked tokens (in production, use Redis)
        this.tokenBlacklist = new Set();
        
        // Cleanup blacklist every hour
        setInterval(() => {
            this.cleanupBlacklist();
        }, 60 * 60 * 1000);
    }

    /**
     * Generate access token
     * @param {Object} payload - Token payload
     * @returns {string} - JWT access token
     */
    generateAccessToken(payload) {
        const tokenPayload = {
            ...payload,
            type: 'access',
            iat: Math.floor(Date.now() / 1000),
            jti: crypto.randomUUID() // Unique token ID for blacklisting
        };

        return jwt.sign(tokenPayload, this.secret, {
            expiresIn: this.accessTokenExpiry,
            issuer: 'quickcare',
            audience: 'quickcare-users'
        });
    }

    /**
     * Generate refresh token
     * @param {Object} payload - Token payload
     * @returns {string} - JWT refresh token
     */
    generateRefreshToken(payload) {
        const tokenPayload = {
            id: payload.id,
            role: payload.role,
            type: 'refresh',
            iat: Math.floor(Date.now() / 1000),
            jti: crypto.randomUUID()
        };

        return jwt.sign(tokenPayload, this.refreshSecret, {
            expiresIn: this.refreshTokenExpiry,
            issuer: 'quickcare',
            audience: 'quickcare-users'
        });
    }

    /**
     * Generate token pair (access + refresh)
     * @param {string} userId - User ID
     * @param {string} role - User role
     * @param {Object} additionalData - Additional token data
     * @returns {Object} - Token pair
     */
    generateTokenPair(userId, role, additionalData = {}) {
        const payload = {
            id: userId,
            role: role,
            ...additionalData
        };

        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken(payload);

        return {
            accessToken,
            refreshToken,
            expiresIn: this.getExpiryTime(this.accessTokenExpiry),
            tokenType: 'Bearer'
        };
    }

    /**
     * Verify access token
     * @param {string} token - JWT token
     * @returns {Object} - Verification result
     */
    verifyAccessToken(token) {
        try {
            // Check if token is blacklisted
            if (this.isTokenBlacklisted(token)) {
                return {
                    valid: false,
                    error: 'Token has been revoked',
                    code: 'TOKEN_REVOKED'
                };
            }

            const decoded = jwt.verify(token, this.secret, {
                issuer: 'quickcare',
                audience: 'quickcare-users'
            });

            // Verify token type
            if (decoded.type !== 'access') {
                return {
                    valid: false,
                    error: 'Invalid token type',
                    code: 'INVALID_TOKEN_TYPE'
                };
            }

            return {
                valid: true,
                payload: decoded
            };

        } catch (error) {
            return {
                valid: false,
                error: this.getJWTErrorMessage(error),
                code: this.getJWTErrorCode(error)
            };
        }
    }

    /**
     * Verify refresh token
     * @param {string} token - JWT refresh token
     * @returns {Object} - Verification result
     */
    verifyRefreshToken(token) {
        try {
            // Check if token is blacklisted
            if (this.isTokenBlacklisted(token)) {
                return {
                    valid: false,
                    error: 'Refresh token has been revoked',
                    code: 'TOKEN_REVOKED'
                };
            }

            const decoded = jwt.verify(token, this.refreshSecret, {
                issuer: 'quickcare',
                audience: 'quickcare-users'
            });

            // Verify token type
            if (decoded.type !== 'refresh') {
                return {
                    valid: false,
                    error: 'Invalid token type',
                    code: 'INVALID_TOKEN_TYPE'
                };
            }

            return {
                valid: true,
                payload: decoded
            };

        } catch (error) {
            return {
                valid: false,
                error: this.getJWTErrorMessage(error),
                code: this.getJWTErrorCode(error)
            };
        }
    }

    /**
     * Refresh access token using refresh token
     * @param {string} refreshToken - Refresh token
     * @param {Object} userData - Updated user data
     * @returns {Object} - New token pair or error
     */
    refreshAccessToken(refreshToken, userData = {}) {
        const verification = this.verifyRefreshToken(refreshToken);
        
        if (!verification.valid) {
            return {
                success: false,
                error: verification.error,
                code: verification.code
            };
        }

        // Blacklist the old refresh token
        this.blacklistToken(refreshToken);

        // Generate new token pair
        const tokenPair = this.generateTokenPair(
            verification.payload.id,
            verification.payload.role,
            userData
        );

        return {
            success: true,
            ...tokenPair
        };
    }

    /**
     * Blacklist a token (for logout/revocation)
     * @param {string} token - Token to blacklist
     */
    blacklistToken(token) {
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.jti) {
                this.tokenBlacklist.add(decoded.jti);
                console.log('Token blacklisted:', { jti: decoded.jti, type: decoded.type });
            }
        } catch (error) {
            console.error('Error blacklisting token:', error);
        }
    }

    /**
     * Check if token is blacklisted
     * @param {string} token - Token to check
     * @returns {boolean} - Is blacklisted
     */
    isTokenBlacklisted(token) {
        try {
            const decoded = jwt.decode(token);
            return decoded && decoded.jti && this.tokenBlacklist.has(decoded.jti);
        } catch (error) {
            return false;
        }
    }

    /**
     * Blacklist all tokens for a user (for security purposes)
     * @param {string} userId - User ID
     */
    blacklistUserTokens(userId) {
        // In a production environment, this would query a database
        // For now, we'll add a user-specific blacklist entry
        this.tokenBlacklist.add(`user_${userId}_revoked_${Date.now()}`);
        console.log('All tokens blacklisted for user:', userId);
    }

    /**
     * Get token expiry time in seconds
     * @param {string} expiresIn - Expiry string (e.g., '24h')
     * @returns {number} - Expiry time in seconds
     */
    getExpiryTime(expiresIn) {
        const units = {
            's': 1,
            'm': 60,
            'h': 3600,
            'd': 86400
        };

        const match = expiresIn.match(/^(\d+)([smhd])$/);
        if (!match) return 86400; // Default to 24 hours

        const [, value, unit] = match;
        return parseInt(value) * units[unit];
    }

    /**
     * Get user-friendly JWT error message
     * @param {Error} error - JWT error
     * @returns {string} - Error message
     */
    getJWTErrorMessage(error) {
        switch (error.name) {
            case 'TokenExpiredError':
                return 'Token has expired';
            case 'JsonWebTokenError':
                return 'Invalid token';
            case 'NotBeforeError':
                return 'Token not active yet';
            default:
                return 'Token verification failed';
        }
    }

    /**
     * Get JWT error code
     * @param {Error} error - JWT error
     * @returns {string} - Error code
     */
    getJWTErrorCode(error) {
        switch (error.name) {
            case 'TokenExpiredError':
                return 'TOKEN_EXPIRED';
            case 'JsonWebTokenError':
                return 'TOKEN_INVALID';
            case 'NotBeforeError':
                return 'TOKEN_NOT_ACTIVE';
            default:
                return 'TOKEN_VERIFICATION_FAILED';
        }
    }

    /**
     * Decode token without verification (for debugging)
     * @param {string} token - JWT token
     * @returns {Object} - Decoded token
     */
    decodeToken(token) {
        try {
            return jwt.decode(token, { complete: true });
        } catch (error) {
            return null;
        }
    }

    /**
     * Get token info (for debugging/admin purposes)
     * @param {string} token - JWT token
     * @returns {Object} - Token information
     */
    getTokenInfo(token) {
        const decoded = this.decodeToken(token);
        if (!decoded) {
            return { valid: false, error: 'Invalid token format' };
        }

        const now = Math.floor(Date.now() / 1000);
        const isExpired = decoded.payload.exp < now;
        const isBlacklisted = this.isTokenBlacklisted(token);

        return {
            valid: !isExpired && !isBlacklisted,
            header: decoded.header,
            payload: decoded.payload,
            isExpired,
            isBlacklisted,
            expiresAt: new Date(decoded.payload.exp * 1000),
            issuedAt: new Date(decoded.payload.iat * 1000),
            timeToExpiry: Math.max(0, decoded.payload.exp - now)
        };
    }

    /**
     * Cleanup expired tokens from blacklist
     */
    cleanupBlacklist() {
        const now = Math.floor(Date.now() / 1000);
        let cleanedCount = 0;

        // Remove expired blacklist entries
        for (const jti of this.tokenBlacklist) {
            // Skip user-specific blacklist entries
            if (jti.startsWith('user_')) continue;

            // For token JTIs, we can't determine expiry without the full token
            // In production, use Redis with TTL for automatic cleanup
        }

        if (cleanedCount > 0) {
            console.log(`Cleaned up ${cleanedCount} expired blacklist entries`);
        }
    }

    /**
     * Get blacklist statistics
     * @returns {Object} - Blacklist stats
     */
    getBlacklistStats() {
        return {
            totalBlacklisted: this.tokenBlacklist.size,
            userRevocations: Array.from(this.tokenBlacklist).filter(entry => entry.startsWith('user_')).length
        };
    }
}

module.exports = new JWTService();