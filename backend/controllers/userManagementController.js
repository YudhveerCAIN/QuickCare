const User = require('../models/User');
const securityService = require('../services/securityService');
const jwtService = require('../services/jwtService');
const { canAssignRole, getAllRoles, getRoleInfo } = require('../middlewares/roleMiddlerware');

/**
 * Get all users with pagination and filtering
 * @route GET /api/admin/users
 * @access Private (Admin only)
 */
exports.getAllUsers = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            role,
            department,
            isActive,
            isVerified,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build filter object
        const filter = {};
        
        if (role) filter.role = role;
        if (department) filter.department = department;
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
        
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { contact: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Execute query
        const [users, totalUsers] = await Promise.all([
            User.find(filter)
                .select('-password')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('assignedIssues', 'title status priority')
                .populate('reportedIssues', 'title status priority'),
            User.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalUsers / parseInt(limit));

        res.json({
            success: true,
            users,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalUsers,
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1
            },
            filters: {
                role,
                department,
                isActive,
                isVerified,
                search
            }
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
};

/**
 * Get user by ID
 * @route GET /api/admin/users/:userId
 * @access Private (Admin only)
 */
exports.getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId)
            .select('-password')
            .populate('assignedIssues', 'title status priority createdAt')
            .populate('reportedIssues', 'title status priority createdAt');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's security events (last 50)
        const securityEvents = securityService.getUserSecurityEvents(userId, 50);

        res.json({
            success: true,
            user,
            securityEvents,
            roleInfo: getRoleInfo(user.role)
        });

    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user'
        });
    }
};

/**
 * Update user role
 * @route PUT /api/admin/users/:userId/role
 * @access Private (Admin only)
 */
exports.updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role, department, employeeId } = req.body;

        // Validate role
        if (!role || !getAllRoles()[role]) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role specified'
            });
        }

        // Check if current user can assign this role
        if (!canAssignRole(req.user.role, role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to assign this role',
                code: 'ROLE_ASSIGNMENT_DENIED'
            });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent self-role modification for system_admin
        if (userId === req.user._id.toString() && req.user.role === 'system_admin') {
            return res.status(400).json({
                success: false,
                message: 'System administrators cannot modify their own role'
            });
        }

        // Validate required fields for specific roles
        if (['department_officer', 'admin'].includes(role) && !department) {
            return res.status(400).json({
                success: false,
                message: 'Department is required for this role'
            });
        }

        if (['department_officer', 'admin', 'moderator', 'system_admin'].includes(role) && !employeeId) {
            return res.status(400).json({
                success: false,
                message: 'Employee ID is required for this role'
            });
        }

        const oldRole = user.role;

        // Update user role and related fields
        user.role = role;
        if (department) user.department = department;
        if (employeeId) user.employeeId = employeeId;

        await user.save();

        // Log role change
        securityService.logSecurityEvent(
            'ROLE_CHANGED',
            user._id,
            user.email,
            req.ip,
            req.get('User-Agent'),
            {
                oldRole,
                newRole: role,
                changedBy: req.user._id,
                changedByEmail: req.user.email,
                department,
                employeeId
            }
        );

        // Invalidate all user tokens to force re-authentication with new role
        jwtService.blacklistUserTokens(user._id);

        res.json({
            success: true,
            message: 'User role updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                employeeId: user.employeeId,
                permissions: user.permissions
            },
            roleInfo: getRoleInfo(role)
        });

    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user role'
        });
    }
};

/**
 * Activate/Deactivate user account
 * @route PUT /api/admin/users/:userId/status
 * @access Private (Admin only)
 */
exports.updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive, reason } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isActive must be a boolean value'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent self-deactivation
        if (userId === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot modify your own account status'
            });
        }

        // Prevent deactivating other system admins (unless you're also a system admin)
        if (user.role === 'system_admin' && req.user.role !== 'system_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only system administrators can modify other system administrator accounts'
            });
        }

        const oldStatus = user.isActive;
        user.isActive = isActive;
        await user.save();

        // Log status change
        securityService.logSecurityEvent(
            isActive ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
            user._id,
            user.email,
            req.ip,
            req.get('User-Agent'),
            {
                oldStatus,
                newStatus: isActive,
                reason,
                changedBy: req.user._id,
                changedByEmail: req.user.email
            }
        );

        // If deactivating, blacklist all user tokens
        if (!isActive) {
            jwtService.blacklistUserTokens(user._id);
        }

        res.json({
            success: true,
            message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isActive: user.isActive,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user status'
        });
    }
};

