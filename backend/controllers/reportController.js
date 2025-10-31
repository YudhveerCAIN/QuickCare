const Issue = require('../models/Issue');
const User = require('../models/User');
const Comment = require('../models/Comment');

exports.issuesByCategory = async (req, res) => {
  try {
    const data = await Issue.aggregate([
      { $group: { _id: "$category.primary", total: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: "Error generating category report", 
      error: err.message 
    });
  }
};

exports.issuesByLocation = async (req, res) => {
  try {
    const data = await Issue.aggregate([
      { $group: { _id: "$location.address", total: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: "Error generating location report", 
      error: err.message 
    });
  }
};

exports.monthlyTrends = async (req, res) => {
  try {
    const data = await Issue.aggregate([
      {
        $group: {
          _id: { 
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          total: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: "Error generating monthly trends", 
      error: err.message 
    });
  }
};

// New analytics functions
exports.dashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const [
      totalIssues,
      statusDistribution,
      priorityDistribution,
      recentIssues
    ] = await Promise.all([
      Issue.countDocuments(dateFilter),
      Issue.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Issue.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$priority", count: { $sum: 1 } } }
      ]),
      Issue.find(dateFilter)
        .populate('submittedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10)
    ]);

    res.json({
      success: true,
      data: {
        totalIssues,
        statusDistribution,
        priorityDistribution,
        recentIssues
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: "Error generating dashboard stats", 
      error: err.message 
    });
  }
};

exports.resolutionMetrics = async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    const matchFilter = {};
    
    if (startDate && endDate) {
      matchFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (department) {
      matchFilter.department = department;
    }

    const resolutionData = await Issue.aggregate([
      { $match: { ...matchFilter, status: 'Resolved' } },
      {
        $addFields: {
          resolutionTime: {
            $subtract: [
              { $dateFromString: { dateString: "$resolvedAt" } },
              "$createdAt"
            ]
          }
        }
      },
      {
        $group: {
          _id: "$department",
          avgResolutionTime: { $avg: "$resolutionTime" },
          totalResolved: { $sum: 1 },
          minResolutionTime: { $min: "$resolutionTime" },
          maxResolutionTime: { $max: "$resolutionTime" }
        }
      }
    ]);

    // Convert milliseconds to hours
    const formattedData = resolutionData.map(dept => ({
      ...dept,
      avgResolutionTime: Math.round(dept.avgResolutionTime / (1000 * 60 * 60) * 100) / 100,
      minResolutionTime: Math.round(dept.minResolutionTime / (1000 * 60 * 60) * 100) / 100,
      maxResolutionTime: Math.round(dept.maxResolutionTime / (1000 * 60 * 60) * 100) / 100
    }));

    res.json({
      success: true,
      data: formattedData
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: "Error generating resolution metrics", 
      error: err.message 
    });
  }
};

exports.heatmapData = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const matchFilter = {};
    
    if (startDate && endDate) {
      matchFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (category) {
      matchFilter['category.primary'] = category;
    }

    const heatmapData = await Issue.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            lat: "$location.coordinates.latitude",
            lng: "$location.coordinates.longitude",
            address: "$location.address"
          },
          count: { $sum: 1 },
          categories: { $addToSet: "$category.primary" },
          priorities: { $addToSet: "$priority" }
        }
      },
      {
        $project: {
          _id: 0,
          lat: "$_id.lat",
          lng: "$_id.lng",
          address: "$_id.address",
          count: 1,
          intensity: { $min: [{ $divide: ["$count", 10] }, 1] }, // Normalize intensity
          categories: 1,
          priorities: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: heatmapData
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: "Error generating heatmap data", 
      error: err.message 
    });
  }
};

exports.engagementMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const [
      totalUsers,
      activeReporters,
      totalComments,
      avgIssuesPerUser
    ] = await Promise.all([
      User.countDocuments({ role: 'Citizen' }),
      Issue.distinct('submittedBy', dateFilter).then(users => users.length),
      Comment.countDocuments(dateFilter),
      Issue.aggregate([
        { $match: dateFilter },
        { $group: { _id: "$submittedBy", issueCount: { $sum: 1 } } },
        { $group: { _id: null, avgIssues: { $avg: "$issueCount" } } }
      ])
    ]);

    const userEngagement = await Issue.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: "$submittedBy",
          issueCount: { $sum: 1 },
          lastActivity: { $max: "$createdAt" }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          email: '$user.email',
          issueCount: 1,
          lastActivity: 1
        }
      },
      { $sort: { issueCount: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeReporters,
        totalComments,
        avgIssuesPerUser: avgIssuesPerUser[0]?.avgIssues || 0,
        topReporters: userEngagement
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: "Error generating engagement metrics", 
      error: err.message 
    });
  }
};

exports.exportReport = async (req, res) => {
  try {
    const { format } = req.params;
    const { startDate, endDate, reportType = 'summary' } = req.query;
    
    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported format. Use csv or json.'
      });
    }

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let reportData;
    
    switch (reportType) {
      case 'issues':
        reportData = await Issue.find(dateFilter)
          .populate('submittedBy', 'firstName lastName email')
          .populate('assignedTo', 'firstName lastName email')
          .lean();
        break;
      case 'summary':
      default:
        const [issues, categories, locations, trends] = await Promise.all([
          Issue.countDocuments(dateFilter),
          Issue.aggregate([
            { $match: dateFilter },
            { $group: { _id: "$category.primary", count: { $sum: 1 } } }
          ]),
          Issue.aggregate([
            { $match: dateFilter },
            { $group: { _id: "$location.address", count: { $sum: 1 } } }
          ]),
          Issue.aggregate([
            { $match: dateFilter },
            {
              $group: {
                _id: { 
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" }
                },
                count: { $sum: 1 }
              }
            }
          ])
        ]);
        
        reportData = {
          totalIssues: issues,
          categoriesBreakdown: categories,
          locationsBreakdown: locations,
          monthlyTrends: trends,
          generatedAt: new Date(),
          dateRange: { startDate, endDate }
        };
        break;
    }

    if (format === 'csv') {
      // For CSV, we'll need to flatten the data
      // This is a simplified CSV export - in production you'd use a proper CSV library
      let csvContent = '';
      
      if (reportType === 'issues') {
        csvContent = 'ID,Title,Category,Status,Priority,Location,Created,Reporter\n';
        reportData.forEach(issue => {
          csvContent += `"${issue._id}","${issue.title}","${issue.category.primary}","${issue.status}","${issue.priority}","${issue.location.address}","${issue.createdAt}","${issue.submittedBy?.firstName} ${issue.submittedBy?.lastName}"\n`;
        });
      } else {
        csvContent = 'Report Type,Summary\n';
        csvContent += `"Total Issues","${reportData.totalIssues}"\n`;
        csvContent += `"Generated At","${reportData.generatedAt}"\n`;
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="quickcare-report-${Date.now()}.csv"`);
      res.send(csvContent);
    } else {
      res.json({
        success: true,
        data: reportData
      });
    }
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: "Error exporting report", 
      error: err.message 
    });
  }
};