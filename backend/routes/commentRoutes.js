const express = require('express');
const router = express.Router({ mergeParams: true }); // Important: merge params to access issueId
const Comment = require('../models/Comment');
const Issue = require('../models/Issue');
const { auth } = require('../middlewares/authMiddleware');
const { validateComment, validateObjectId } = require('../middlewares/validationMiddleware');

// GET /api/issues/:issueId/comments - Get all comments for an issue
router.get('/', async (req, res) => {
  try {
    const { issueId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const comments = await Comment.find({ 
      issueId, 
      isDeleted: false,
      moderationStatus: { $in: ['approved', 'pending'] }
    })
      .populate('userId', 'name email')
      .populate('parentComment')
      .sort({ createdAt: 1 }) // Oldest first for chronological order
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalComments = await Comment.countDocuments({ 
      issueId, 
      isDeleted: false,
      moderationStatus: { $in: ['approved', 'pending'] }
    });
    
    res.json({
      success: true,
      comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalComments / parseInt(limit)),
        totalItems: totalComments,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching comments',
      error: error.message
    });
  }
});

// POST /api/issues/:issueId/comments - Add a new comment
router.post('/', auth, validateComment, async (req, res) => {
  try {
    const { issueId } = req.params;
    const { text, parentComment } = req.body;
    const userId = req.user.id;
    
    // Check if issue exists
    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }
    
    // Create comment
    const comment = new Comment({
      issueId,
      userId,
      text: text.trim(),
      parentComment: parentComment || null,
      moderationStatus: 'approved' // Auto-approve for now
    });
    
    const savedComment = await comment.save();
    
    // Populate the saved comment
    const populatedComment = await Comment.findById(savedComment._id)
      .populate('userId', 'name email')
      .populate('parentComment');
    
    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: populatedComment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: error.message
    });
  }
});

// PUT /api/issues/:issueId/comments/:commentId - Update a comment
router.put('/:commentId', auth, validateObjectId, validateComment, async (req, res) => {
  try {
    const { issueId, commentId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;
    
    const comment = await Comment.findOne({ 
      _id: commentId, 
      issueId, 
      isDeleted: false 
    });
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    // Check if user owns the comment or is admin
    if (comment.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own comments'
      });
    }
    
    comment.text = text.trim();
    comment.moderationStatus = 'pending'; // Re-moderate edited comments
    await comment.save();
    
    const updatedComment = await Comment.findById(commentId)
      .populate('userId', 'name email')
      .populate('parentComment');
    
    res.json({
      success: true,
      message: 'Comment updated successfully',
      comment: updatedComment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating comment',
      error: error.message
    });
  }
});

// DELETE /api/issues/:issueId/comments/:commentId - Delete a comment
router.delete('/:commentId', auth, validateObjectId, async (req, res) => {
  try {
    const { issueId, commentId } = req.params;
    const userId = req.user.id;
    
    const comment = await Comment.findOne({ 
      _id: commentId, 
      issueId, 
      isDeleted: false 
    });
    
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }
    
    // Check if user owns the comment or is admin
    if (comment.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own comments'
      });
    }
    
    comment.isDeleted = true;
    comment.deletedBy = userId;
    await comment.save();
    
    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting comment',
      error: error.message
    });
  }
});

module.exports = router;