const OTP = require("../models/OTP");
const emailService = require("./emailService");
const crypto = require("crypto");

class OTPService {
  constructor() {
    // Cleanup expired OTPs every 10 minutes
    setInterval(() => {
      this.cleanupExpiredOTPs();
    }, 10 * 60 * 1000);
  }

  /**
   * Generate and send OTP to email
   * @param {string} email - User email address
   * @param {string} type - OTP type (registration, password_reset, email_change)
   * @param {string} userId - User ID (optional, for non-registration OTPs)
   * @returns {Promise<Object>} - Result object with success status
   */
  async generateAndSendOTP(email, type = "registration", userId = null) {
    try {
      // Check rate limiting - max 3 OTPs per email per 15 minutes
      const recentOTPs = await OTP.countDocuments({
        email,
        type,
        createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
      });

      if (recentOTPs >= 3) {
        throw new Error(
          "Too many OTP requests. Please wait 15 minutes before requesting again."
        );
      }

      // Invalidate any existing unused OTPs for this email and type
      await OTP.updateMany({ email, type, isUsed: false }, { isUsed: true });

      // Generate new OTP
      const otpCode = this.generateSecureOTP();

      // Create OTP document
      const otpDoc = new OTP({
        email,
        otp: otpCode,
        type,
        userId: userId || undefined,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      });

      await otpDoc.save();

      // Send OTP via email
      const emailResult = await emailService.sendOTPEmail(email, otpCode, type);

      console.log("OTP generated and sent:", {
        email,
        type,
        otpId: otpDoc._id,
        expiresAt: otpDoc.expiresAt,
      });

      return {
        success: true,
        message: "OTP sent successfully",
        otpId: otpDoc._id,
        expiresAt: otpDoc.expiresAt,
        emailPreview: emailResult.previewUrl, // For development
      };
    } catch (error) {
      console.error("Error generating and sending OTP:", error);
      throw error;
    }
  }

  /**
   * Verify OTP
   * @param {string} email - User email address
   * @param {string} otp - OTP code to verify
   * @param {string} type - OTP type
   * @returns {Promise<Object>} - Verification result
   */
  async verifyOTP(email, otp, type = "registration") {
    try {
      // Find the OTP document
      const otpDoc = await OTP.findOne({
        email,
        type,
        isUsed: false,
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 }); // Get the most recent one

      if (!otpDoc) {
        return {
          success: false,
          message: "Invalid or expired OTP",
          code: "OTP_INVALID",
        };
      }

      // Check if maximum attempts reached
      if (otpDoc.attempts >= 3) {
        return {
          success: false,
          message: "Maximum verification attempts exceeded",
          code: "MAX_ATTEMPTS_REACHED",
        };
      }

      // Increment attempts
      await otpDoc.incrementAttempts();

      // Verify OTP
      if (otpDoc.otp !== otp) {
        const remainingAttempts = 3 - otpDoc.attempts;
        return {
          success: false,
          message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
          code: "OTP_MISMATCH",
          remainingAttempts,
        };
      }

      // Mark OTP as used
      await otpDoc.markAsUsed();

      console.log("OTP verified successfully:", {
        email,
        type,
        otpId: otpDoc._id,
      });

      return {
        success: true,
        message: "OTP verified successfully",
        otpId: otpDoc._id,
        userId: otpDoc.userId,
      };
    } catch (error) {
      console.error("Error verifying OTP:", error);
      throw new Error("Failed to verify OTP");
    }
  }

  /**
   * Generate cryptographically secure 6-digit OTP
   * @returns {string} - 6-digit OTP
   */
  generateSecureOTP() {
    // Use crypto.randomInt for cryptographically secure random numbers
    const otp = crypto.randomInt(100000, 999999);
    return otp.toString();
  }

  /**
   * Check if user can request new OTP (rate limiting)
   * @param {string} email - User email address
   * @param {string} type - OTP type
   * @returns {Promise<Object>} - Rate limit status
   */
  async checkRateLimit(email, type = "registration") {
    try {
      const recentOTPs = await OTP.countDocuments({
        email,
        type,
        createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
      });

      const canRequest = recentOTPs < 3;
      const waitTime = canRequest ? 0 : 15 * 60 * 1000; // 15 minutes in ms

      return {
        canRequest,
        requestsUsed: recentOTPs,
        maxRequests: 3,
        waitTime,
        nextRequestAt: canRequest ? null : new Date(Date.now() + waitTime),
      };
    } catch (error) {
      console.error("Error checking rate limit:", error);
      throw new Error("Failed to check rate limit");
    }
  }

  /**
   * Get OTP status for debugging/admin purposes
   * @param {string} email - User email address
   * @param {string} type - OTP type
   * @returns {Promise<Object>} - OTP status
   */
  async getOTPStatus(email, type = "registration") {
    try {
      const otpDoc = await OTP.findOne({
        email,
        type,
        isUsed: false,
      }).sort({ createdAt: -1 });

      if (!otpDoc) {
        return {
          exists: false,
          message: "No active OTP found",
        };
      }

      return {
        exists: true,
        isExpired: otpDoc.isExpired(),
        attempts: otpDoc.attempts,
        maxAttempts: 3,
        expiresAt: otpDoc.expiresAt,
        canBeUsed: otpDoc.canBeUsed(),
      };
    } catch (error) {
      console.error("Error getting OTP status:", error);
      throw new Error("Failed to get OTP status");
    }
  }

  /**
   * Cleanup expired OTPs from database
   * @returns {Promise<Object>} - Cleanup result
   */
  async cleanupExpiredOTPs() {
    try {
      const result = await OTP.cleanupExpired();

      if (result.deletedCount > 0) {
        console.log(`Cleaned up ${result.deletedCount} expired OTPs`);
      }

      return {
        success: true,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      console.error("Error cleaning up expired OTPs:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Resend OTP (with rate limiting)
   * @param {string} email - User email address
   * @param {string} type - OTP type
   * @param {string} userId - User ID (optional)
   * @returns {Promise<Object>} - Resend result
   */
  async resendOTP(email, type = "registration", userId = null) {
    try {
      // Check rate limiting
      const rateLimit = await this.checkRateLimit(email, type);

      if (!rateLimit.canRequest) {
        const waitMinutes = Math.ceil(rateLimit.waitTime / (60 * 1000));
        throw new Error(
          `Please wait ${waitMinutes} minutes before requesting another OTP`
        );
      }

      // Generate and send new OTP
      return await this.generateAndSendOTP(email, type, userId);
    } catch (error) {
      console.error("Error resending OTP:", error);
      throw error;
    }
  }

  /**
   * Invalidate all OTPs for a user (useful for security purposes)
   * @param {string} email - User email address
   * @param {string} type - OTP type (optional, if not provided, invalidates all types)
   * @returns {Promise<Object>} - Invalidation result
   */
  async invalidateOTPs(email, type = null) {
    try {
      const query = { email, isUsed: false };
      if (type) {
        query.type = type;
      }

      const result = await OTP.updateMany(query, { isUsed: true });

      console.log("OTPs invalidated:", {
        email,
        type,
        modifiedCount: result.modifiedCount,
      });

      return {
        success: true,
        invalidatedCount: result.modifiedCount,
      };
    } catch (error) {
      console.error("Error invalidating OTPs:", error);
      throw new Error("Failed to invalidate OTPs");
    }
  }
}

module.exports = new OTPService();
