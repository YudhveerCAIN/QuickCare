const express = require("express");
const {
  getDashboardStats,
  getRecentActivity,
  getCommunityOverview
} = require("../controllers/dashboardController");
const { auth } = require("../middlewares/authMiddleware");

const router = express.Router();

// All dashboard routes require authentication
router.use(auth);

// GET /api/dashboard/stats - Get user's dashboard statistics
router.get("/stats", getDashboardStats);

// GET /api/dashboard/activity - Get user's recent activity
router.get("/activity", getRecentActivity);

// GET /api/dashboard/community - Get community overview
router.get("/community", getCommunityOverview);

module.exports = router;