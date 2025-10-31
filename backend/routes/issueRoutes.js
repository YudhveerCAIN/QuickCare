const express = require("express");
const {
  createIssue,
  getIssues,
  getIssueById,
  updateIssue,
  deleteIssue,
  assignIssue,
  updateIssueStatus,
  getMyIssues,
  getAssignedIssues,
  moderateIssue,
  createBulkOperation,
  getIssueTimeline,
  getIssueAssignments,
} = require("../controllers/issueController");
const { auth } = require("../middlewares/authMiddleware");
const { roleMiddleware } = require("../middlewares/roleMiddlerware");
const { upload, uploadToCloudinary } = require("../middlewares/uploadMiddleware");
const {
  validateIssue,
  validateObjectId,
} = require("../middlewares/validationMiddleware");
const router = express.Router();
router.use("/:issueId/comments", require("./commentRoutes"));
router
  .route("/")
  .post(auth, upload.array("image", 5), uploadToCloudinary, validateIssue, createIssue)
  .get(getIssues);

// User-specific routes
router.get("/my-issues", auth, getMyIssues);
router.get("/assigned-issues", auth, getAssignedIssues);

// Categories route
router.get("/categories/list", (req, res) => {
  res.json({
    success: true,
    categories: []
  });
});

// Test auth endpoint
router.get("/test-auth", auth, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working',
    user: {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    }
  });
});

router
  .route("/:id")
  .get(validateObjectId, getIssueById)
  .patch(auth, roleMiddleware("admin"), validateObjectId, updateIssue)
  .delete(auth, roleMiddleware("admin"), validateObjectId, deleteIssue);

// Issue management routes
router.patch(
  "/:id/assign",
  auth,
  roleMiddleware("admin", "system_admin"),
  validateObjectId,
  assignIssue
);
router.patch("/:id/status", auth, validateObjectId, updateIssueStatus);
router.patch(
  "/:id/moderate",
  auth,
  roleMiddleware("moderator", "admin", "system_admin"),
  validateObjectId,
  moderateIssue
);

// New enhanced routes
router.get("/:id/timeline", auth, validateObjectId, getIssueTimeline);
router.get("/:id/assignments", auth, validateObjectId, getIssueAssignments);

// Bulk operations
router.post(
  "/bulk-operations",
  auth,
  roleMiddleware("admin", "system_admin"),
  createBulkOperation
);
module.exports = router;
