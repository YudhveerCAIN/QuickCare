const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Issue description is required']
    },
    category: {
        primary: {
            type: String,
            required: [true, 'Primary category is required'],
            enum: ['road', 'water', 'electricity', 'public safety', 'sanitation', 'infrastructure', 'other']
        },
        secondary: {
            type: String,
            trim: true
        }
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    address: { 
        type: String, 
        required: true 
    },
    lat: { 
        type: Number, 
        required: true 
    },
    lng: { 
        type: Number, 
        required: true 
    },
    landmark: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['Open', 'In Progress', 'Under Review', 'Resolved', 'Closed'],
        default: 'Open'
    },
    images: [{
        filename: String,
        originalName: String,
        url: String,
        size: Number,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    department: {
        type: String,
        trim: true
    },
    trackingNumber: {
        type: String,
        unique: true,
        required: true
    },
    tags: [String],
    statusHistory: [{
        status: {
            type: String,
            required: true
        },
        reason: String,
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    }],
    estimatedResolutionDate: {
        type: Date
    },
    actualResolutionDate: {
        type: Date
    },
    resolutionNotes: {
        type: String
    },
    resolutionImages: [String],
    feedback: {
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        submittedAt: Date
    },
    metadata: {
        source: {
            type: String,
            default: 'Web'
        },
        ipAddress: String,
        userAgent: String
    },
    isModerated: {
        type: Boolean,
        default: false
    },
    moderationNotes: {
        type: String
    },
    moderatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

// Indexes for better performance
issueSchema.index({ lat: 1, lng: 1 });
issueSchema.index({ status: 1 });
issueSchema.index({ submittedBy: 1 });
issueSchema.index({ assignedTo: 1 });
issueSchema.index({ "category.primary": 1 });
issueSchema.index({ trackingNumber: 1 });

// Instance method to update status with history
issueSchema.methods.updateStatus = function(newStatus, reason, updatedBy) {
    this.statusHistory.push({
        status: this.status,
        reason: reason || '',
        updatedBy: updatedBy,
        updatedAt: new Date()
    });
    
    this.status = newStatus;
    
    if (newStatus === 'Resolved') {
        this.actualResolutionDate = new Date();
    }
    
    return this.save();
};

module.exports = mongoose.model('Issue', issueSchema);