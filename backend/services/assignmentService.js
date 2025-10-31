const Assignment = require('../models/Assignment');
const Issue = require('../models/Issue');
const User = require('../models/User');
const Department = require('../models/Department');
const ActivityLog = require('../models/ActivityLog');
const notificationService = require('./notificationService');

class AssignmentService {
    constructor() {
        // Auto-escalation check every 30 minutes
        setInterval(() => {
            this.checkForAutoEscalation();
        }, 30 * 60 * 1000);
    }

    /**
     * Assign issue to department/user
     * @param {Object} assignmentData - Assignment data
     * @returns {Promise<Object>} - Assignment result
     */
    async assignIssue(assignmentData) {
        try {
            const {
                issueId,
                assignedTo,
                assignedBy,
                departmentId,
                priority = 'medium',
                notes = '',
                slaHours = 24,
                estimatedResolution,
                metadata = {}
            } = assignmentData;

            // Validate issue exists
            const issue = await Issue.findById(issueId);
            if (!issue) {
                throw new Error('Issue not found');
            }

            // Validate assigned user
            const assignedUser = await User.findById(assignedTo);
            if (!assignedUser) {
                throw new Error('Assigned user not found');
            }

            // Validate department
            const department = await Department.findById(departmentId);
            if (!department) {
                throw new Error('Department not found');
            }

            // Check if user belongs to department
            if (!department.members.includes(assignedTo)) {
                throw new Error('User does not belong to the specified department');
            }

            // Calculate SLA deadline
            const slaDeadline = new Date();
            slaDeadline.setHours(slaDeadline.getHours() + slaHours);

            // Deactivate any existing assignments for this issue
            await Assignment.updateMany(
                { issueId, isActive: true },
                { isActive: false }
            );

            // Create new assignment
            const assignment = new Assignment({
                issueId,
                assignedTo,
                assignedBy,
                departmentId,
                priority,
                slaDeadline,
                estimatedResolution,
                notes,
                metadata: {
                    assignmentSource: 'manual',
                    ...metadata
                }
            });

            await assignment.save();

            // Update issue status and assignment
            await Issue.findByIdAndUpdate(issueId, {
                assignedTo,
                department: department.name,
                status: 'in-progress'
            });

            // Log activity
            await ActivityLog.logActivity({
                issueId,
                actionType: 'issue_assigned',
                performedBy: assignedBy,
                targetUser: assignedTo,
                departmentId,
                actionDetails: {
                    newValue: {
                        assignedTo: assignedUser.name,
                        department: department.name,
                        priority,
                        slaDeadline
                    },
                    notes,
                    metadata: {
                        assignmentSource: 'manual'
                    }
                },
                relatedEntities: {
                    assignmentId: assignment._id
                }
            });

            // Send notification to assigned user
            await notificationService.createNotification({
                userId: assignedTo,
                type: 'assignment',
                title: 'New Issue Assignment',
                message: `You have been assigned issue: ${issue.title}`,
                relatedId: issueId,
                priority: priority === 'critical' ? 'high' : 'medium',
                actionUrl: `/issues/${issueId}`,
                metadata: {
                    assignmentId: assignment._id,
                    slaDeadline,
                    department: department.name
                }
            });

            // Send notification to department head if different from assigned user
            if (department.head && department.head.toString() !== assignedTo.toString()) {
                await notificationService.createNotification({
                    userId: department.head,
                    type: 'department_assignment',
                    title: 'Issue Assigned in Your Department',
                    message: `Issue "${issue.title}" has been assigned to ${assignedUser.name}`,
                    relatedId: issueId,
                    priority: 'medium',
                    actionUrl: `/admin/assignments/${assignment._id}`,
                    metadata: {
                        assignmentId: assignment._id,
                        assignedUser: assignedUser.name
                    }
                });
            }

            return {
                success: true,
                assignment: await assignment.populate([
                    { path: 'assignedTo', select: 'name email' },
                    { path: 'departmentId', select: 'name' },
                    { path: 'issueId', select: 'title category priority' }
                ]),
                message: 'Issue assigned successfully'
            };

        } catch (error) {
            console.error('Error assigning issue:', error);
            throw error;
        }
    }

