const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  category: String,
  location: String,
  totalIssues: Number,
  generatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);
