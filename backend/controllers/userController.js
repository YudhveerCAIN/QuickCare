const User = require('../models/User');
const Department = require('../models/Department');
const Issue = require('../models/Issue');
const Notification = require('../models/Notification');

// Create user with specific role (admin/system_admin only)
exports.createUser = async (req, res) => {
    try {
        const { name, email, password, contact, role, department, employeeId, address } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Validate required fields based on role
        if (['department_officer', 'admin'].includes(role) && !department) {
            return res.status(400).json({ message: 'Department is required for this role' });
        }

        if (['department_officer', 'admin', 'moderator', 'system_admin'].includes(role) && !employeeId) {
            return res.status(400).json({ message: 'Employee ID is required for this role' });
        }

        const userData = {
            name,
            email,
            password,
            contact,
            role: role || 'citizen'
        };

        // Add optional fields if provided
        if (department) userData.department = department;
        if (employeeId) userData.employeeId = employeeId;
        if (address) userData.address = address;

        const user = await User.create(userData);

        // Create notification for new user
        await Notification.create({
            userId: user._id,
            type: 'system_alert',
            title: 'Account Created',
            message: `Your account has been created with role: ${role}`,
            priority: 'medium'
        });

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                isActive: user.isActive
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
};

// Get all users (admin/system_admin only)
exports.getAllUsers = async (req, res) => {
    try {
        const { role, department, isActive, page = 1, limit = 10 } = req.query;
        
        const filter = {};
        if (role) filter.role = role;
        if (department) filter.department = department;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const users = await User.find(filter)
            .select('-password')
            .populate('assignedIssues', 'title status')
            .populate('reportedIssues', 'title status')
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(filter);

        res.json({
            users,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

// Get user by ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('assignedIssues', 'title status priority')
            .populate('reportedIssues', 'title status priority');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user', error: error.message });
    }
};

// Update user role and permissions
exports.updateUserRole = async (req, res) => {
    try {
        const { role, department, employeeId, isActive } = req.body;
        const userId = req.params.id;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user
        const updateData = {};
        if (role) updateData.role = role;
        if (department) updateData.department = department;
        if (employeeId) updateData.employeeId = employeeId;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        // Create notification for role change
        await Notification.create({
            userId: userId,
            type: 'system_alert',
            title: 'Role Updated',
            message: `Your role has been updated to ${role || user.role}`,
            priority: 'medium'
        });

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user role', error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting system admin users
        if (user.role === 'system_admin') {
            return res.status(403).json({ message: 'Cannot delete system admin users' });
        }

        // Prevent users from deleting themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(403).json({ message: 'Cannot delete your own account' });
        }

        await User.findByIdAndDelete(userId);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user', error: error.message });
    }
};

// Get users by department
exports.getUsersByDepartment = async (req, res) => {
    try {
        const { department } = req.params;
        
        const users = await User.find({ 
            department: department,
            role: { $in: ['department_officer', 'admin'] }
        })
        .select('-password')
        .populate('assignedIssues', 'title status');

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching department users', error: error.message });
    }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
    try {
        const stats = await User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 },
                    activeCount: {
                        $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                    }
                }
            }
        ]);

        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });

        res.json({
            totalUsers,
            activeUsers,
            byRole: stats
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user statistics', error: error.message });
    }
};

// Deactivate/Activate user
exports.toggleUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        const { isActive } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { isActive },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Create notification
        await Notification.create({
            userId: userId,
            type: 'system_alert',
            title: isActive ? 'Account Activated' : 'Account Deactivated',
            message: isActive ? 'Your account has been activated' : 'Your account has been deactivated',
            priority: 'high'
        });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating user status', error: error.message });
    }
};

// Get user's assigned issues
exports.getUserAssignedIssues = async (req, res) => {
    try {
        const userId = req.params.id;
        
        const issues = await Issue.find({ assignedTo: userId })
            .populate('reporter', 'name email')
            .sort({ createdAt: -1 });

        res.json(issues);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching assigned issues', error: error.message });
    }
};

// Get user's reported issues
exports.getUserReportedIssues = async (req, res) => {
    try {
        const userId = req.params.id;
        
        const issues = await Issue.find({ reporter: userId })
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });

        res.json(issues);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching reported issues', error: error.message });
    }
};
