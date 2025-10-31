const mongoose = require('mongoose');

const bulkOperationSchema = new mongoose.Schema({
    operationType: {
        type: String,
        required: [true, 'Operation type is required'],
        enum: [
            'bulk_status_update',
            'bulk_assignment',
            'bulk_priority_update',
            'bulk_category_update',
            'bulk_delete',
            'bulk_transfer',
            'bulk_escalation',
            'bulk_moderation',
            'bulk_export',
            'bulk_notification'
        ],
        index: true
    },
    initiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Initiated by user is required'],
        index: true
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    },
    targetIssues: [{
        issueId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Issue',
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
            default: 'pending'
        },
        errorMessage: String,
        processedAt: Date
    }],
    operationData: {
        // For status updates
        newStatus: String,
        
        // For assignments
        assignTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        assignToDepartment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department'
        },
        
        // For priority updates
        newPriority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
        },
        
        // For category updates
        newCategory: String,
        
        // For transfers
        transferTo: {
            departmentId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Department'
            },
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        },
        
        // Common fields
        reason: String,
        notes: String,
        
        // Scheduling
        scheduledAt: Date,
        
        // Notification settings
        notifyUsers: { type: Boolean, default: true },
        notificationMessage: String
    },
    filters: {
        // Original filters used to select issues
        category: [String],
        status: [String],
        priority: [String],
        assignedTo: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
        department: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department'
        }],
        dateRange: {
            startDate: Date,
            endDate: Date
        },
        location: {
            coordinates: [Number], // [longitude, latitude]
            radius: Number // in kilometers
        },
        tags: [String],
        customFilters: mongoose.Schema.Types.Mixed
    },
    execution: {
        status: {
            type: String,
            enum: ['queued', 'running', 'completed', 'failed', 'cancelled', 'paused'],
            default: 'queued',
            index: true
        },
        startedAt: Date,
        completedAt: Date,
        pausedAt: Date,
        cancelledAt: Date,
        
        // Progress tracking
        totalItems: { type: Number, default: 0 },
        processedItems: { type: Number, default: 0 },
        successfulItems: { type: Number, default: 0 },
        failedItems: { type: Number, default: 0 },
        skippedItems: { type: Number, default: 0 },
        
        // Performance metrics
        estimatedDuration: Number, // in seconds
        actualDuration: Number, // in seconds
        averageProcessingTime: Number, // per item in milliseconds
        
        // Error handling
        continueOnError: { type: Boolean, default: true },
        maxRetries: { type: Number, default: 3 },
        retryDelay: { type: Number, default: 1000 }, // in milliseconds
        
        // Batch processing
        batchSize: { type: Number, default: 50 },
        currentBatch: { type: Number, default: 0 },
        totalBatches: { type: Number, default: 0 }
    },
    results: {
        summary: {
            totalProcessed: Number,
            successful: Number,
            failed: Number,
            skipped: Number,
            errors: [{
                issueId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Issue'
                },
                error: String,
                timestamp: Date
            }]
        },
        
        // Detailed results for each issue
        details: [{
            issueId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Issue'
            },
            previousValue: mongoose.Schema.Types.Mixed,
            newValue: mongoose.Schema.Types.Mixed,
            success: Boolean,
            error: String,
            processedAt: Date,
            processingTime: Number // in milliseconds
        }],
        
        // Generated reports or exports
        reportUrl: String,
        exportUrl: String,
        
        // Rollback information
        rollbackData: [{
            issueId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Issue'
            },
            rollbackValue: mongoose.Schema.Types.Mixed,
            canRollback: { type: Boolean, default: true }
        }]
    },
    validation: {
        preValidation: {
            passed: { type: Boolean, default: false },
            errors: [String],
            warnings: [String]
        },
        
        // Permission checks
        permissions: {
            hasPermission: { type: Boolean, default: false },
            requiredPermissions: [String],
            missingPermissions: [String]
        },
        
        // Impact assessment
        impact: {
            affectedUsers: Number,
            affectedDepartments: Number,
            estimatedImpact: {
                type: String,
                enum: ['low', 'medium', 'high', 'critical']
            }
        }
    },
    approval: {
        required: { type: Boolean, default: false },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        approvedAt: Date,
        approvalNotes: String,
        
        // Auto-approval rules
        autoApproved: { type: Boolean, default: false },
        autoApprovalRule: String
    },
    metadata: {
        source: {
            type: String,
            enum: ['web', 'api', 'scheduled', 'system'],
            default: 'web'
        },
        
        // Request information
        ipAddress: String,
        userAgent: String,
        sessionId: String,
        
        // System information
        serverInstance: String,
        processId: String,
        
        // Audit trail
        auditTrail: [{
            action: String,
            performedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            timestamp: Date,
            details: mongoose.Schema.Types.Mixed
        }]
    },
    
    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
bulkOperationSchema.index({ initiatedBy: 1, createdAt: -1 });
bulkOperationSchema.index({ 'execution.status': 1, createdAt: -1 });
bulkOperationSchema.index({ operationType: 1, createdAt: -1 });
bulkOperationSchema.index({ departmentId: 1, createdAt: -1 });

// Virtual for progress percentage
bulkOperationSchema.virtual('progressPercentage').get(function() {
    if (this.execution.totalItems === 0) return 0;
    return Math.round((this.execution.processedItems / this.execution.totalItems) * 100);
});

