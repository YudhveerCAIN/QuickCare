const express = require('express');
const {
    getAllUsers,
    getUserById,
    updateUserRole,
    updateUserStatus,
    deleteUser,
    getUserStats,
    getRoles,
    bulkUserOperations
} = require('../controllers/userManagementController');

const { auth } = require('../middlewares/authMiddleware');
const { 
    roleMiddleware, 
    permissionMiddleware, 
    adminRoleAssignmentMiddleware,
    granularPermissionMiddleware 
} = require('../middlewares/roleMiddlerware');
const { validateObjectId } = require('../middlewares/validationMiddleware');

const router = express.Router();

// All routes require authentication and admin permissions
router.use(auth);

// Get user statistics (admin only)
router.get('/stats', permissionMiddleware('canViewAnalytics'), getUserStats);

// Get available roles (admin only)
router.get('/roles', permissionMiddleware('canManageUsers'), getRoles);

// Get all users with filtering and pagination (admin only)
router.get('/', permissionMiddleware('canManageUsers'), getAllUsers);

// Bulk user operations (admin only with granular permissions)
router.post('/bulk', granularPermissionMiddleware({
    permissions: ['canManageUsers', 'canViewAnalytics'],
    logic: 'AND'
}), bulkUserOperations);

// Get user by ID (admin only)
router.get('/:userId', validateObjectId, permissionMiddleware('canManageUsers'), getUserById);

// Update user role (admin only with role assignment validation)
router.put('/:userId/role', validateObjectId, adminRoleAssignmentMiddleware(), updateUserRole);

// Update user status (activate/deactivate) (admin only)
router.put('/:userId/status', validateObjectId, permissionMiddleware('canManageUsers'), updateUserStatus);

// Delete user (system admin only)
router.delete('/:userId', validateObjectId, roleMiddleware('system_admin'), deleteUser);

module.exports = router;