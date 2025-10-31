const securityService = require('../services/securityService');

// Role definitions with hierarchy and permissions
const ROLES = {
    citizen: {
        level: 1,
        name: 'Citizen',
        description: 'Regular community member',
        permissions: [
            'canCreateIssues',
            'canViewOwnIssues',
            'canCommentOnIssues',
            'canUpdateOwnProfile'
        ]
    },
    department_officer: {
        level: 2,
        name: 'Department Officer',
        description: 'Government department representative',
        permissions: [
            'canCreateIssues',
            'canViewOwnIssues',
            'canCommentOnIssues',
            'canUpdateOwnProfile',
            'canViewDepartmentIssues',
            'canUpdateIssueStatus'
        ]
    },
    moderator: {
        level: 3,
        name: 'Moderator',
        description: 'Content and community moderator',
        permissions: [
            'canCreateIssues',
            'canViewOwnIssues',
            'canCommentOnIssues',
            'canUpdateOwnProfile',
            'canModerateContent',
            'canViewAnalytics',
            'canDeleteComments',
            'canSuspendUsers'
        ]
    },
    admin: {
        level: 4,
        name: 'Administrator',
        description: 'System administrator',
        permissions: [
            'canCreateIssues',
            'canViewOwnIssues',
            'canCommentOnIssues',
            'canUpdateOwnProfile',
            'canAssignIssues',
            'canModerateContent',
            'canManageUsers',
            'canViewAnalytics',
            'canDeleteComments',
            'canSuspendUsers',
            'canManageDepartments',
            'canViewReports'
        ]
    },
    system_admin: {
        level: 5,
        name: 'System Administrator',
        description: 'Full system access',
        permissions: [
            'canCreateIssues',
            'canViewOwnIssues',
            'canCommentOnIssues',
            'canUpdateOwnProfile',
            'canAssignIssues',
            'canModerateContent',
            'canManageUsers',
            'canViewAnalytics',
            'canSystemConfig',
            'canDeleteComments',
            'canSuspendUsers',
            'canManageDepartments',
            'canViewReports',
            'canManageRoles',
            'canViewSecurityLogs',
            'canManageSystemSettings'
        ]
    }
};

/**
 * Enhanced role middleware with logging and detailed error responses
 * @param {...string} allowedRoles - Allowed roles for the endpoint
 * @returns {Function} - Express middleware function
 */
const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            if (!allowedRoles.includes(req.user.role)) {
                // Log unauthorized access attempt
                securityService.logSecurityEvent(
                    'UNAUTHORIZED_ACCESS_ATTEMPT',
                    req.user._id,
                    req.user.email,
                    req.ip,
                    req.get('User-Agent'),
                    {
                        requiredRoles: allowedRoles,
                        userRole: req.user.role,
                        endpoint: `${req.method} ${req.path}`
                    }
                );

                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Insufficient role permissions.',
                    code: 'INSUFFICIENT_ROLE',
                    required: allowedRoles,
                    current: req.user.role
                });
            }

            // Log successful role-based access
            console.log('Role-based access granted:', {
                userId: req.user._id,
                role: req.user.role,
                endpoint: `${req.method} ${req.path}`,
                allowedRoles
            });

            next();
        } catch (error) {
            console.error('Role middleware error:', error);
            return res.status(500).json({
                success: false,
                message: 'Role validation error',
                code: 'ROLE_VALIDATION_ERROR'
            });
        }
    };
};

/**
 * Enhanced permission-based middleware
 * @param {string|Array} permissions - Required permission(s)
 * @returns {Function} - Express middleware function
 */
const permissionMiddleware = (permissions) => {
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Check if user has all required permissions
            const missingPermissions = requiredPermissions.filter(permission => 
                !req.user.hasPermission(permission)
            );

            if (missingPermissions.length > 0) {
                // Log unauthorized access attempt
                securityService.logSecurityEvent(
                    'UNAUTHORIZED_ACCESS_ATTEMPT',
                    req.user._id,
                    req.user.email,
                    req.ip,
                    req.get('User-Agent'),
                    {
                        requiredPermissions,
                        missingPermissions,
                        userRole: req.user.role,
                        endpoint: `${req.method} ${req.path}`
                    }
                );

                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Required permissions not found.',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    required: requiredPermissions,
                    missing: missingPermissions
                });
            }

            // Log successful permission-based access
            console.log('Permission-based access granted:', {
                userId: req.user._id,
                role: req.user.role,
                permissions: requiredPermissions,
                endpoint: `${req.method} ${req.path}`
            });

            next();
        } catch (error) {
            console.error('Permission middleware error:', error);
            return res.status(500).json({
                success: false,
                message: 'Permission validation error',
                code: 'PERMISSION_VALIDATION_ERROR'
            });
        }
    };
};

