const Issue = require("../models/Issue");
const User = require("../models/User");

exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's issue statistics
    const myIssuesCount = await Issue.countDocuments({ submittedBy: userId });
    const resolvedCount = await Issue.countDocuments({ 
      submittedBy: userId, 
      status: 'Resolved' 
    });
    const inProgressCount = await Issue.countDocuments({ 
      submittedBy: userId, 
      status: 'In Progress' 
    });
    const openCount = await Issue.countDocuments({ 
      submittedBy: userId, 
      status: 'Open' 
    });

    // Get community-wide statistics for context
    const totalCommunityIssues = await Issue.countDocuments();
    const totalResolvedIssues = await Issue.countDocuments({ status: 'Resolved' });

    res.json({
      success: true,
      stats: {
        myIssues: myIssuesCount,
        resolved: resolvedCount,
        inProgress: inProgressCount,
        open: openCount,
        community: {
          totalIssues: totalCommunityIssues,
          totalResolved: totalResolvedIssues
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    
    // Get recent issues submitted by the user
    const recentIssues = await Issue.find({ submittedBy: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('title status createdAt updatedAt trackingNumber')
      .lean();

    // Get recent status updates on user's issues
    const issuesWithUpdates = await Issue.find({ 
      submittedBy: userId,
      'statusHistory.1': { $exists: true } // Has at least 2 status entries (initial + update)
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select('title status statusHistory trackingNumber')
      .lean();

    // Get recent comments made by the user
    const Comment = require("../models/Comment");
    const recentComments = await Comment.find({ 
      userId: userId,
      isDeleted: false,
      moderationStatus: { $in: ['approved', 'pending'] }
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('issueId', 'title trackingNumber')
      .select('text createdAt issueId')
      .lean();

    // Format activity items
    const activities = [];

    // Add recent issue submissions
    recentIssues.forEach(issue => {
      activities.push({
        id: `issue-${issue._id}`,
        type: 'issue_created',
        title: 'New issue reported',
        description: `${issue.title}`,
        timestamp: issue.createdAt,
        status: issue.status,
        trackingNumber: issue.trackingNumber,
        issueId: issue._id,
        icon: 'plus',
        color: 'blue'
      });
    });

    // Add recent status updates
    issuesWithUpdates.forEach(issue => {
      const latestStatusChange = issue.statusHistory[issue.statusHistory.length - 1];
      if (latestStatusChange && latestStatusChange.updatedAt > issue.createdAt) {
        activities.push({
          id: `status-${issue._id}`,
          type: 'status_update',
          title: `Issue ${issue.status.toLowerCase()}`,
          description: `${issue.title}`,
          timestamp: latestStatusChange.updatedAt,
          status: issue.status,
          trackingNumber: issue.trackingNumber,
          issueId: issue._id,
          icon: issue.status === 'Resolved' ? 'check' : 'clock',
          color: issue.status === 'Resolved' ? 'green' : 'yellow'
        });
      }
    });

    // Add recent comments
    recentComments.forEach(comment => {
      if (comment.issueId) {
        activities.push({
          id: `comment-${comment._id}`,
          type: 'comment_added',
          title: 'Comment added',
          description: `${comment.issueId.title}`,
          commentText: comment.text.length > 50 ? comment.text.substring(0, 50) + '...' : comment.text,
          timestamp: comment.createdAt,
          trackingNumber: comment.issueId.trackingNumber,
          issueId: comment.issueId._id,
          icon: 'message',
          color: 'purple'
        });
      }
    });

    // Sort all activities by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, limit);

    res.json({
      success: true,
      activities: limitedActivities
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent activity',
      error: error.message
    });
  }
};

exports.getCommunityOverview = async (req, res) => {
  try {
    // Get community-wide statistics
    const totalIssues = await Issue.countDocuments();
    const openIssues = await Issue.countDocuments({ status: 'Open' });
    const inProgressIssues = await Issue.countDocuments({ status: 'In Progress' });
    const resolvedIssues = await Issue.countDocuments({ status: 'Resolved' });
    
    // Get recent community activity (all users)
    const recentCommunityIssues = await Issue.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('submittedBy', 'name')
      .select('title status createdAt submittedBy address category')
      .lean();

    // Get category breakdown
    const categoryStats = await Issue.aggregate([
      {
        $group: {
          _id: '$category.primary',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      overview: {
        stats: {
          total: totalIssues,
          open: openIssues,
          inProgress: inProgressIssues,
          resolved: resolvedIssues
        },
        recentIssues: recentCommunityIssues,
        categories: categoryStats
      }
    });
  } catch (error) {
    console.error('Community overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching community overview',
      error: error.message
    });
  }
};