    /**
     * Accept assignment
     * @param {string} assignmentId - Assignment ID
     * @param {string} userId - User accepting the assignment
     * @param {string} notes - Optional notes
     * @returns {Promise<Object>} - Accept result
     */
    async acceptAssignment(assignmentId, userId, notes = '') {
        try {
            const assignment = await Assignment.findById(assignmentId);
            if (!assignment) {
                throw new Error('Assignment not found');
            }

            if (assignment.assignedTo.toString() !== userId.toString()) {
                throw new Error('You are not authorized to accept this assignment');
            }

            if (assignment.status !== 'assigned') {
                throw new Error('Assignment cannot be accepted in current status');
            }

            await assignment.accept(userId, notes);

            // Log activity
            await ActivityLog.logActivity({
                issueId: assignment.issueId,
                actionType: 'assignment_accepted',
                performedBy: userId,
                departmentId: assignment.departmentId,
                actionDetails: {
                    notes,
                    metadata: {
                        responseTime: assignment.performance.responseTime
                    }
                },
                relatedEntities: {
                    assignmentId: assignment._id
                }
            });

            // Notify assignment creator
            await notificationService.createNotification({
                userId: assignment.assignedBy,
                type: 'assignment_accepted',
                title: 'Assignment Accepted',
                message: `Assignment for issue has been accepted`,
                relatedId: assignment.issueId,
                priority: 'medium',
                actionUrl: `/admin/assignments/${assignmentId}`
            });

            return {
                success: true,
                assignment,
                message: 'Assignment accepted successfully'
            };

        } catch (error) {
            console.error('Error accepting assignment:', error);
            throw error;
        }
    }

    /**
     * Start work on assignment
     * @param {string} assignmentId - Assignment ID
     * @param {string} userId - User starting work
     * @returns {Promise<Object>} - Start work result
     */
    async startWork(assignmentId, userId) {
        try {
            const assignment = await Assignment.findById(assignmentId);
            if (!assignment) {
                throw new Error('Assignment not found');
            }

            if (assignment.assignedTo.toString() !== userId.toString()) {
                throw new Error('You are not authorized to start work on this assignment');
            }

            if (assignment.status !== 'accepted') {
                throw new Error('Assignment must be accepted before starting work');
            }

            await assignment.startWork();

            // Update issue status
            await Issue.findByIdAndUpdate(assignment.issueId, {
                status: 'in-progress'
            });

            // Log activity
            await ActivityLog.logActivity({
                issueId: assignment.issueId,
                actionType: 'work_started',
                performedBy: userId,
                departmentId: assignment.departmentId,
                actionDetails: {
                    metadata: {
                        startedAt: assignment.startedAt
                    }
                },
                relatedEntities: {
                    assignmentId: assignment._id
                }
            });

            return {
                success: true,
                assignment,
                message: 'Work started successfully'
            };

        } catch (error) {
            console.error('Error starting work:', error);
            throw error;
        }
    }

    /**
     * Complete assignment
     * @param {string} assignmentId - Assignment ID
     * @param {string} userId - User completing the assignment
     * @param {Object} completionData - Completion data
     * @returns {Promise<Object>} - Completion result
     */
    async completeAssignment(assignmentId, userId, completionData = {}) {
        try {
            const { notes = '', resolutionImages = [], qualityScore } = completionData;

            const assignment = await Assignment.findById(assignmentId);
            if (!assignment) {
                throw new Error('Assignment not found');
            }

            if (assignment.assignedTo.toString() !== userId.toString()) {
                throw new Error('You are not authorized to complete this assignment');
            }

            if (!['accepted', 'in_progress'].includes(assignment.status)) {
                throw new Error('Assignment cannot be completed in current status');
            }

            await assignment.complete(userId, notes);

            // Update issue status
            const updateData = {
                status: 'resolved',
                actualResolutionDate: new Date(),
                resolutionNotes: notes
            };

            if (resolutionImages.length > 0) {
                updateData.resolutionImages = resolutionImages;
            }

            await Issue.findByIdAndUpdate(assignment.issueId, updateData);

            // Update quality score if provided
            if (qualityScore) {
                assignment.performance.qualityScore = qualityScore;
                await assignment.save();
            }

            // Log activity
            await ActivityLog.logActivity({
                issueId: assignment.issueId,
                actionType: 'assignment_completed',
                performedBy: userId,
                departmentId: assignment.departmentId,
                actionDetails: {
                    notes,
                    metadata: {
                        resolutionTime: assignment.performance.resolutionTime,
                        qualityScore
                    }
                },
                relatedEntities: {
                    assignmentId: assignment._id
                }
            });

            // Notify issue reporter
            const issue = await Issue.findById(assignment.issueId).populate('reporter');
            if (issue && issue.reporter) {
                await notificationService.createNotification({
                    userId: issue.reporter._id,
                    type: 'issue_resolved',
                    title: 'Issue Resolved',
                    message: `Your reported issue "${issue.title}" has been resolved`,
                    relatedId: assignment.issueId,
                    priority: 'medium',
                    actionUrl: `/issues/${assignment.issueId}`,
                    metadata: {
                        assignmentId: assignment._id,
                        resolutionTime: assignment.performance.resolutionTime
                    }
                });
            }

            return {
                success: true,
                assignment,
                message: 'Assignment completed successfully'
            };

        } catch (error) {
            console.error('Error completing assignment:', error);
            throw error;
        }
    }