/**
 * Role hierarchy middleware (higher roles can access lower role features)
 * @param {string} requiredRole - Minimum required role
 * @returns {Function} - Express middleware function
 */
const roleHierarchyMiddleware = (requiredRole) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            const userRoleLevel = ROLES[req.user.role]?.level || 0;
            const requiredRoleLevel = ROLES[requiredRole]?.level || 0;

            if (userRoleLevel < requiredRoleLevel) {
                // Log unauthorized access attempt
                securityService.logSecurityEvent(
                    'UNAUTHORIZED_ACCESS_ATTEMPT',
                    req.user._id,
                    req.user.email,
                    req.ip,
                    req.get('User-Agent'),
                    {
                        requiredRole,
                        requiredLevel: requiredRoleLevel,
                        userRole: req.user.role,
                        userLevel: userRoleLevel,
                        endpoint: `${req.method} ${req.path}`
                    }
                );

                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Insufficient role level.',
                    code: 'INSUFFICIENT_ROLE_LEVEL',
                    required: {
                        role: requiredRole,
                        level: requiredRoleLevel
                    },
                    current: {
                        role: req.user.role,
                        level: userRoleLevel
                    }
                });
            }

            next();
        } catch (error) {
            console.error('Role hierarchy middleware error:', error);
            return res.status(500).json({
                success: false,
                message: 'Role hierarchy validation error',
                code: 'ROLE_HIERARCHY_ERROR'
            });
        }
    };
};

/**
 * Resource ownership middleware (user can only access their own resources)
 * @param {string} resourceIdParam - Parameter name containing resource ID
 * @param {string} resourceModel - Model name for the resource
 * @param {string} ownerField - Field name that contains the owner ID
 * @returns {Function} - Express middleware function
 */
const resourceOwnershipMiddleware = (resourceIdParam = 'id', resourceModel = null, ownerField = 'userId') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            const resourceId = req.params[resourceIdParam];
            
            if (!resourceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Resource ID required',
                    code: 'RESOURCE_ID_REQUIRED'
                });
            }

            // For admin users, skip ownership check
            if (['admin', 'system_admin'].includes(req.user.role)) {
                return next();
            }

            // If no model specified, assume the resource ID should match user ID
            if (!resourceModel) {
                if (resourceId !== req.user._id.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied. You can only access your own resources.',
                        code: 'RESOURCE_ACCESS_DENIED'
                    });
                }
                return next();
            }

            // Check resource ownership using the specified model
            const Model = require(`../models/${resourceModel}`);
            const resource = await Model.findById(resourceId);

            if (!resource) {
                return res.status(404).json({
                    success: false,
                    message: 'Resource not found',
                    code: 'RESOURCE_NOT_FOUND'
                });
            }

            if (resource[ownerField].toString() !== req.user._id.toString()) {
                // Log unauthorized access attempt
                securityService.logSecurityEvent(
                    'UNAUTHORIZED_RESOURCE_ACCESS',
                    req.user._id,
                    req.user.email,
                    req.ip,
                    req.get('User-Agent'),
                    {
                        resourceId,
                        resourceModel,
                        ownerField,
                        actualOwner: resource[ownerField],
                        endpoint: `${req.method} ${req.path}`
                    }
                );

                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only access your own resources.',
                    code: 'RESOURCE_ACCESS_DENIED'
                });
            }

            // Attach resource to request for use in controller
            req.resource = resource;
            next();

        } catch (error) {
            console.error('Resource ownership middleware error:', error);
            return res.status(500).json({
                success: false,
                message: 'Resource ownership validation error',
                code: 'OWNERSHIP_VALIDATION_ERROR'
            });
        }
    };
};

/**
 * Department-based access middleware (for department officers)
 * @param {string} resourceModel - Model name for the resource
 * @param {string} departmentField - Field name that contains the department
 * @returns {Function} - Express middleware function
 */