/**
 * Delete user account
 * @route DELETE /api/admin/users/:userId
 * @access Private (System Admin only)
 */
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason, transferIssuesTo } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent self-deletion
        if (userId === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        // Only system admins can delete other admins
        if (['admin', 'system_admin'].includes(user.role) && req.user.role !== 'system_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only system administrators can delete administrator accounts'
            });
        }

        // Handle issue transfer if specified
        if (transferIssuesTo) {
            const transferUser = await User.findById(transferIssuesTo);
            if (!transferUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Transfer target user not found'
                });
            }

            // Transfer assigned issues
            await User.updateMany(
                { assignedIssues: userId },
                { $pull: { assignedIssues: userId }, $push: { assignedIssues: transferIssuesTo } }
            );
        }

        // Log user deletion
        securityService.logSecurityEvent(
            'USER_DELETED',
            user._id,
            user.email,
            req.ip,
            req.get('User-Agent'),
            {
                deletedUser: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                reason,
                transferIssuesTo,
                deletedBy: req.user._id,
                deletedByEmail: req.user.email
            }
        );

        // Blacklist all user tokens
        jwtService.blacklistUserTokens(user._id);

        // Delete user
        await User.findByIdAndDelete(userId);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user'
        });
    }
};

/**
 * Get user statistics
 * @route GET /api/admin/users/stats
 * @access Private (Admin only)
 */
exports.getUserStats = async (req, res) => {
    try {
        const [
            totalUsers,
            activeUsers,
            verifiedUsers,
            roleStats,
            recentRegistrations
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isActive: true }),
            User.countDocuments({ isVerified: true }),
            User.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            User.find()
                .select('name email role createdAt')
                .sort({ createdAt: -1 })
                .limit(10)
        ]);

        const departmentStats = await User.aggregate([
            { $match: { department: { $exists: true, $ne: null } } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            success: true,
            stats: {
                total: totalUsers,
                active: activeUsers,
                verified: verifiedUsers,
                unverified: totalUsers - verifiedUsers,
                inactive: totalUsers - activeUsers
            },
            roleDistribution: roleStats,
            departmentDistribution: departmentStats,
            recentRegistrations
        });

    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user statistics'
        });
    }
};

/**
 * Get available roles and permissions
 * @route GET /api/admin/roles
 * @access Private (Admin only)
 */
exports.getRoles = async (req, res) => {
    try {
        const roles = getAllRoles();
        
        // Filter roles based on user's permission to assign them
        const assignableRoles = {};
        
        Object.keys(roles).forEach(roleName => {
            if (canAssignRole(req.user.role, roleName)) {
                assignableRoles[roleName] = roles[roleName];
            }
        });

        res.json({
            success: true,
            allRoles: roles,
            assignableRoles,
            userRole: req.user.role,
            userRoleInfo: getRoleInfo(req.user.role)
        });

    } catch (error) {
        console.error('Get roles error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch roles'
        });
    }
};

/**
 * Bulk user operations
 * @route POST /api/admin/users/bulk
 * @access Private (Admin only)
 */
exports.bulkUserOperations = async (req, res) => {
    try {
        const { operation, userIds, data } = req.body;

        if (!operation || !userIds || !Array.isArray(userIds)) {
            return res.status(400).json({
                success: false,
                message: 'Operation and userIds array are required'
            });
        }

        const results = {
            success: [],
            failed: [],
            total: userIds.length
        };

        for (const userId of userIds) {
            try {
                const user = await User.findById(userId);
                if (!user) {
                    results.failed.push({ userId, reason: 'User not found' });
                    continue;
                }

                switch (operation) {
                    case 'activate':
                        user.isActive = true;
                        await user.save();
                        results.success.push({ userId, action: 'activated' });
                        break;

                    case 'deactivate':
                        if (userId === req.user._id.toString()) {
                            results.failed.push({ userId, reason: 'Cannot deactivate own account' });
                            continue;
                        }
                        user.isActive = false;
                        await user.save();
                        jwtService.blacklistUserTokens(userId);
                        results.success.push({ userId, action: 'deactivated' });
                        break;

                    case 'updateRole':
                        if (!data.role || !canAssignRole(req.user.role, data.role)) {
                            results.failed.push({ userId, reason: 'Invalid role or insufficient permissions' });
                            continue;
                        }
                        user.role = data.role;
                        if (data.department) user.department = data.department;
                        await user.save();
                        jwtService.blacklistUserTokens(userId);
                        results.success.push({ userId, action: 'role updated' });
                        break;

                    default:
                        results.failed.push({ userId, reason: 'Invalid operation' });
                }
            } catch (error) {
                results.failed.push({ userId, reason: error.message });
            }
        }

        // Log bulk operation
        securityService.logSecurityEvent(
            'BULK_USER_OPERATION',
            req.user._id,
            req.user.email,
            req.ip,
            req.get('User-Agent'),
            {
                operation,
                totalUsers: userIds.length,
                successCount: results.success.length,
                failedCount: results.failed.length,
                data
            }
        );

        res.json({
            success: true,
            message: `Bulk operation completed. ${results.success.length} successful, ${results.failed.length} failed.`,
            results
        });

    } catch (error) {
        console.error('Bulk user operations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to perform bulk operation'
        });
    }
};