    /**
     * Transfer assignment to another department/user
     * @param {string} assignmentId - Assignment ID
     * @param {string} userId - User transferring the assignment
     * @param {Object} transferData - Transfer data
     * @returns {Promise<Object>} - Transfer result
     */
    async transferAssignment(assignmentId, userId, transferData) {
        try {
            const {
                newDepartmentId,
                newAssignedTo,
                reason,
                notes = '',
                priority
            } = transferData;

            const assignment = await Assignment.findById(assignmentId);
            if (!assignment) {
                throw new Error('Assignment not found');
            }

            // Check authorization
            const user = await User.findById(userId);
            if (!user.hasPermission('canAssignIssues') && 
                assignment.assignedTo.toString() !== userId.toString()) {
                throw new Error('You are not authorized to transfer this assignment');
            }

            // Validate new department and user
            const newDepartment = await Department.findById(newDepartmentId);
            if (!newDepartment) {
                throw new Error('New department not found');
            }

            const newUser = await User.findById(newAssignedTo);
            if (!newUser) {
                throw new Error('New assigned user not found');
            }

            if (!newDepartment.members.includes(newAssignedTo)) {
                throw new Error('New user does not belong to the specified department');
            }

            // Transfer current assignment
            await assignment.transfer({
                departmentId: newDepartmentId,
                userId: newAssignedTo,
                reason,
                transferredBy: userId
            });

            // Create new assignment
            const newAssignment = await this.assignIssue({
                issueId: assignment.issueId,
                assignedTo: newAssignedTo,
                assignedBy: userId,
                departmentId: newDepartmentId,
                priority: priority || assignment.priority,
                notes: `Transferred from ${assignment.departmentId}: ${reason}`,
                metadata: {
                    assignmentSource: 'transfer',
                    originalAssignmentId: assignmentId,
                    transferReason: reason
                }
            });

            // Log activity
            await ActivityLog.logActivity({
                issueId: assignment.issueId,
                actionType: 'assignment_transferred',
                performedBy: userId,
                targetUser: newAssignedTo,
                departmentId: newDepartmentId,
                actionDetails: {
                    previousValue: {
                        department: assignment.departmentId,
                        assignedTo: assignment.assignedTo
                    },
                    newValue: {
                        department: newDepartmentId,
                        assignedTo: newAssignedTo
                    },
                    reason,
                    notes
                },
                relatedEntities: {
                    assignmentId: newAssignment.assignment._id
                }
            });

            return {
                success: true,
                oldAssignment: assignment,
                newAssignment: newAssignment.assignment,
                message: 'Assignment transferred successfully'
            };

        } catch (error) {
            console.error('Error transferring assignment:', error);
            throw error;
        }
    }

