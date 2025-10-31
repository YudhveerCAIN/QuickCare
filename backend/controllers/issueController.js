const Issue = require("../models/Issue");

exports.createIssue = async (req, res) => {
  try {
    console.log('Create issue request received');
    console.log('User:', req.user ? req.user.id : 'No user');
    console.log('Body:', req.body);
    console.log('Files:', req.files ? req.files.length : 'No files');
    
    const {
      title,
      description,
      category,
      priority,
      address,
      lat,
      lng,
      landmark
    } = req.body;

    // Generate tracking number
    const trackingNumber = 'ISS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();

    // Process uploaded images from Cloudinary
    const images = req.uploadedFiles || [];

    // Create the issue
    const issue = new Issue({
      title,
      description,
      category: {
        primary: category
      },
      priority,
      address,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      landmark,
      images,
      submittedBy: req.user.id,
      trackingNumber,
      statusHistory: [{
        status: 'Open',
        reason: 'Issue created',
        updatedBy: req.user.id
      }]
    });

    const savedIssue = await issue.save();
    
    res.status(201).json({
      success: true,
      message: 'Issue created successfully',
      data: {
        id: savedIssue._id,
        trackingNumber: savedIssue.trackingNumber,
        title: savedIssue.title,
        status: savedIssue.status
      }
    });
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating issue',
      error: error.message
    });
  }
};

exports.getIssues = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      category, 
      priority,
      search 
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    let query = {};
    
    if (status) query.status = status;
    if (category) query['category.primary'] = category;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { trackingNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Get issues with pagination
    const issues = await Issue.find(query)
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalItems = await Issue.countDocuments(query);
    const totalPages = Math.ceil(totalItems / parseInt(limit));
    
    res.json({
      success: true,
      issues,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting issues',
      error: error.message
    });
  }
};

// Add other placeholder methods
exports.getIssueById = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('statusHistory.updatedBy', 'name email');
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }
    
    res.json({
      success: true,
      issue
    });
  } catch (error) {
    console.error('Get issue by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting issue',
      error: error.message
    });
  }
};

exports.updateIssue = (req, res) => {
  res.json({ success: true, message: 'Update issue working' });
};

exports.deleteIssue = (req, res) => {
  res.json({ success: true, message: 'Delete issue working' });
};

exports.assignIssue = (req, res) => {
  res.json({ success: true, message: 'Assign issue working' });
};

exports.updateIssueStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const issueId = req.params.id;
    const userId = req.user.id;

    // Validate status
    const validStatuses = ['Open', 'In Progress', 'Under Review', 'Resolved', 'Closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // Check permissions
    const canUpdate = req.user.role === 'admin' || 
                     req.user.role === 'system_admin' || 
                     issue.assignedTo?.toString() === userId ||
                     issue.submittedBy.toString() === userId;

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this issue status'
      });
    }

    // Update status using the model method
    await issue.updateStatus(status, reason, userId);

    // Populate the updated issue
    const updatedIssue = await Issue.findById(issueId)
      .populate('submittedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('statusHistory.updatedBy', 'name email');

    res.json({
      success: true,
      message: 'Issue status updated successfully',
      issue: updatedIssue
    });
  } catch (error) {
    console.error('Update issue status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating issue status',
      error: error.message
    });
  }
};

exports.getMyIssues = (req, res) => {
  res.json({ success: true, message: 'Get my issues working' });
};

exports.getAssignedIssues = (req, res) => {
  res.json({ success: true, message: 'Get assigned issues working' });
};

exports.moderateIssue = (req, res) => {
  res.json({ success: true, message: 'Moderate issue working' });
};

exports.createBulkOperation = (req, res) => {
  res.json({ success: true, message: 'Bulk operation working' });
};

exports.getIssueTimeline = async (req, res) => {
  try {
    const issueId = req.params.id;
    
    const issue = await Issue.findById(issueId)
      .populate('statusHistory.updatedBy', 'name email')
      .select('statusHistory');
    
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    // Get comments for this issue
    const Comment = require('../models/Comment');
    const comments = await Comment.find({ 
      issueId, 
      isDeleted: false,
      moderationStatus: { $in: ['approved', 'pending'] }
    })
      .populate('userId', 'name email')
      .sort({ createdAt: 1 });

    // Convert status history to timeline format
    const statusTimeline = issue.statusHistory.map(entry => ({
      id: `status-${entry._id}`,
      actionType: 'status_change',
      description: `Status changed to ${entry.status}${entry.reason ? `: ${entry.reason}` : ''}`,
      performedBy: entry.updatedBy,
      createdAt: entry.updatedAt
    }));

    // Convert comments to timeline format
    const commentTimeline = comments.map(comment => ({
      id: `comment-${comment._id}`,
      commentId: comment._id,
      actionType: 'comment',
      description: comment.text,
      performedBy: comment.userId,
      createdAt: comment.createdAt,
      canDelete: true // Flag to indicate this is a deletable comment
    }));

    // Combine and sort by date (newest first)
    const timeline = [...statusTimeline, ...commentTimeline];
    timeline.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      timeline
    });
  } catch (error) {
    console.error('Get issue timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting issue timeline',
      error: error.message
    });
  }
};

exports.getIssueAssignments = (req, res) => {
  res.json({ success: true, message: 'Issue assignments working' });
};