const departmentAccessMiddleware = (resourceModel, departmentField = 'department') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Admin users have access to all departments
            if (['admin', 'system_admin'].includes(req.user.role)) {
                return next();
            }

            // Department officers can only access their department's resources
            if (req.user.role === 'department_officer') {
                if (!req.user.department) {
                    return res.status(403).json({
                        success: false,
                        message: 'No department assigned to user',
                        code: 'NO_DEPARTMENT_ASSIGNED'
                    });
                }

                const resourceId = req.params.id;
                if (resourceId) {
                    const Model = require(`../models/${resourceModel}`);
                    const resource = await Model.findById(resourceId);

                    if (!resource) {
                        return res.status(404).json({
                            success: false,
                            message: 'Resource not found',
                            code: 'RESOURCE_NOT_FOUND'
                        });
                    }

                    if (resource[departmentField] !== req.user.department) {
                        return res.status(403).json({
                            success: false,
                            message: 'Access denied. Resource belongs to different department.',
                            code: 'DEPARTMENT_ACCESS_DENIED'
                        });
                    }

                    req.resource = resource;
                }
            }

            next();
        } catch (error) {
            console.error('Department access middleware error:', error);
            return res.status(500).json({
                success: false,
                message: 'Department access validation error',
                code: 'DEPARTMENT_ACCESS_ERROR'
            });
        }
    };
};

/**
 * Get role information
 * @param {string} roleName - Role name
 * @returns {Object} - Role information
 */
const getRoleInfo = (roleName) => {
    return ROLES[roleName] || null;
};

/**
 * Get all available roles
 * @returns {Object} - All roles with their information
 */
const getAllRoles = () => {
    return ROLES;
};

/**
 * Check if a role can be assigned by another role
 * @param {string} assignerRole - Role of the user trying to assign
 * @param {string} targetRole - Role being assigned
 * @returns {boolean} - Whether assignment is allowed
 */
const canAssignRole = (assignerRole, targetRole) => {
    const assignerLevel = ROLES[assignerRole]?.level || 0;
    const targetLevel = ROLES[targetRole]?.level || 0;
    
    // System admins can assign any role
    if (assignerRole === 'system_admin') return true;
    
    // Admins can assign roles below their level
    if (assignerRole === 'admin' && targetLevel < ROLES.admin.level) return true;
    
    // Other roles cannot assign roles
    return false;
};

/**
 * Admin-only role assignment middleware
 * Ensures only admins can assign roles and validates the assignment
 * @returns {Function} - Express middleware function
 */
const adminRoleAssignmentMiddleware = () => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Only admins and system admins can assign roles
            if (!['admin', 'system_admin'].includes(req.user.role)) {
                securityService.logSecurityEvent(
                    'UNAUTHORIZED_ROLE_ASSIGNMENT_ATTEMPT',
                    req.user._id,
                    req.user.email,
                    req.ip,
                    req.get('User-Agent'),
                    {
                        userRole: req.user.role,
                        targetRole: req.body.role,
                        endpoint: `${req.method} ${req.path}`
                    }
                );

                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Only administrators can assign roles.',
                    code: 'ROLE_ASSIGNMENT_DENIED'
                });
            }

            // Validate the role being assigned
            const targetRole = req.body.role;
            if (targetRole && !ROLES[targetRole]) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid role specified',
                    code: 'INVALID_ROLE',
                    availableRoles: Object.keys(ROLES)
                });
            }

            // Check if the user can assign this specific role
            if (targetRole && !canAssignRole(req.user.role, targetRole)) {
                securityService.logSecurityEvent(
                    'UNAUTHORIZED_ROLE_ASSIGNMENT_ATTEMPT',
                    req.user._id,
                    req.user.email,
                    req.ip,
                    req.get('User-Agent'),
                    {
                        userRole: req.user.role,
                        targetRole: targetRole,
                        reason: 'Insufficient role level',
                        endpoint: `${req.method} ${req.path}`
                    }
                );

                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You cannot assign this role.',
                    code: 'ROLE_ASSIGNMENT_LEVEL_DENIED',
                    userRole: req.user.role,
                    targetRole: targetRole
                });
            }

            next();
        } catch (error) {
            console.error('Admin role assignment middleware error:', error);
            return res.status(500).json({
                success: false,
                message: 'Role assignment validation error',
                code: 'ROLE_ASSIGNMENT_ERROR'
            });
        }
    };
};

/**
 * Granular permission validation middleware
 * Checks multiple permissions with AND/OR logic
 * @param {Object} options - Permission validation options
 * @param {Array} options.permissions - Array of required permissions
 * @param {string} options.logic - 'AND' (all required) or 'OR' (any required)
 * @param {boolean} options.allowOwner - Allow resource owner even without permissions
 * @param {string} options.ownerField - Field to check for ownership
 * @returns {Function} - Express middleware function
 */
