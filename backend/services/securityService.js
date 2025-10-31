const User = require("../models/User");

class SecurityService {
  constructor() {
    // In-memory storage for security events (in production, use database)
    this.securityEvents = [];
    this.loginAttempts = new Map();

    // Cleanup old events every hour
    setInterval(() => {
      this.cleanupOldEvents();
    }, 60 * 60 * 1000);
  }

  /**
   * Log security event
   * @param {string} type - Event type
   * @param {string} userId - User ID (optional)
   * @param {string} email - User email (optional)
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent
   * @param {Object} details - Additional details
   */
  logSecurityEvent(
    type,
    userId = null,
    email = null,
    ipAddress = null,
    userAgent = null,
    details = {}
  ) {
    const event = {
      id: Date.now() + Math.random(),
      type,
      userId,
      email,
      ipAddress,
      userAgent,
      details,
      timestamp: new Date(),
      severity: this.getEventSeverity(type),
    };

    this.securityEvents.push(event);

    // Log to console for monitoring
    console.log("Security Event:", {
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      email: event.email,
      ip: event.ipAddress,
      timestamp: event.timestamp,
    });

    // Alert on high severity events
    if (event.severity === "HIGH") {
      this.alertHighSeverityEvent(event);
    }

    return event.id;
  }

  /**
   * Track login attempt
   * @param {string} email - User email
   * @param {string} ipAddress - IP address
   * @param {boolean} success - Was login successful
   * @param {string} reason - Failure reason (if applicable)
   */
  trackLoginAttempt(email, ipAddress, success, reason = null) {
    const key = `${email}:${ipAddress}`;
    const now = Date.now();

    if (!this.loginAttempts.has(key)) {
      this.loginAttempts.set(key, {
        attempts: [],
        successCount: 0,
        failureCount: 0,
      });
    }

    const attempts = this.loginAttempts.get(key);
    attempts.attempts.push({
      timestamp: now,
      success,
      reason,
    });

    if (success) {
      attempts.successCount++;
      // Reset failure count on successful login
      attempts.failureCount = 0;

      this.logSecurityEvent("LOGIN_SUCCESS", null, email, ipAddress, null, {
        successCount: attempts.successCount,
      });
    } else {
      attempts.failureCount++;

      this.logSecurityEvent("LOGIN_FAILURE", null, email, ipAddress, null, {
        reason,
        failureCount: attempts.failureCount,
        consecutiveFailures: this.getConsecutiveFailures(attempts.attempts),
      });

      // Check for suspicious activity
      this.checkSuspiciousLoginActivity(email, ipAddress, attempts);
    }

    // Cleanup old attempts (keep only last 24 hours)
    attempts.attempts = attempts.attempts.filter(
      (attempt) => now - attempt.timestamp < 24 * 60 * 60 * 1000
    );
  }

  /**
   * Check for suspicious login activity
   * @param {string} email - User email
   * @param {string} ipAddress - IP address
   * @param {Object} attempts - Login attempts data
   */
  checkSuspiciousLoginActivity(email, ipAddress, attempts) {
    const recentFailures = this.getConsecutiveFailures(attempts.attempts);
    const last24Hours = attempts.attempts.filter(
      (attempt) => Date.now() - attempt.timestamp < 24 * 60 * 60 * 1000
    );

    // Alert on multiple consecutive failures
    if (recentFailures >= 5) {
      this.logSecurityEvent(
        "SUSPICIOUS_LOGIN_ACTIVITY",
        null,
        email,
        ipAddress,
        null,
        {
          consecutiveFailures: recentFailures,
          totalAttempts24h: last24Hours.length,
          pattern: "BRUTE_FORCE_SUSPECTED",
        }
      );
    }

    // Alert on high volume of attempts
    if (last24Hours.length >= 20) {
      this.logSecurityEvent(
        "HIGH_VOLUME_LOGIN_ATTEMPTS",
        null,
        email,
        ipAddress,
        null,
        {
          attempts24h: last24Hours.length,
          pattern: "AUTOMATED_ATTACK_SUSPECTED",
        }
      );
    }
  }

  /**
   * Get consecutive failures from attempts array
   * @param {Array} attempts - Login attempts
   * @returns {number} - Number of consecutive failures
   */
  getConsecutiveFailures(attempts) {
    let failures = 0;
    for (let i = attempts.length - 1; i >= 0; i--) {
      if (attempts[i].success) break;
      failures++;
    }
    return failures;
  }

  /**
   * Check if IP/email combination is temporarily locked
   * @param {string} email - User email
   * @param {string} ipAddress - IP address
   * @returns {Object} - Lock status
   */
  checkLoginLock(email, ipAddress) {
    const key = `${email}:${ipAddress}`;
    const attempts = this.loginAttempts.get(key);

    if (!attempts) {
      return { locked: false };
    }

    const consecutiveFailures = this.getConsecutiveFailures(attempts.attempts);
    const lastAttempt = attempts.attempts[attempts.attempts.length - 1];

    if (consecutiveFailures >= 5 && lastAttempt) {
      const lockDuration = Math.min(
        consecutiveFailures * 60 * 1000,
        60 * 60 * 1000
      ); // Max 1 hour
      const lockExpiry = lastAttempt.timestamp + lockDuration;

      if (Date.now() < lockExpiry) {
        return {
          locked: true,
          expiresAt: new Date(lockExpiry),
          remainingTime: lockExpiry - Date.now(),
          consecutiveFailures,
        };
      }
    }

    return { locked: false };
  }

