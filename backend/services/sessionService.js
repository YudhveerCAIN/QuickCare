const Session = require('../models/Session');
const jwtService = require('./jwtService');
const crypto = require('crypto');

class SessionService {
    constructor() {
        // Cleanup expired sessions every hour
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 60 * 60 * 1000);
    }

    /**
     * Create new session with JWT tokens
     * @param {string} userId - User ID
     * @param {Object} userData - User data for token payload
     * @param {Object} deviceInfo - Device and request information
     * @returns {Promise<Object>} - Session and token data
     */
    async createSession(userId, userData, deviceInfo = {}) {
        try {
            // Check if user has too many active sessions
            const activeSessions = await Session.getUserActiveSessions(userId);
            const maxSessions = parseInt(process.env.MAX_SESSIONS_PER_USER) || 5;

            if (activeSessions.length >= maxSessions) {
                // Invalidate oldest session
                const oldestSession = activeSessions[activeSessions.length - 1];
                await oldestSession.invalidate('max_sessions_exceeded');
            }

            // Generate JWT token pair
            const tokenPair = jwtService.generateTokenPair(userId, userData.role, userData);
            
            // Create session record
            const sessionData = {
                accessToken: tokenPair.accessToken,
                refreshToken: tokenPair.refreshToken,
                tokenId: crypto.randomUUID()
            };

            const session = await Session.createSession(userId, sessionData, deviceInfo);

            console.log('Session created:', {
                sessionId: session._id,
                userId,
                deviceType: session.deviceInfo.deviceType,
                expiresAt: session.expiresAt
            });

            return {
                success: true,
                session: {
                    id: session._id,
                    tokenId: session.tokenId,
                    expiresAt: session.expiresAt,
                    deviceInfo: session.deviceInfo
                },
                tokens: {
                    accessToken: tokenPair.accessToken,
                    refreshToken: tokenPair.refreshToken,
                    expiresIn: tokenPair.expiresIn,
                    tokenType: tokenPair.tokenType
                }
            };

        } catch (error) {
            console.error('Error creating session:', error);
            throw new Error('Failed to create session');
        }
    }

    /**
     * Validate session and token
     * @param {string} token - Access token
     * @returns {Promise<Object>} - Validation result
     */
    async validateSession(token) {
        try {
            // Verify JWT token
            const tokenVerification = jwtService.verifyAccessToken(token);
            if (!tokenVerification.valid) {
                return {
                    valid: false,
                    error: tokenVerification.error,
                    code: tokenVerification.code
                };
            }

            // Find session in database and populate user
            const session = await Session.findByToken(token, 'access');
            if (!session) {
                return {
                    valid: false,
                    error: 'Session not found',
                    code: 'SESSION_NOT_FOUND'
                };
            }

            // Check session validity
            if (!session.isValid()) {
                return {
                    valid: false,
                    error: 'Session is invalid or expired',
                    code: 'SESSION_INVALID'
                };
            }

            // Populate the user data
            await session.populate('userId');
            const user = session.userId;

            if (!user) {
                return {
                    valid: false,
                    error: 'User not found',
                    code: 'USER_NOT_FOUND'
                };
            }

            // Update last activity
            await session.updateActivity();

            return {
                valid: true,
                session: session,
                user: user,
                tokenPayload: tokenVerification.payload
            };

        } catch (error) {
            console.error('Error validating session:', error);
            return {
                valid: false,
                error: 'Session validation failed',
                code: 'VALIDATION_ERROR'
            };
        }
    }

    /**
     * Refresh session tokens
     * @param {string} refreshToken - Refresh token
     * @param {Object} userData - Updated user data
     * @returns {Promise<Object>} - New tokens or error
     */
    async refreshSession(refreshToken, userData = {}) {
        try {
            // Find session by refresh token
            const session = await Session.findByToken(refreshToken, 'refresh');
            if (!session) {
                return {
                    success: false,
                    error: 'Session not found',
                    code: 'SESSION_NOT_FOUND'
                };
            }

            // Check if refresh token is expired
            if (session.isRefreshExpired()) {
                await session.invalidate('refresh_token_expired');
                return {
                    success: false,
                    error: 'Refresh token expired',
                    code: 'REFRESH_TOKEN_EXPIRED'
                };
            }

            // Generate new token pair
            const tokenRefresh = jwtService.refreshAccessToken(refreshToken, userData);
            if (!tokenRefresh.success) {
                return {
                    success: false,
                    error: tokenRefresh.error,
                    code: tokenRefresh.code
                };
            }

            // Update session with new tokens
            session.accessToken = tokenRefresh.accessToken;
            session.refreshToken = tokenRefresh.refreshToken;
            session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            session.lastActivity = new Date();
            await session.save();

            console.log('Session refreshed:', {
                sessionId: session._id,
                userId: session.userId
            });

            return {
                success: true,
                tokens: {
                    accessToken: tokenRefresh.accessToken,
                    refreshToken: tokenRefresh.refreshToken,
                    expiresIn: tokenRefresh.expiresIn,
                    tokenType: tokenRefresh.tokenType
                },
                session: {
                    id: session._id,
                    expiresAt: session.expiresAt
                }
            };

        } catch (error) {
            console.error('Error refreshing session:', error);
            return {
                success: false,
                error: 'Failed to refresh session',
                code: 'REFRESH_ERROR'
            };
        }
    }

    /**
     * Invalidate session (logout)
     * @param {string} token - Access or refresh token
     * @param {string} reason - Reason for invalidation
     * @returns {Promise<Object>} - Invalidation result
     */
    async invalidateSession(token, reason = 'logout') {
        try {
            // Try to find session by access token first, then refresh token
            let session = await Session.findByToken(token, 'access');
            if (!session) {
                session = await Session.findByToken(token, 'refresh');
            }

            if (!session) {
                return {
                    success: false,
                    error: 'Session not found',
                    code: 'SESSION_NOT_FOUND'
                };
            }

            // Invalidate session
            await session.invalidate(reason);

            // Blacklist tokens in JWT service
            jwtService.blacklistToken(session.accessToken);
            jwtService.blacklistToken(session.refreshToken);

            console.log('Session invalidated:', {
                sessionId: session._id,
                userId: session.userId,
                reason
            });

            return {
                success: true,
                message: 'Session invalidated successfully'
            };

        } catch (error) {
            console.error('Error invalidating session:', error);
            return {
                success: false,
                error: 'Failed to invalidate session',
                code: 'INVALIDATION_ERROR'
            };
        }
    }

    /**
     * Invalidate all user sessions
     * @param {string} userId - User ID
     * @param {string} reason - Reason for invalidation
     * @returns {Promise<Object>} - Invalidation result
     */
    async invalidateAllUserSessions(userId, reason = 'logout_all') {
        try {
            // Get all active sessions for user
            const activeSessions = await Session.getUserActiveSessions(userId);

            // Blacklist all tokens
            for (const session of activeSessions) {
                jwtService.blacklistToken(session.accessToken);
                jwtService.blacklistToken(session.refreshToken);
            }

            // Invalidate all sessions in database
            const result = await Session.invalidateUserSessions(userId, reason);

            console.log('All user sessions invalidated:', {
                userId,
                sessionsInvalidated: result.modifiedCount,
                reason
            });

            return {
                success: true,
                message: 'All sessions invalidated successfully',
                sessionsInvalidated: result.modifiedCount
            };

        } catch (error) {
            console.error('Error invalidating all user sessions:', error);
            return {
                success: false,
                error: 'Failed to invalidate all sessions',
                code: 'BULK_INVALIDATION_ERROR'
            };
        }
    }

    /**
     * Get user's active sessions
     * @param {string} userId - User ID
     * @returns {Promise<Array>} - Active sessions
     */
    async getUserSessions(userId) {
        try {
            const sessions = await Session.getUserActiveSessions(userId);
            
            return sessions.map(session => ({
                id: session._id,
                deviceInfo: session.deviceInfo,
                lastActivity: session.lastActivity,
                expiresAt: session.expiresAt,
                loginMethod: session.loginMethod,
                isCurrent: false, // This would be determined by comparing with current request
                securityFlags: session.securityFlags
            }));

        } catch (error) {
            console.error('Error getting user sessions:', error);
            throw new Error('Failed to get user sessions');
        }
    }

    /**
     * Mark session as suspicious
     * @param {string} sessionId - Session ID
     * @param {string} reason - Reason for marking suspicious
     * @returns {Promise<Object>} - Result
     */
    async markSessionSuspicious(sessionId, reason) {
        try {
            const session = await Session.findById(sessionId);
            if (!session) {
                return {
                    success: false,
                    error: 'Session not found'
                };
            }

            await session.markSuspicious(reason);

            console.log('Session marked as suspicious:', {
                sessionId,
                userId: session.userId,
                reason
            });

            return {
                success: true,
                message: 'Session marked as suspicious'
            };

        } catch (error) {
            console.error('Error marking session as suspicious:', error);
            return {
                success: false,
                error: 'Failed to mark session as suspicious'
            };
        }
    }

    /**
     * Cleanup expired sessions
     * @returns {Promise<Object>} - Cleanup result
     */
    async cleanupExpiredSessions() {
        try {
            const result = await Session.cleanupExpired();

            if (result.deletedCount > 0) {
                console.log(`Cleaned up ${result.deletedCount} expired sessions`);
            }

            return {
                success: true,
                deletedCount: result.deletedCount
            };

        } catch (error) {
            console.error('Error cleaning up expired sessions:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get session statistics
     * @returns {Promise<Object>} - Session statistics
     */
    async getSessionStats() {
        try {
            const stats = await Session.getSessionStats();
            const jwtStats = jwtService.getBlacklistStats();

            return {
                ...stats,
                blacklistedTokens: jwtStats.totalBlacklisted,
                userRevocations: jwtStats.userRevocations
            };

        } catch (error) {
            console.error('Error getting session stats:', error);
            throw new Error('Failed to get session statistics');
        }
    }

    /**
     * Detect device information from request
     * @param {Object} req - Express request object
     * @returns {Object} - Device information
     */
    detectDeviceInfo(req) {
        const userAgent = req.get('User-Agent') || 'Unknown';
        const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';

        return {
            userAgent,
            ipAddress,
            deviceType: Session.detectDeviceType(userAgent),
            browser: Session.detectBrowser(userAgent),
            os: Session.detectOS(userAgent),
            // Location would be determined by IP geolocation service
            location: {
                country: 'Unknown',
                city: 'Unknown',
                region: 'Unknown'
            }
        };
    }
}

module.exports = new SessionService();