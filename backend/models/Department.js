const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Department name is required'],
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    head: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    categories: [{
        type: String,
        enum: ['road', 'water', 'electricity', 'public safety', 'other']
    }],
    contactInfo: {
        email: String,
        phone: String,
        address: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    location: {
        lat: Number,
        lng: Number,
        address: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
