import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

const Analytics = () => {
    console.log('Analytics component loaded');
    
    const [analytics, setAnalytics] = useState({
        issuesByStatus: {},
        issuesByCategory: {},
        issuesByPriority: {},
        monthlyTrends: [],
        resolutionTimes: {},
        userEngagement: {}
    });
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30'); // days

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            // Use admin API to get analytics data
            const analyticsRes = await adminAPI.getAnalytics(timeRange);
            const dashboardRes = await adminAPI.getDashboardStats();
            
            const analyticsData = analyticsRes.data.analytics || {};
            const dashboardData = dashboardRes.data.stats || {};
            
            // Combine the data
            const combinedAnalytics = {
                issuesByStatus: analyticsData.issuesByStatus || {},
                issuesByCategory: analyticsData.issuesByCategory || {},
                issuesByPriority: analyticsData.issuesByPriority || {},
                monthlyTrends: generateMonthlyTrends(dashboardData.recentIssues || []),
                resolutionTimes: {
                    average: analyticsData.resolutionTimes?.length > 0 
                        ? analyticsData.resolutionTimes.reduce((a, b) => a + b, 0) / analyticsData.resolutionTimes.length 
                        : 0,
                    total: analyticsData.resolutionTimes?.length || 0
                },
                userEngagement: {
                    totalUsers: analyticsData.userEngagement?.totalUsers || dashboardData.totalUsers || 0,
                    activeReporters: analyticsData.userEngagement?.activeReporters || 0,
                    averageIssuesPerUser: analyticsData.userEngagement?.averageIssuesPerUser || 0,
                    averageIssuesPerReporter: analyticsData.userEngagement?.averageIssuesPerReporter || 0
                },
                totalIssues: analyticsData.totalIssues || dashboardData.totalIssues || 0
            };
            
            setAnalytics(combinedAnalytics);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            
            // Set default values on error
            setAnalytics({
                issuesByStatus: {},
                issuesByCategory: {},
                issuesByPriority: {},
                monthlyTrends: [],
                resolutionTimes: { average: 0, total: 0 },
                userEngagement: { 
                    totalUsers: 0, 
                    activeReporters: 0, 
                    averageIssuesPerUser: 0,
                    averageIssuesPerReporter: 0 
                },
                totalIssues: 0
            });
        } finally {
            setLoading(false);
        }
    };

    const generateMonthlyTrends = (issues) => {
        const monthlyTrends = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            
            const monthIssues = issues.filter(issue => {
                const issueDate = new Date(issue.createdAt);
                return issueDate.getFullYear() === date.getFullYear() && 
                       issueDate.getMonth() === date.getMonth();
            });

            monthlyTrends.push({
                month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                issues: monthIssues.length,
                resolved: monthIssues.filter(i => i.status === 'Resolved').length
            });
        }
        return monthlyTrends;
    };



    const renderBarChart = (data, title, colorClass = 'bg-blue-500') => {
        const entries = Object.entries(data || {});
        const maxValue = entries.length > 0 ? Math.max(...Object.values(data)) : 1;
        
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
                <div className="space-y-3">
                    {entries.length > 0 ? entries.map(([key, value]) => (
                        <div key={key} className="flex items-center">
                            <div className="w-24 text-sm text-gray-600 truncate">{key}</div>
                            <div className="flex-1 mx-3">
                                <div className="bg-gray-200 rounded-full h-4">
                                    <div 
                                        className={`${colorClass} h-4 rounded-full transition-all duration-300`}
                                        style={{ width: `${(value / maxValue) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                            <div className="w-8 text-sm font-medium text-gray-900">{value}</div>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-gray-500">
                            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <p className="text-sm">No data available</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white p-6 rounded-lg shadow-md">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                                <div className="space-y-2">
                                    {[...Array(4)].map((_, j) => (
                                        <div key={j} className="h-3 bg-gray-200 rounded"></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                        <p className="text-gray-600 mt-2">Insights and trends for issue management</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <label className="text-sm font-medium text-gray-700">Time Range:</label>
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="7">Last 7 days</option>
                            <option value="30">Last 30 days</option>
                            <option value="90">Last 90 days</option>
                            <option value="365">Last year</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Issues</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {analytics.totalIssues || Object.values(analytics.issuesByStatus || {}).reduce((a, b) => a + b, 0)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-green-100 text-green-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {(() => {
                                    const totalIssues = analytics.totalIssues || Object.values(analytics.issuesByStatus || {}).reduce((a, b) => a + b, 0);
                                    const resolvedIssues = analytics.issuesByStatus?.Resolved || 0;
                                    return totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;
                                })()}%
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Avg Resolution Time</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {Math.round(analytics.resolutionTimes.average || 0)} days
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Active Users</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {analytics.userEngagement?.activeReporters || 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {renderBarChart(analytics.issuesByStatus, 'Issues by Status', 'bg-blue-500')}
                {renderBarChart(analytics.issuesByPriority, 'Issues by Priority', 'bg-red-500')}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {renderBarChart(analytics.issuesByCategory, 'Issues by Category', 'bg-green-500')}
                
                {/* Monthly Trends */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Trends</h3>
                    <div className="space-y-4">
                        {analytics.monthlyTrends.map((month, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">{month.month}</span>
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                                        <span className="text-sm text-gray-900">{month.issues} reported</span>
                                    </div>
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                        <span className="text-sm text-gray-900">{month.resolved} resolved</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* User Engagement Stats */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">User Engagement</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                            {analytics.userEngagement?.totalUsers || 0}
                        </div>
                        <div className="text-sm text-gray-600">Total Users</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                            {analytics.userEngagement?.activeReporters || 0}
                        </div>
                        <div className="text-sm text-gray-600">Active Reporters</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">
                            {(() => {
                                const avgIssues = analytics.userEngagement?.averageIssuesPerUser || 0;
                                return isNaN(avgIssues) ? 0 : Math.round(avgIssues * 10) / 10;
                            })()}
                        </div>
                        <div className="text-sm text-gray-600">Avg Issues per User</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;