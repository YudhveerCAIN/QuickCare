const express = require('express');
const { auth } = require('../middlewares/authMiddleware');

const router = express.Router();

// Simple test route for now
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Performance routes working'
  });
});

// Get resolution metrics
router.get('/resolution-metrics',
  auth,
  async (req, res) => {
    try {
      // Check permissions
      if (!['Admin', 'Department'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
      }

      // Mock data for now
      const metrics = {
        averageResolutionTime: 48,
        totalResolved: 150,
        resolutionRate: 85.5,
        departmentBreakdown: [
          { department: 'Roads', avgTime: 36, resolved: 45 },
          { department: 'Water', avgTime: 52, resolved: 38 },
          { department: 'Electricity', avgTime: 44, resolved: 67 }
        ]
      };

      res.json({
        success: true,
        metrics
      });

    } catch (error) {
      console.error('Get resolution metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get resolution metrics'
      });
    }
  }
);

module.exports = router;