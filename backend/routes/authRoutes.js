const express = require("express");
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  refreshToken,
  logout,
  logoutAll,
  getSecurityEvents,
  logSecurityEvent,
  verifyEmailChange,
  getProfileCompletion,
  uploadProfileImage,
  deleteProfileImage,
  getUserSessions,
  invalidateSession,
  getSessionStats,
} = require("../controllers/authController");
const {
  sendOTP,
  verifyOTP,
  resendOTP,
  getOTPStatus,
  cleanupOTPs,
} = require("../controllers/otpController");
const {
  requestPasswordReset,
  verifyResetToken,
  resetPassword,
  getResetTokenStatus,
  getUserResetTokens,
  invalidateUserTokens,
  cleanupExpiredTokens,
} = require("../controllers/passwordResetController");
const {
  auth,
  adminAuth,
  refreshTokenAuth,
} = require("../middlewares/authMiddleware");
const {
  validateRegistration,
  validateLogin,
  validateObjectId,
  validateProfileUpdate,
  validateEmailChangeOTP,
  validatePasswordChange,
  sanitizeInput,
} = require("../middlewares/validationMiddleware");
const {
  roleMiddleware,
  permissionMiddleware,
  adminRoleAssignmentMiddleware,
} = require("../middlewares/roleMiddlerware");
// Import user management functions
const {
  getAllUsers: getAllUsersManagement,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser: deleteUserManagement,
  getUserStats,
  getRoles,
  bulkUserOperations,
} = require("../controllers/userManagementController");
const {
  otpRateLimit,
  authRateLimit,
  passwordResetRateLimit,
  checkFailedLoginAttempts,
  detectSuspiciousActivity,
  checkIPBlocklist,
  progressiveDelay,
  requireCaptchaForHighRisk,
} = require("../middlewares/rateLimitMiddleware");
const router = express.Router();
// Authentication routes with enhanced validation, sanitization, and abuse prevention
router.post(
  "/register",
  checkIPBlocklist,
  detectSuspiciousActivity,
  sanitizeInput,
  authRateLimit,
  validateRegistration,
  register
);
router.post(
  "/login",
  checkIPBlocklist,
  detectSuspiciousActivity,
  sanitizeInput,
  authRateLimit,
  progressiveDelay,
  checkFailedLoginAttempts,
  requireCaptchaForHighRisk,
  validateLogin,
  login
);
router.post("/refresh-token", checkIPBlocklist, refreshToken);
router.post("/logout", auth, logout);
router.post("/logout-all", auth, logoutAll);
router.get("/me", auth, getMe);
router.put(
  "/profile",
  auth,
  sanitizeInput,
  validateProfileUpdate,
  updateProfile
);
router.post(
  "/verify-email-change",
  auth,
  sanitizeInput,
  validateEmailChangeOTP,
  verifyEmailChange
);
router.get("/profile-completion", auth, getProfileCompletion);
router.post("/upload-profile-image", auth, sanitizeInput, uploadProfileImage);
router.delete("/profile-image", auth, deleteProfileImage);
router.put(
  "/change-password",
  auth,
  sanitizeInput,
  validatePasswordChange,
  changePassword
);

// OTP routes with abuse prevention
router.post(
  "/send-otp",
  checkIPBlocklist,
  detectSuspiciousActivity,
  otpRateLimit,
  sendOTP
);
router.post(
  "/verify-otp",
  checkIPBlocklist,
  detectSuspiciousActivity,
  otpRateLimit,
  verifyOTP
);
router.post(
  "/resend-otp",
  checkIPBlocklist,
  detectSuspiciousActivity,
  otpRateLimit,
  resendOTP
);
router.get("/otp-status", auth, getOTPStatus);
router.post("/cleanup-otps", auth, cleanupOTPs);

// Password reset routes with enhanced protection
router.post(
  "/forgot-password",
  checkIPBlocklist,
  detectSuspiciousActivity,
  passwordResetRateLimit,
  requestPasswordReset
);
router.get("/verify-reset-token/:token", checkIPBlocklist, verifyResetToken);
router.post(
  "/reset-password",
  checkIPBlocklist,
  detectSuspiciousActivity,
  resetPassword
);
router.get("/reset-token-status/:token", auth, getResetTokenStatus);
router.get("/user-reset-tokens/:userId", auth, getUserResetTokens);
router.post("/invalidate-user-tokens/:userId", auth, invalidateUserTokens);
router.post("/cleanup-reset-tokens", auth, cleanupExpiredTokens);

// Security events routes
router.get("/security-events", auth, getSecurityEvents);
router.post("/security-events", auth, logSecurityEvent);

// User management routes (admin only) - Task 5.2 Implementation
// GET /api/auth/users for user listing with pagination and filtering
router.get(
  "/users",
  auth,
  permissionMiddleware("canManageUsers"),
  getAllUsersManagement
);

// GET /api/auth/users/stats for user statistics
router.get(
  "/users/stats",
  auth,
  permissionMiddleware("canViewAnalytics"),
  getUserStats
);

// GET /api/auth/users/roles for available roles
router.get(
  "/users/roles",
  auth,
  permissionMiddleware("canManageUsers"),
  getRoles
);

// POST /api/auth/users/bulk for bulk user operations
router.post(
  "/users/bulk",
  auth,
  permissionMiddleware("canManageUsers"),
  bulkUserOperations
);

// GET /api/auth/users/:id for specific user details
router.get(
  "/users/:userId",
  auth,
  validateObjectId,
  permissionMiddleware("canManageUsers"),
  getUserById
);

// PUT /api/auth/users/:id/role for role updates with enhanced validation
router.put(
  "/users/:userId/role",
  auth,
  validateObjectId,
  adminRoleAssignmentMiddleware(),
  updateUserRole
);

// PUT /api/auth/users/:id/status for user activation/deactivation
router.put(
  "/users/:userId/status",
  auth,
  validateObjectId,
  permissionMiddleware("canManageUsers"),
  updateUserStatus
);

// DELETE /api/auth/users/:id for user deletion (system admin only)
router.delete(
  "/users/:userId",
  auth,
  validateObjectId,
  roleMiddleware("system_admin"),
  deleteUserManagement
);

// Session management routes
router.get("/sessions", auth, getUserSessions);
router.delete("/sessions/:sessionId", auth, invalidateSession);
router.get("/sessions/stats", auth, permissionMiddleware("canViewAnalytics"), getSessionStats);

// Security monitoring routes (admin only)
router.get("/security-events", adminAuth, getSecurityEvents);

module.exports = router;