const granularPermissionMiddleware = (options = {}) => {
    const {
        permissions = [],
        logic = 'AND',
        allowOwner = false,
        ownerField = 'userId'
    } = options;

    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Check ownership if allowed
            if (allowOwner && req.params.id) {
                const resourceId = req.params.id;
                
                // If checking user's own resource
                if (ownerField === 'userId' && resourceId === req.user._id.toString()) {
                    return next();
                }

                // If resource is attached to request (from previous middleware)
                if (req.resource && req.resource[ownerField] && 
                    req.resource[ownerField].toString() === req.user._id.toString()) {
                    return next();
                }
            }

            // Check permissions based on logic
            let hasAccess = false;
            const userPermissions = [];
            const missingPermissions = [];

            for (const permission of permissions) {
                const hasPermission = req.user.canPerformAction(permission);
                if (hasPermission) {
                    userPermissions.push(permission);
                } else {
                    missingPermissions.push(permission);
                }
            }

            if (logic === 'AND') {
                hasAccess = missingPermissions.length === 0;
            } else if (logic === 'OR') {
                hasAccess = userPermissions.length > 0;
            }

            if (!hasAccess) {
                securityService.logSecurityEvent(
                    'UNAUTHORIZED_ACCESS_ATTEMPT',
                    req.user._id,
                    req.user.email,
                    req.ip,
                    req.get('User-Agent'),
                    {
                        requiredPermissions: permissions,
                        missingPermissions,
                        userPermissions,
                        logic,
                        userRole: req.user.role,
                        endpoint: `${req.method} ${req.path}`
                    }
                );

                return res.status(403).json({
                    success: false,
                    message: `Access denied. Required permissions not found (${logic} logic).`,
                    code: 'INSUFFICIENT_PERMISSIONS',
                    required: permissions,
                    missing: missingPermissions,
                    logic: logic
                });
            }

            // Log successful access
            console.log('Granular permission access granted:', {
                userId: req.user._id,
                role: req.user.role,
                permissions: userPermissions,
                logic,
                endpoint: `${req.method} ${req.path}`
            });

            next();
        } catch (error) {
            console.error('Granular permission middleware error:', error);
            return res.status(500).json({
                success: false,
                message: 'Permission validation error',
                code: 'PERMISSION_VALIDATION_ERROR'
            });
        }
    };
};

/**
 * Role hierarchy validation middleware with detailed checks
 * @param {string} requiredRole - Minimum required role
 * @param {Object} options - Additional options
 * @param {boolean} options.strict - Exact role match required
 * @param {Array} options.excludeRoles - Roles to exclude even if they meet hierarchy
 * @returns {Function} - Express middleware function
 */
const enhancedRoleHierarchyMiddleware = (requiredRole, options = {}) => {
    const { strict = false, excludeRoles = [] } = options;

    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required',
                    code: 'AUTH_REQUIRED'
                });
            }

            const userRoleLevel = ROLES[req.user.role]?.level || 0;
            const requiredRoleLevel = ROLES[requiredRole]?.level || 0;

            // Check if user role is excluded
            if (excludeRoles.includes(req.user.role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Role is excluded from this operation.',
                    code: 'ROLE_EXCLUDED'
                });
            }

            let hasAccess = false;

            if (strict) {
                // Exact role match required
                hasAccess = req.user.role === requiredRole;
            } else {
                // Hierarchy-based access
                hasAccess = userRoleLevel >= requiredRoleLevel;
            }

            if (!hasAccess) {
                securityService.logSecurityEvent(
                    'UNAUTHORIZED_ACCESS_ATTEMPT',
                    req.user._id,
                    req.user.email,
                    req.ip,
                    req.get('User-Agent'),
                    {
                        requiredRole,
                        requiredLevel: requiredRoleLevel,
                        userRole: req.user.role,
                        userLevel: userRoleLevel,
                        strict,
                        excludeRoles,
                        endpoint: `${req.method} ${req.path}`
                    }
                );

                return res.status(403).json({
                    success: false,
                    message: strict 
                        ? 'Access denied. Exact role match required.'
                        : 'Access denied. Insufficient role level.',
                    code: strict ? 'EXACT_ROLE_REQUIRED' : 'INSUFFICIENT_ROLE_LEVEL',
                    required: {
                        role: requiredRole,
                        level: requiredRoleLevel,
                        strict
                    },
                    current: {
                        role: req.user.role,
                        level: userRoleLevel
                    }
                });
            }

            next();
        } catch (error) {
            console.error('Enhanced role hierarchy middleware error:', error);
            return res.status(500).json({
                success: false,
                message: 'Role hierarchy validation error',
                code: 'ROLE_HIERARCHY_ERROR'
            });
        }
    };
};

module.exports = {
    roleMiddleware,
    permissionMiddleware,
    roleHierarchyMiddleware,
    enhancedRoleHierarchyMiddleware,
    resourceOwnershipMiddleware,
    departmentAccessMiddleware,
    adminRoleAssignmentMiddleware,
    granularPermissionMiddleware,
    getRoleInfo,
    getAllRoles,
    canAssignRole,
    ROLES
};