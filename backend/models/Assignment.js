const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    issueId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Issue',
        required: [true, 'Issue ID is required'],
        index: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Assigned user is required'],
        index: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Assigning user is required']
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: [true, 'Department is required'],
        index: true
    },
    assignmentType: {
        type: String,
        enum: ['primary', 'secondary', 'escalated', 'transferred'],
        default: 'primary'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
        index: true
    },
    status: {
        type: String,
        enum: ['assigned', 'accepted', 'in_progress', 'completed', 'rejected', 'transferred'],
        default: 'assigned',
        index: true
    },
    slaDeadline: {
        type: Date,
        required: [true, 'SLA deadline is required'],
        index: true
    },
    estimatedResolution: {
        type: Date
    },
    actualResolution: {
        type: Date
    },
    workloadScore: {
        type: Number,
        default: 1,
        min: 1,
        max: 10
    },
    notes: {
        type: String,
        trim: true
    },
    acceptedAt: {
        type: Date
    },
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    rejectionReason: {
        type: String,
        trim: true
    },
    transferReason: {
        type: String,
        trim: true
    },
    transferredTo: {
        departmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department'
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        transferredAt: Date,
        transferredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    escalation: {
        isEscalated: { type: Boolean, default: false },
        escalatedAt: Date,
        escalatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        escalationReason: String,
        escalationLevel: {
            type: Number,
            default: 0,
            min: 0,
            max: 3
        }
    },
    performance: {
        responseTime: Number, // Time to accept assignment (in minutes)
        resolutionTime: Number, // Time to complete (in minutes)
        qualityScore: {
            type: Number,
            min: 1,
            max: 5
        },
        citizenFeedback: {
            rating: {
                type: Number,
                min: 1,
                max: 5
            },
            comment: String,
            submittedAt: Date
        }
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    metadata: {
        assignmentSource: {
            type: String,
            enum: ['manual', 'automatic', 'escalation', 'transfer'],
            default: 'manual'
        },
        urgencyFactors: [String],
        specialInstructions: String,
        requiredSkills: [String],
        estimatedEffort: {
            type: String,
            enum: ['low', 'medium', 'high', 'very_high']
        }
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
assignmentSchema.index({ issueId: 1, isActive: 1 });
assignmentSchema.index({ assignedTo: 1, status: 1 });
assignmentSchema.index({ departmentId: 1, status: 1 });
assignmentSchema.index({ slaDeadline: 1, status: 1 });
assignmentSchema.index({ createdAt: -1 });

// Virtual for checking if assignment is overdue
assignmentSchema.virtual('isOverdue').get(function() {
    return this.slaDeadline < new Date() && !['completed', 'rejected'].includes(this.status);
});

// Virtual for calculating time remaining
assignmentSchema.virtual('timeRemaining').get(function() {
    if (['completed', 'rejected'].includes(this.status)) return 0;
    const now = new Date();
    const remaining = this.slaDeadline.getTime() - now.getTime();
    return Math.max(0, Math.floor(remaining / (1000 * 60))); // Return minutes
});

// Method to accept assignment
assignmentSchema.methods.accept = function(acceptedBy, notes = '') {
    this.status = 'accepted';
    this.acceptedAt = new Date();
    this.notes = notes;
    
    // Calculate response time
    const responseTime = (this.acceptedAt.getTime() - this.createdAt.getTime()) / (1000 * 60);
    this.performance.responseTime = Math.round(responseTime);
    
    return this.save();
};

// Method to start work
assignmentSchema.methods.startWork = function() {
    this.status = 'in_progress';
    this.startedAt = new Date();
    return this.save();
};

// Method to complete assignment
assignmentSchema.methods.complete = function(completedBy, notes = '') {
    this.status = 'completed';
    this.completedAt = new Date();
    this.actualResolution = new Date();
    this.notes = notes;
    
    // Calculate resolution time
    if (this.startedAt) {
        const resolutionTime = (this.completedAt.getTime() - this.startedAt.getTime()) / (1000 * 60);
        this.performance.resolutionTime = Math.round(resolutionTime);
    }
    
    return this.save();
};

// Method to reject assignment
assignmentSchema.methods.reject = function(rejectedBy, reason) {
    this.status = 'rejected';
    this.rejectionReason = reason;
    this.isActive = false;
    return this.save();
};

// Method to transfer assignment
assignmentSchema.methods.transfer = function(transferData) {
    this.status = 'transferred';
    this.transferReason = transferData.reason;
    this.transferredTo = {
        departmentId: transferData.departmentId,
        userId: transferData.userId,
        transferredAt: new Date(),
        transferredBy: transferData.transferredBy
    };
    this.isActive = false;
    return this.save();
};

// Method to escalate assignment
assignmentSchema.methods.escalate = function(escalationData) {
    this.escalation = {
        isEscalated: true,
        escalatedAt: new Date(),
        escalatedBy: escalationData.escalatedBy,
        escalationReason: escalationData.reason,
        escalationLevel: (this.escalation.escalationLevel || 0) + 1
    };
    
    // Update priority if escalated
    if (this.priority === 'low') this.priority = 'medium';
    else if (this.priority === 'medium') this.priority = 'high';
    else if (this.priority === 'high') this.priority = 'critical';
    
    return this.save();
};

// Static method to get assignments by department
assignmentSchema.statics.getByDepartment = async function(departmentId, options = {}) {
    const {
        status,
        priority,
        overdue = false,
        limit = 50,
        skip = 0,
        sortBy = 'createdAt',
        sortOrder = -1
    } = options;
    
    const query = { departmentId, isActive: true };
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (overdue) query.slaDeadline = { $lt: new Date() };
    
    return await this.find(query)
        .populate('issueId', 'title category priority status')
        .populate('assignedTo', 'name email')
        .populate('assignedBy', 'name email')
        .sort({ [sortBy]: sortOrder })
        .limit(limit)
        .skip(skip);
};

// Static method to get user assignments
assignmentSchema.statics.getByUser = async function(userId, options = {}) {
    const {
        status,
        priority,
        overdue = false,
        limit = 50,
        skip = 0
    } = options;
    
    const query = { assignedTo: userId, isActive: true };
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (overdue) query.slaDeadline = { $lt: new Date() };
    
    return await this.find(query)
        .populate('issueId', 'title category priority status location')
        .populate('departmentId', 'name')
        .populate('assignedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};

// Static method to get overdue assignments
assignmentSchema.statics.getOverdue = async function(departmentId = null) {
    const query = {
        slaDeadline: { $lt: new Date() },
        status: { $in: ['assigned', 'accepted', 'in_progress'] },
        isActive: true
    };
    
    if (departmentId) query.departmentId = departmentId;
    
    return await this.find(query)
        .populate('issueId', 'title category priority')
        .populate('assignedTo', 'name email')
        .populate('departmentId', 'name')
        .sort({ slaDeadline: 1 });
};

// Static method to get assignment statistics
assignmentSchema.statics.getStats = async function(departmentId = null, timeframe = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);
    
    const matchQuery = { createdAt: { $gte: startDate } };
    if (departmentId) matchQuery.departmentId = new mongoose.Types.ObjectId(departmentId);
    
    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalAssignments: { $sum: 1 },
                completedAssignments: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                overdueAssignments: {
                    $sum: { $cond: [{ $lt: ['$slaDeadline', new Date()] }, 1, 0] }
                },
                avgResponseTime: { $avg: '$performance.responseTime' },
                avgResolutionTime: { $avg: '$performance.resolutionTime' },
                avgQualityScore: { $avg: '$performance.qualityScore' }
            }
        }
    ]);
    
    return stats[0] || {
        totalAssignments: 0,
        completedAssignments: 0,
        overdueAssignments: 0,
        avgResponseTime: 0,
        avgResolutionTime: 0,
        avgQualityScore: 0
    };
};

module.exports = mongoose.model('Assignment', assignmentSchema);