    /**
     * Escalate assignment
     * @param {string} assignmentId - Assignment ID
     * @param {string} userId - User escalating the assignment
     * @param {Object} escalationData - Escalation data
     * @returns {Promise<Object>} - Escalation result
     */
    async escalateAssignment(assignmentId, userId, escalationData) {
        try {
            const { reason, escalationLevel = 1, notes = '' } = escalationData;

            const assignment = await Assignment.findById(assignmentId);
            if (!assignment) {
                throw new Error('Assignment not found');
            }

            await assignment.escalate({
                escalatedBy: userId,
                reason,
                escalationLevel
            });

            // Log activity
            await ActivityLog.logActivity({
                issueId: assignment.issueId,
                actionType: 'assignment_escalated',
                performedBy: userId,
                departmentId: assignment.departmentId,
                actionDetails: {
                    reason,
                    notes,
                    metadata: {
                        escalationLevel: assignment.escalation.escalationLevel,
                        newPriority: assignment.priority
                    }
                },
                relatedEntities: {
                    assignmentId: assignment._id
                },
                severity: 'high'
            });

            // Notify department head and higher management
            const department = await Department.findById(assignment.departmentId);
            if (department && department.head) {
                await notificationService.createNotification({
                    userId: department.head,
                    type: 'assignment_escalated',
                    title: 'Assignment Escalated',
                    message: `Assignment has been escalated: ${reason}`,
                    relatedId: assignment.issueId,
                    priority: 'high',
                    actionUrl: `/admin/assignments/${assignmentId}`,
                    metadata: {
                        escalationLevel: assignment.escalation.escalationLevel,
                        reason
                    }
                });
            }

            return {
                success: true,
                assignment,
                message: 'Assignment escalated successfully'
            };

        } catch (error) {
            console.error('Error escalating assignment:', error);
            throw error;
        }
    }

    /**
     * Get user assignments
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - User assignments
     */
    async getUserAssignments(userId, options = {}) {
        try {
            return await Assignment.getByUser(userId, options);
        } catch (error) {
            console.error('Error getting user assignments:', error);
            throw error;
        }
    }

    /**
     * Get department assignments
     * @param {string} departmentId - Department ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - Department assignments
     */
    async getDepartmentAssignments(departmentId, options = {}) {
        try {
            return await Assignment.getByDepartment(departmentId, options);
        } catch (error) {
            console.error('Error getting department assignments:', error);
            throw error;
        }
    }

    /**
     * Get overdue assignments
     * @param {string} departmentId - Optional department filter
     * @returns {Promise<Array>} - Overdue assignments
     */
    async getOverdueAssignments(departmentId = null) {
        try {
            return await Assignment.getOverdue(departmentId);
        } catch (error) {
            console.error('Error getting overdue assignments:', error);
            throw error;
        }
    }

    /**
     * Get assignment statistics
     * @param {Object} options - Options
     * @returns {Promise<Object>} - Assignment statistics
     */
    async getAssignmentStats(options = {}) {
        try {
            return await Assignment.getStats(options.departmentId, options.timeframe);
        } catch (error) {
            console.error('Error getting assignment stats:', error);
            throw error;
        }
    }

    /**
     * Auto-escalation check for overdue assignments
     */
    async checkForAutoEscalation() {
        try {
            const overdueAssignments = await Assignment.find({
                slaDeadline: { $lt: new Date() },
                status: { $in: ['assigned', 'accepted', 'in_progress'] },
                'escalation.isEscalated': false,
                isActive: true
            });

            for (const assignment of overdueAssignments) {
                await this.escalateAssignment(assignment._id, null, {
                    reason: 'Automatic escalation due to SLA violation',
                    escalationLevel: 1
                });

                // Log system activity
                await ActivityLog.logActivity({
                    issueId: assignment.issueId,
                    actionType: 'auto_escalation',
                    performedBy: null, // System action
                    departmentId: assignment.departmentId,
                    actionDetails: {
                        reason: 'SLA violation detected',
                        metadata: {
                            automatedAction: true,
                            slaDeadline: assignment.slaDeadline,
                            overdueBy: Math.round((new Date() - assignment.slaDeadline) / (1000 * 60)) // minutes
                        }
                    },
                    relatedEntities: {
                        assignmentId: assignment._id
                    },
                    severity: 'high',
                    category: 'system'
                });
            }

            if (overdueAssignments.length > 0) {
                console.log(`Auto-escalated ${overdueAssignments.length} overdue assignments`);
            }

        } catch (error) {
            console.error('Error in auto-escalation check:', error);
        }
    }
}

module.exports = new AssignmentService();