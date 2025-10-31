const rateLimit = require('express-rate-limit');
const securityService = require('../services/securityService');

// Rate limiter for OTP requests
const otpRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 OTP requests per windowMs
    message: {
        success: false,
        message: 'Too many OTP requests from this IP. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    keyGenerator: (req) => {
        // Use IP + email combination for more granular rate limiting
        const email = req.body.email || req.query.email || '';
        return `${req.ip}-${email}`;
    },
    skip: (req) => {
        // Skip rate limiting for admin users in development
        if (process.env.NODE_ENV === 'development' && req.user?.role === 'system_admin') {
            return true;
        }
        return false;
    }
});

// Rate limiter for authentication endpoints (login, register)
const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 auth requests per windowMs
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const email = req.body.email || '';
        return `${req.ip}-${email}`;
    }
});

// Strict rate limiter for password reset requests
const passwordResetRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: {
        success: false,
        message: 'Too many password reset requests. Please try again in an hour.',
        code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const email = req.body.email || '';
        return `password-reset-${req.ip}-${email}`;
    }
});

// General API rate limiter
const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again later.',
        code: 'GENERAL_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip for authenticated admin users
        if (req.user?.role === 'system_admin') {
            return true;
        }
        return false;
    }
});

// Rate limiter for geocoding API endpoints
const geocodingRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // Limit each IP to 30 geocoding requests per minute
    message: {
        success: false,
        message: 'Too many geocoding requests. Please try again in a minute.',
        code: 'GEOCODING_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use IP for rate limiting
        return req.ip;
    },
    skip: (req) => {
        // Skip for authenticated admin users
        if (req.user?.role === 'system_admin') {
            return true;
        }
        return false;
    }
});

// Rate limiter for issue submission
const issueSubmissionRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 issue submissions per hour
    message: {
        success: false,
        message: 'Too many issue submissions. Please try again in an hour.',
        code: 'ISSUE_SUBMISSION_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Use IP + user ID combination for authenticated users
        const userId = req.user?.userId || '';
        return `issue-${req.ip}-${userId}`;
    }
});

// Failed login attempt tracking
const loginAttemptTracker = new Map();

const trackFailedLogin = (email, ip) => {
    const key = `${ip}-${email}`;
    const attempts = loginAttemptTracker.get(key) || { count: 0, lastAttempt: Date.now() };
    
    // Reset counter if last attempt was more than 1 hour ago
    if (Date.now() - attempts.lastAttempt > 60 * 60 * 1000) {
        attempts.count = 0;
    }
    
    attempts.count += 1;
    attempts.lastAttempt = Date.now();
    loginAttemptTracker.set(key, attempts);
    
    return attempts.count;
};

const checkFailedLoginAttempts = (req, res, next) => {
    const email = req.body.email;
    const ip = req.ip;
    
    if (!email) {
        return next();
    }
    
    const key = `${ip}-${email}`;
    const attempts = loginAttemptTracker.get(key);
    
    if (attempts && attempts.count >= 5) {
        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
        const lockoutTime = 60 * 60 * 1000; // 1 hour
        
        if (timeSinceLastAttempt < lockoutTime) {
            const remainingTime = Math.ceil((lockoutTime - timeSinceLastAttempt) / (60 * 1000));
            return res.status(429).json({
                success: false,
                message: `Account temporarily locked due to too many failed login attempts. Try again in ${remainingTime} minutes.`,
                code: 'ACCOUNT_LOCKED',
                lockoutTime: remainingTime
            });
        } else {
            // Reset attempts after lockout period
            loginAttemptTracker.delete(key);
        }
    }
    
    next();
};

const clearFailedLoginAttempts = (email, ip) => {
    const key = `${ip}-${email}`;
    loginAttemptTracker.delete(key);
};

// Enhanced abuse prevention tracking
const suspiciousActivityTracker = new Map();
const ipBlocklist = new Set();

/**
 * Advanced suspicious activity detection
 */
