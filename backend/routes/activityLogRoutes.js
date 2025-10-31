const express = require('express');
const activityLogService = require('../services/activityLogService');
const { auth } = require('../middlewares/authMiddleware');

const router = express.Router();

// Get issue timeline/activity log
router.get('/issue/:issueId/timeline',
  auth,
  async (req, res) => {
    try {
      const { issueId } = req.params;
      const {
        visibility,
        limit = 50,
        skip = 0,
        startDate,
        endDate,
        actionTypes,
        performedBy
      } = req.query;

      // Determine visibility based on user role
      let visibilityFilter;
      if (req.user.role === 'Admin') {
        visibilityFilter = visibility ? visibility.split(',') : ['public', 'internal', 'admin_only'];
      } else if (['Department', 'Moderator'].includes(req.user.role)) {
        visibilityFilter = visibility ? visibility.split(',').filter(v => ['public', 'internal'].includes(v)) : ['public', 'internal'];
      } else {
        visibilityFilter = ['public'];
      }

      const options = {
        visibility: visibilityFilter,
        limit: parseInt(limit),
        skip: parseInt(skip),
        startDate,
        endDate,
        actionTypes: actionTypes ? actionTypes.split(',') : undefined,
        performedBy
      };

      const timeline = await activityLogService.getIssueTimeline(issueId, options);

      res.json({
        success: true,
        timeline,
        count: timeline.length
      });

    } catch (error) {
      console.error('Get issue timeline error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch issue timeline'
      });
    }
  }
);

// Get user activity history
router.get('/user/:userId/activity',
  auth,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const {
        limit = 50,
        skip = 0,
        startDate,
        endDate,
        actionTypes,
        issueId
      } = req.query;

      // Check permissions - users can only see their own activity unless admin
      if (req.user.role !== 'Admin' && req.user.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own activity.'
        });
      }

      const options = {
        limit: parseInt(limit),
        skip: parseInt(skip),
        startDate,
        endDate,
        actionTypes: actionTypes ? actionTypes.split(',') : undefined,
        issueId
      };

      const activities = await activityLogService.getUserActivity(userId, options);

      res.json({
        success: true,
        activities,
        count: activities.length
      });

    } catch (error) {
      console.error('Get user activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user activity'
      });
    }
  }
);

// Simple test route for now
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Activity log routes working'
  });
});

module.exports = router;