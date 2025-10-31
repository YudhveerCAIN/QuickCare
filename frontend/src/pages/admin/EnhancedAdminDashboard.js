import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { adminAPI } from '../../services/api';
import { Link } from 'react-router-dom';

const EnhancedAdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalIssues: 0,
        openIssues: 0,
        inProgressIssues: 0,
        resolvedIssues: 0,
        totalUsers: 0,
        recentIssues: []
    });
    const [loading, setLoading] = useState(true);
    const [selectedIssues, setSelectedIssues] = useState([]);
    const [bulkAction, setBulkAction] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getDashboardStats();
            const statsData = response.data.stats || {};
            
            setStats({
                totalIssues: statsData.totalIssues || 0,
                openIssues: statsData.openIssues || 0,
                inProgressIssues: statsData.inProgressIssues || 0,
                resolvedIssues: statsData.resolvedIssues || 0,
                totalUsers: statsData.totalUsers || 0,
                recentIssues: statsData.recentIssues || []
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setStats({
                totalIssues: 0,
                openIssues: 0,
                inProgressIssues: 0,
                resolvedIssues: 0,
                totalUsers: 0,
                recentIssues: []
            });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (issueId, newStatus) => {
        try {
            await adminAPI.bulkUpdateIssues([issueId], { status: newStatus });
            fetchDashboardData();
        } catch (error) {
            console.error('Error updating issue status:', error);
        }
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedIssues.length === 0) return;

        try {
            await adminAPI.bulkUpdateIssues(selectedIssues, { status: bulkAction });
            setSelectedIssues([]);
            setBulkAction('');
            fetchDashboardData();
        } catch (error) {
            console.error('Error performing bulk action:', error);
        }
    };

    const toggleIssueSelection = (issueId) => {
        setSelectedIssues(prev => 
            prev.includes(issueId) 
                ? prev.filter(id => id !== issueId)
                : [...prev, issueId]
        );
    };

    const getStatusColor = (status) => {
        const colors = {
            'Open': 'bg-red-100 text-red-800',
            'In Progress': 'bg-yellow-100 text-yellow-800',
            'Under Review': 'bg-purple-100 text-purple-800',
            'Resolved': 'bg-green-100 text-green-800',
            'Closed': 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            'low': 'text-blue-600',
            'medium': 'text-yellow-600',
            'high': 'text-orange-600',
            'urgent': 'text-red-600'
        };
        return colors[priority] || 'text-gray-600';
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white p-6 rounded-lg shadow-md">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
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
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600 mt-2">Welcome back, {user?.name}</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Link
                    to="/create-issue"
                    className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg shadow-md transition-colors flex items-center justify-center"
                >
                    <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <div>
                        <div className="text-lg font-semibold">Create Issue</div>
                        <div className="text-sm opacity-90">Report a new issue</div>
                    </div>
                </Link>
                
                <Link
                    to="/users"
                    className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg shadow-md transition-colors flex items-center justify-center"
                >
                    <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <div>
                        <div className="text-lg font-semibold">Manage Users</div>
                        <div className="text-sm opacity-90">User administration</div>
                    </div>
                </Link>
                
                <Link
                    to="/analytics"
                    className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg shadow-md transition-colors flex items-center justify-center"
                >
                    <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <div>
                        <div className="text-lg font-semibold">View Analytics</div>
                        <div className="text-sm opacity-90">System insights</div>
                    </div>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Issues</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalIssues}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-red-100 text-red-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Open Issues</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.openIssues}</p>
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
                            <p className="text-sm font-medium text-gray-600">In Progress</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.inProgressIssues}</p>
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
                            <p className="text-sm font-medium text-gray-600">Resolved</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.resolvedIssues}</p>
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
                            <p className="text-sm font-medium text-gray-600">Total Users</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedIssues.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <span className="text-blue-800 font-medium">
                            {selectedIssues.length} issue(s) selected
                        </span>
                        <div className="flex items-center space-x-3">
                            <select
                                value={bulkAction}
                                onChange={(e) => setBulkAction(e.target.value)}
                                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                            >
                                <option value="">Select Action</option>
                                <option value="In Progress">Mark In Progress</option>
                                <option value="Under Review">Mark Under Review</option>
                                <option value="Resolved">Mark Resolved</option>
                                <option value="Closed">Mark Closed</option>
                            </select>
                            <button
                                onClick={handleBulkAction}
                                disabled={!bulkAction}
                                className="bg-blue-600 text-white px-4 py-1 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                            >
                                Apply
                            </button>
                            <button
                                onClick={() => setSelectedIssues([])}
                                className="text-gray-600 hover:text-gray-800 text-sm"
                            >
                                Clear Selection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Issues Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Issues</h2>
                    <Link
                        to="/issues"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        View All Issues →
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <input
                                        type="checkbox"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedIssues(stats.recentIssues.map(issue => issue._id));
                                            } else {
                                                setSelectedIssues([]);
                                            }
                                        }}
                                        checked={selectedIssues.length === stats.recentIssues.length && stats.recentIssues.length > 0}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Issue
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Priority
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Reporter
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {stats.recentIssues.map((issue) => (
                                <tr key={issue._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedIssues.includes(issue._id)}
                                            onChange={() => toggleIssueSelection(issue._id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <Link
                                                to={`/issues/${issue._id}`}
                                                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                            >
                                                {issue.title}
                                            </Link>
                                            <div className="text-sm text-gray-500 truncate max-w-xs">{issue.description}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(issue.status)}`}>
                                            {issue.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`text-sm font-medium ${getPriorityColor(issue.priority)}`}>
                                            {issue.priority?.charAt(0).toUpperCase() + issue.priority?.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {issue.submittedBy?.name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <select
                                            value={issue.status}
                                            onChange={(e) => handleStatusUpdate(issue._id, e.target.value)}
                                            className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                                        >
                                            <option value="Open">Open</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Under Review">Under Review</option>
                                            <option value="Resolved">Resolved</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EnhancedAdminDashboard;