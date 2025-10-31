const express = require('express');
const {
  issuesByCategory,
  issuesByLocation,
  monthlyTrends,
  dashboardStats,
  resolutionMetrics,
  heatmapData,
  engagementMetrics,
  exportReport
} = require('../controllers/reportController');
const { auth } = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddlerware');
const router = express.Router();

// Existing routes
router.get('/issues-by-category', auth, roleMiddleware('admin'), issuesByCategory);
router.get('/issues-by-location', auth, roleMiddleware('admin'), issuesByLocation);
router.get('/monthly-trends', auth, roleMiddleware('admin'), monthlyTrends);

// New analytics routes
router.get('/dashboard-stats', auth, roleMiddleware('admin'), dashboardStats);
router.get('/resolution-metrics', auth, roleMiddleware('admin'), resolutionMetrics);
router.get('/heatmap-data', auth, roleMiddleware('admin'), heatmapData);
router.get('/engagement-metrics', auth, roleMiddleware('admin'), engagementMetrics);
router.get('/export/:format', auth, roleMiddleware('admin'), exportReport);

module.exports = router;
