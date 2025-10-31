const express = require('express');
const {
  getMyAssignments,
  getDepartmentAssignments,
  acceptAssignment,
  startWork,
  completeAssignment,
  transferAssignment,
  escalateAssignment,
  getOverdueAssignments,
  getAssignmentStats,
  getAssignmentById,
  getAssignmentActivity
} = require('../controllers/assignmentController');
const { auth: authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// Simple test route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Assignment routes working'
  });
});

// Create a simple permission middleware for now
const permissionMiddleware = (permission) => {
  return (req, res, next) => {
    // For now, just check if user is admin or has the role
    if (req.user && (req.user.role === 'Admin' || req.user.role === 'Department')) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
  };
};

// Create a simple validation middleware for ObjectId
const validateObjectId = (req, res, next) => {
  const { id, departmentId } = req.params;
  const idToValidate = id || departmentId;
  
  if (idToValidate && idToValidate.length === 24) {
    next();
  } else {
    res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
};

// User assignment routes
router.get('/my-assignments', authMiddleware, getMyAssignments);

// Department assignment routes
router.get('/department/:departmentId', 
  authMiddleware, 
  permissionMiddleware('canAssignIssues'),
  validateObjectId,
  getDepartmentAssignments
);

// Assignment management routes
router.get('/overdue', 
  authMiddleware, 
  permissionMiddleware('canAssignIssues'),
  getOverdueAssignments
);

router.get('/stats', 
  authMiddleware, 
  permissionMiddleware('canViewAnalytics'),
  getAssignmentStats
);

// Individual assignment routes
router.get('/:id', 
  authMiddleware, 
  validateObjectId,
  getAssignmentById
);

router.get('/:id/activity', 
  authMiddleware, 
  validateObjectId,
  getAssignmentActivity
);

// Assignment action routes
router.post('/:id/accept', 
  authMiddleware, 
  validateObjectId,
  acceptAssignment
);

router.post('/:id/start', 
  authMiddleware, 
  validateObjectId,
  startWork
);

router.post('/:id/complete', 
  authMiddleware, 
  validateObjectId,
  completeAssignment
);

router.post('/:id/transfer', 
  authMiddleware, 
  permissionMiddleware('canAssignIssues'),
  validateObjectId,
  transferAssignment
);

router.post('/:id/escalate', 
  authMiddleware, 
  validateObjectId,
  escalateAssignment
);

module.exports = router;