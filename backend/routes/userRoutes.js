const express = require('express');
const router = express.Router();
const {auth} = require('../middlewares/authMiddleware');
const { roleMiddleware, permissionMiddleware, roleHierarchyMiddleware } = require('../middlewares/roleMiddlerware');
const {
    createUser,
    getAllUsers,
    getUserById,
    updateUserRole,
    deleteUser,
    getUsersByDepartment,
    getUserStats,
    toggleUserStatus,
    getUserAssignedIssues,
    getUserReportedIssues
} = require('../controllers/userController');

// Create user with specific role (admin/system_admin only)
router.post('/', 
    auth, 
    roleMiddleware('admin', 'system_admin'), 
    createUser
);

// Get all users (admin/system_admin only)
router.get('/', 
    auth, 
    roleMiddleware('admin', 'system_admin'), 
    getAllUsers
);

// Get user statistics (admin/system_admin only)
router.get('/stats', 
    auth, 
    roleMiddleware('admin', 'system_admin'), 
    getUserStats
);

// Get users by department (admin/system_admin only)
router.get('/department/:department', 
    auth, 
    roleMiddleware('admin', 'system_admin'), 
    getUsersByDepartment
);

// Get user by ID
router.get('/:id', 
    auth, 
    getUserById
);

// Update user role and permissions (admin/system_admin only)
router.put('/:id/role', 
    auth, 
    roleMiddleware('admin', 'system_admin'), 
    updateUserRole
);

// Toggle user status (admin/system_admin only)
router.put('/:id/status', 
    auth, 
    roleMiddleware('admin', 'system_admin'), 
    toggleUserStatus
);

// Delete user (admin/system_admin only)
router.delete('/:id', 
    auth, 
    roleMiddleware('admin', 'system_admin'), 
    deleteUser
);

// Get user's assigned issues
router.get('/:id/assigned-issues', 
    auth, 
    getUserAssignedIssues
);

// Get user's reported issues
router.get('/:id/reported-issues', 
    auth, 
    getUserReportedIssues
);

module.exports = router;
