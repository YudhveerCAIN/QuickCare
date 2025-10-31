const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Issue = require('../models/Issue');
const { auth } = require('../middlewares/authMiddleware');
const { permissionMiddleware } = require('../middlewares/roleMiddlerware');

// Get all users (admin only)
router.get('/users', auth, permissionMiddleware('canManageUsers'), async (req, res) => {
    try {
        const users = await User.find({})
            .select('-password')
            .sort({ createdAt: -1 });
        
        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
});

// Create new user (admin only)
router.post('/create-user', auth, permissionMiddleware('canManageUsers'), async (req, res) => {
    try {
        const { name, email, contact, role, department, employeeId, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create new user
        const newUser = new User({
            name,
            email,
            contact,
            role,
            department,
            employeeId,
            password,
            isActive: true,
            isVerified: true // Admin-created users are auto-verified
        });

        await newUser.save();

        // Remove password from response
        const userResponse = newUser.toObject();
        delete userResponse.password;

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: userResponse
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating user'
        });
    }
});

// Update user (admin only)
router.put('/users/:userId', auth, permissionMiddleware('canManageUsers'), async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        // Don't allow password updates through this route
        delete updates.password;

        // Find the user first
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Store original role for comparison
        const originalRole = user.role;

        // Update the user fields
        Object.assign(user, updates);

        // If role was updated, update permissions
        if (updates.role && updates.role !== originalRole) {
            console.log(`Updating user ${user.email} role from ${originalRole} to ${updates.role}`);
            user.setPermissionsByRole();
            console.log(`Updated permissions for ${user.email}:`, JSON.stringify(user.permissions));
        }

        // Save the user (this will trigger pre-save hooks)
        await user.save();

        // Return user without password
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({
            success: true,
            message: 'User updated successfully',
            user: userResponse
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user'
        });
    }
});

// Delete user (system admin only)
router.delete('/users/:userId', auth, permissionMiddleware('canSystemConfig'), async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user'
        });
    }
});

// Get dashboard statistics
router.get('/dashboard-stats', auth, permissionMiddleware('canViewAnalytics'), async (req, res) => {
    try {
        const [totalUsers, totalIssues, openIssues, inProgressIssues, resolvedIssues] = await Promise.all([
            User.countDocuments(),
            Issue.countDocuments(),
            Issue.countDocuments({ status: 'Open' }),
            Issue.countDocuments({ status: 'In Progress' }),
            Issue.countDocuments({ status: 'Resolved' })
        ]);

        const recentIssues = await Issue.find({})
            .populate('submittedBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            stats: {
                totalUsers,
                totalIssues,
                openIssues,
                inProgressIssues,
                resolvedIssues,
                recentIssues
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics'
        });
    }
});

// Bulk update issues
router.put('/bulk-update-issues', auth, permissionMiddleware('canAssignIssues'), async (req, res) => {
    try {
        const { issueIds, updates } = req.body;

        if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Issue IDs are required'
            });
        }

        const result = await Issue.updateMany(
            { _id: { $in: issueIds } },
            updates,
            { runValidators: true }
        );

        res.json({
            success: true,
            message: `${result.modifiedCount} issues updated successfully`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error bulk updating issues:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating issues'
        });
    }
});

// Assign issues to department/user
router.put('/assign-issues', auth, permissionMiddleware('canAssignIssues'), async (req, res) => {
    try {
        const { issueIds, assignedTo, department } = req.body;

        if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Issue IDs are required'
            });
        }

        const updates = {};
        if (assignedTo) updates.assignedTo = assignedTo;
        if (department) updates.department = department;

        const result = await Issue.updateMany(
            { _id: { $in: issueIds } },
            updates,
            { runValidators: true }
        );

        res.json({
            success: true,
            message: `${result.modifiedCount} issues assigned successfully`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error assigning issues:', error);
        res.status(500).json({
            success: false,
            message: 'Error assigning issues'
        });
    }
});

// Get analytics data
router.get('/analytics', auth, permissionMiddleware('canViewAnalytics'), async (req, res) => {
    try {
        const { timeRange = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(timeRange));

        // Get issues within time range
        const issues = await Issue.find({
            createdAt: { $gte: startDate }
        }).populate('submittedBy', 'name');

        // Calculate analytics
        const analytics = {
            totalIssues: issues.length,
            issuesByStatus: {},
            issuesByCategory: {},
            issuesByPriority: {},
            resolutionTimes: [],
            userEngagement: {}
        };

        // Group by status
        issues.forEach(issue => {
            analytics.issuesByStatus[issue.status] = (analytics.issuesByStatus[issue.status] || 0) + 1;
            analytics.issuesByPriority[issue.priority] = (analytics.issuesByPriority[issue.priority] || 0) + 1;
            
            const category = issue.category?.primary || 'Other';
            analytics.issuesByCategory[category] = (analytics.issuesByCategory[category] || 0) + 1;
        });

        // Calculate resolution times for resolved issues
        const resolvedIssues = issues.filter(issue => issue.status === 'Resolved');
        analytics.resolutionTimes = resolvedIssues.map(issue => {
            const created = new Date(issue.createdAt);
            const resolved = new Date(issue.updatedAt);
            return Math.ceil((resolved - created) / (1000 * 60 * 60 * 24)); // days
        });

        // Get total users count
        const totalUsers = await User.countDocuments();
        
        // User engagement
        const uniqueReporters = [...new Set(issues.map(i => i.submittedBy?._id?.toString()).filter(Boolean))];
        analytics.userEngagement = {
            totalUsers: totalUsers,
            activeReporters: uniqueReporters.length,
            averageIssuesPerReporter: uniqueReporters.length > 0 ? issues.length / uniqueReporters.length : 0,
            averageIssuesPerUser: totalUsers > 0 ? issues.length / totalUsers : 0
        };

        res.json({
            success: true,
            analytics
        });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching analytics'
        });
    }
});

module.exports = router;