const detectSuspiciousActivity = (req, res, next) => {
    const ip = req.ip;
    const userAgent = req.get('User-Agent') || '';
    const now = Date.now();
    
    // Initialize tracking for this IP
    if (!suspiciousActivityTracker.has(ip)) {
        suspiciousActivityTracker.set(ip, {
            requests: [],
            patterns: new Set(),
            score: 0,
            lastActivity: now
        });
    }
    
    const activity = suspiciousActivityTracker.get(ip);
    
    // Clean old requests (keep last hour)
    activity.requests = activity.requests.filter(req => now - req.timestamp < 60 * 60 * 1000);
    
    // Add current request
    activity.requests.push({
        timestamp: now,
        path: req.path,
        method: req.method,
        userAgent: userAgent
    });
    
    activity.lastActivity = now;
    
    // Detect suspicious patterns
    let suspiciousScore = 0;
    
    // 1. High request frequency
    const recentRequests = activity.requests.filter(req => now - req.timestamp < 5 * 60 * 1000);
    if (recentRequests.length > 50) {
        suspiciousScore += 30;
        activity.patterns.add('HIGH_FREQUENCY');
    }
    
    // 2. Multiple user agents from same IP
    const userAgents = new Set(activity.requests.map(req => req.userAgent));
    if (userAgents.size > 5) {
        suspiciousScore += 20;
        activity.patterns.add('MULTIPLE_USER_AGENTS');
    }
    
    // 3. Bot-like user agent
    const botPatterns = /bot|crawler|spider|scraper|curl|wget|python|java/i;
    if (botPatterns.test(userAgent)) {
        suspiciousScore += 15;
        activity.patterns.add('BOT_USER_AGENT');
    }
    
    // 4. Rapid sequential requests to auth endpoints
    const authRequests = activity.requests.filter(req => 
        req.path.includes('/auth/') && now - req.timestamp < 60 * 1000
    );
    if (authRequests.length > 10) {
        suspiciousScore += 25;
        activity.patterns.add('AUTH_FLOODING');
    }
    
    // 5. Missing or suspicious user agent
    if (!userAgent || userAgent.length < 10) {
        suspiciousScore += 10;
        activity.patterns.add('SUSPICIOUS_USER_AGENT');
    }
    
    activity.score = suspiciousScore;
    
    // Block if score is too high
    if (suspiciousScore >= 50) {
        ipBlocklist.add(ip);
        
        // Log security event
        securityService.logSecurityEvent(
            'SUSPICIOUS_ACTIVITY_DETECTED',
            null,
            null,
            ip,
            userAgent,
            {
                score: suspiciousScore,
                patterns: Array.from(activity.patterns),
                requestCount: activity.requests.length,
                timeWindow: '1 hour'
            }
        );
        
        return res.status(429).json({
            success: false,
            message: 'Suspicious activity detected. Access temporarily blocked.',
            code: 'SUSPICIOUS_ACTIVITY_BLOCKED'
        });
    }
    
    // Warn if score is moderate
    if (suspiciousScore >= 30) {
        securityService.logSecurityEvent(
            'SUSPICIOUS_ACTIVITY_WARNING',
            null,
            null,
            ip,
            userAgent,
            {
                score: suspiciousScore,
                patterns: Array.from(activity.patterns)
            }
        );
    }
    
    next();
};

/**
 * Check if IP is blocked
 */
const checkIPBlocklist = (req, res, next) => {
    const ip = req.ip;
    
    if (ipBlocklist.has(ip)) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. IP address is blocked.',
            code: 'IP_BLOCKED'
        });
    }
    
    next();
};

/**
 * Progressive delay for repeated failures
 */
const progressiveDelay = (req, res, next) => {
    const email = req.body.email;
    const ip = req.ip;
    
    if (!email) return next();
    
    const key = `${ip}-${email}`;
    const attempts = loginAttemptTracker.get(key);
    
    if (attempts && attempts.count > 3) {
        // Progressive delay: 2^(attempts-3) seconds, max 30 seconds
        const delaySeconds = Math.min(Math.pow(2, attempts.count - 3), 30);
        
        setTimeout(() => {
            next();
        }, delaySeconds * 1000);
        
        return;
    }
    
    next();
};

/**
 * CAPTCHA requirement for high-risk operations
 */
const requireCaptchaForHighRisk = (req, res, next) => {
    const ip = req.ip;
    const email = req.body.email;
    
    // Check if this IP/email combination has had multiple failures
    const key = `${ip}-${email}`;
    const attempts = loginAttemptTracker.get(key);
    
    if (attempts && attempts.count >= 3) {
        // In a real implementation, you would verify CAPTCHA here
        const captchaToken = req.body.captchaToken;
        
        if (!captchaToken) {
            return res.status(400).json({
                success: false,
                message: 'CAPTCHA verification required for security.',
                code: 'CAPTCHA_REQUIRED',
                requiresCaptcha: true
            });
        }
        
        // Here you would verify the CAPTCHA token with your CAPTCHA service
        // For now, we'll just log it
        securityService.logSecurityEvent(
            'CAPTCHA_REQUIRED',
            null,
            email,
            ip,
            req.get('User-Agent'),
            {
                attempts: attempts.count,
                endpoint: req.path
            }
        );
    }
    
    next();
};

// Cleanup old entries every hour
setInterval(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    // Cleanup login attempts
    for (const [key, attempts] of loginAttemptTracker.entries()) {
        if (now - attempts.lastAttempt > oneHour) {
            loginAttemptTracker.delete(key);
        }
    }
    
    // Cleanup suspicious activity (keep for 24 hours)
    for (const [ip, activity] of suspiciousActivityTracker.entries()) {
        if (now - activity.lastActivity > 24 * 60 * 60 * 1000) {
            suspiciousActivityTracker.delete(ip);
        }
    }
    
    // Remove IPs from blocklist after 24 hours
    const blockedIPs = Array.from(ipBlocklist);
    for (const ip of blockedIPs) {
        const activity = suspiciousActivityTracker.get(ip);
        if (!activity || now - activity.lastActivity > 24 * 60 * 60 * 1000) {
            ipBlocklist.delete(ip);
        }
    }
}, 60 * 60 * 1000);

module.exports = {
    otpRateLimit,
    authRateLimit,
    passwordResetRateLimit,
    generalRateLimit,
    geocodingLimiter: geocodingRateLimit,
    issueLimiter: issueSubmissionRateLimit,
    trackFailedLogin,
    checkFailedLoginAttempts,
    clearFailedLoginAttempts,
    detectSuspiciousActivity,
    checkIPBlocklist,
    progressiveDelay,
    requireCaptchaForHighRisk
};