// Virtual for estimated time remaining
bulkOperationSchema.virtual('estimatedTimeRemaining').get(function() {
    if (!this.execution.averageProcessingTime || this.execution.processedItems === 0) {
        return null;
    }
    
    const remainingItems = this.execution.totalItems - this.execution.processedItems;
    return Math.round((remainingItems * this.execution.averageProcessingTime) / 1000); // in seconds
});

// Method to start execution
bulkOperationSchema.methods.start = function() {
    this.execution.status = 'running';
    this.execution.startedAt = new Date();
    return this.save();
};

// Method to pause execution
bulkOperationSchema.methods.pause = function() {
    this.execution.status = 'paused';
    this.execution.pausedAt = new Date();
    return this.save();
};

// Method to resume execution
bulkOperationSchema.methods.resume = function() {
    this.execution.status = 'running';
    this.execution.pausedAt = null;
    return this.save();
};

// Method to cancel execution
bulkOperationSchema.methods.cancel = function(cancelledBy, reason) {
    this.execution.status = 'cancelled';
    this.execution.cancelledAt = new Date();
    
    this.metadata.auditTrail.push({
        action: 'cancelled',
        performedBy: cancelledBy,
        timestamp: new Date(),
        details: { reason }
    });
    
    return this.save();
};

// Method to complete execution
bulkOperationSchema.methods.complete = function() {
    this.execution.status = 'completed';
    this.execution.completedAt = new Date();
    
    if (this.execution.startedAt) {
        this.execution.actualDuration = Math.round(
            (this.execution.completedAt.getTime() - this.execution.startedAt.getTime()) / 1000
        );
    }
    
    return this.save();
};

// Method to update progress
bulkOperationSchema.methods.updateProgress = function(processed, successful, failed, skipped) {
    this.execution.processedItems = processed;
    this.execution.successfulItems = successful;
    this.execution.failedItems = failed;
    this.execution.skippedItems = skipped;
    
    // Update average processing time
    if (this.execution.startedAt && processed > 0) {
        const elapsedTime = new Date().getTime() - this.execution.startedAt.getTime();
        this.execution.averageProcessingTime = Math.round(elapsedTime / processed);
    }
    
    return this.save();
};

// Method to add result
bulkOperationSchema.methods.addResult = function(issueId, success, previousValue, newValue, error, processingTime) {
    this.results.details.push({
        issueId,
        success,
        previousValue,
        newValue,
        error,
        processedAt: new Date(),
        processingTime
    });
    
    // Update rollback data if successful
    if (success && previousValue !== undefined) {
        this.results.rollbackData.push({
            issueId,
            rollbackValue: previousValue,
            canRollback: true
        });
    }
    
    return this.save();
};

// Static method to create bulk operation
bulkOperationSchema.statics.createOperation = async function(operationData) {
    const {
        operationType,
        initiatedBy,
        departmentId,
        targetIssues,
        operationData: opData,
        filters
    } = operationData;
    
    const operation = new this({
        operationType,
        initiatedBy,
        departmentId,
        targetIssues: targetIssues.map(issueId => ({ issueId })),
        operationData: opData,
        filters,
        execution: {
            totalItems: targetIssues.length,
            totalBatches: Math.ceil(targetIssues.length / (opData.batchSize || 50))
        }
    });
    
    return await operation.save();
};

// Static method to get user operations
bulkOperationSchema.statics.getUserOperations = async function(userId, options = {}) {
    const {
        status,
        operationType,
        limit = 50,
        skip = 0
    } = options;
    
    const query = { initiatedBy: userId, isDeleted: { $ne: true } };
    
    if (status) query['execution.status'] = status;
    if (operationType) query.operationType = operationType;
    
    return await this.find(query)
        .populate('departmentId', 'name')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};

// Static method to get department operations
bulkOperationSchema.statics.getDepartmentOperations = async function(departmentId, options = {}) {
    const {
        status,
        operationType,
        limit = 50,
        skip = 0
    } = options;
    
    const query = { departmentId, isDeleted: { $ne: true } };
    
    if (status) query['execution.status'] = status;
    if (operationType) query.operationType = operationType;
    
    return await this.find(query)
        .populate('initiatedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};

// Static method to get operation statistics
bulkOperationSchema.statics.getOperationStats = async function(options = {}) {
    const {
        departmentId,
        userId,
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date()
    } = options;
    
    const matchQuery = {
        createdAt: { $gte: startDate, $lte: endDate },
        isDeleted: { $ne: true }
    };
    
    if (departmentId) matchQuery.departmentId = new mongoose.Types.ObjectId(departmentId);
    if (userId) matchQuery.initiatedBy = new mongoose.Types.ObjectId(userId);
    
    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalOperations: { $sum: 1 },
                completedOperations: {
                    $sum: { $cond: [{ $eq: ['$execution.status', 'completed'] }, 1, 0] }
                },
                failedOperations: {
                    $sum: { $cond: [{ $eq: ['$execution.status', 'failed'] }, 1, 0] }
                },
                totalItemsProcessed: { $sum: '$execution.processedItems' },
                totalItemsSuccessful: { $sum: '$execution.successfulItems' },
                avgDuration: { $avg: '$execution.actualDuration' },
                operationsByType: { $push: '$operationType' }
            }
        }
    ]);
    
    return stats[0] || {
        totalOperations: 0,
        completedOperations: 0,
        failedOperations: 0,
        totalItemsProcessed: 0,
        totalItemsSuccessful: 0,
        avgDuration: 0,
        operationsByType: []
    };
};

module.exports = mongoose.model('BulkOperation', bulkOperationSchema);