  /**
   * Log password change event
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent
   */
  logPasswordChange(userId, email, ipAddress, userAgent) {
    this.logSecurityEvent(
      "PASSWORD_CHANGED",
      userId,
      email,
      ipAddress,
      userAgent,
      {
        action: "password_update",
      }
    );
  }

  /**
   * Log account lockout event
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string} reason - Lockout reason
   */
  logAccountLockout(userId, email, reason) {
    this.logSecurityEvent("ACCOUNT_LOCKED", userId, email, null, null, {
      reason,
      action: "account_lockout",
    });
  }

  /**
   * Get security events for user (admin function)
   * @param {string} userId - User ID
   * @param {number} limit - Number of events to return
   * @returns {Array} - Security events
   */
  getUserSecurityEvents(userId, limit = 50) {
    return this.securityEvents
      .filter((event) => event.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get recent security events (admin function)
   * @param {number} limit - Number of events to return
   * @param {string} severity - Filter by severity
   * @returns {Array} - Security events
   */
  getRecentSecurityEvents(limit = 100, severity = null) {
    let events = this.securityEvents;

    if (severity) {
      events = events.filter((event) => event.severity === severity);
    }

    return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  /**
   * Get event severity level
   * @param {string} type - Event type
   * @returns {string} - Severity level
   */
  getEventSeverity(type) {
    const severityMap = {
      LOGIN_SUCCESS: "LOW",
      LOGIN_FAILURE: "MEDIUM",
      SUSPICIOUS_LOGIN_ACTIVITY: "HIGH",
      HIGH_VOLUME_LOGIN_ATTEMPTS: "HIGH",
      PASSWORD_CHANGED: "MEDIUM",
      ACCOUNT_LOCKED: "HIGH",
      TOKEN_BLACKLISTED: "MEDIUM",
      UNAUTHORIZED_ACCESS_ATTEMPT: "HIGH",
      UNAUTHORIZED_ROLE_ASSIGNMENT_ATTEMPT: "HIGH",
      UNAUTHORIZED_RESOURCE_ACCESS: "HIGH",
      ROLE_CHANGED: "HIGH",
      ACCOUNT_ACTIVATED: "MEDIUM",
      ACCOUNT_DEACTIVATED: "HIGH",
      USER_DELETED: "HIGH",
      BULK_USER_OPERATION: "HIGH",
      PROFILE_UPDATED: "LOW",
      EMAIL_CHANGE_REQUESTED: "MEDIUM",
      EMAIL_CHANGED: "HIGH",
      PROFILE_IMAGE_UPDATED: "LOW",
      PROFILE_IMAGE_DELETED: "LOW",
      SUSPICIOUS_ACTIVITY_DETECTED: "HIGH",
      SUSPICIOUS_ACTIVITY_WARNING: "MEDIUM",
      CAPTCHA_REQUIRED: "MEDIUM",
    };

    return severityMap[type] || "MEDIUM";
  }

  /**
   * Alert on high severity events
   * @param {Object} event - Security event
   */
  alertHighSeverityEvent(event) {
    // In production, this would send alerts to security team
    console.warn("🚨 HIGH SEVERITY SECURITY EVENT:", {
      type: event.type,
      email: event.email,
      ip: event.ipAddress,
      details: event.details,
      timestamp: event.timestamp,
    });
  }

  /**
   * Cleanup old security events
   */
  cleanupOldEvents() {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
    const initialCount = this.securityEvents.length;

    this.securityEvents = this.securityEvents.filter(
      (event) => event.timestamp.getTime() > cutoff
    );

    const cleanedCount = initialCount - this.securityEvents.length;
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old security events`);
    }

    // Cleanup old login attempts
    for (const [key, attempts] of this.loginAttempts.entries()) {
      attempts.attempts = attempts.attempts.filter(
        (attempt) => Date.now() - attempt.timestamp < 24 * 60 * 60 * 1000
      );

      if (attempts.attempts.length === 0) {
        this.loginAttempts.delete(key);
      }
    }
  }

  /**
   * Get security statistics
   * @returns {Object} - Security stats
   */
  getSecurityStats() {
    const last24Hours = this.securityEvents.filter(
      (event) => Date.now() - event.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    const eventCounts = {};
    last24Hours.forEach((event) => {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    });

    return {
      totalEvents: this.securityEvents.length,
      events24h: last24Hours.length,
      eventTypes: eventCounts,
      activeLoginAttempts: this.loginAttempts.size,
      highSeverityEvents: this.securityEvents.filter(
        (e) => e.severity === "HIGH"
      ).length,
    };
  }
}

module.exports = new SecurityService();
