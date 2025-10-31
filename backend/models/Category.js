const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  color: {
    type: String,
    default: '#3B82F6' // Default blue color
  },
  icon: {
    type: String,
    default: 'default'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  estimatedResolutionTime: {
    type: Number, // in hours
    default: 72
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
categorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get active categories
categorySchema.statics.getActiveCategories = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to get categories by department
categorySchema.statics.getCategoriesByDepartment = function(departmentId) {
  return this.find({ department: departmentId, isActive: true }).sort({ name: 1 });
};

// Instance method to deactivate category
categorySchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Instance method to activate category
categorySchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;