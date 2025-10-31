import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { adminAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const AdminIssueList = () => {
    const { user } = useAuth();
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIssues, setSelectedIssues] = useState([]);
    const [bulkAction, setBulkAction] = useState('');
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        category: '',
        search: ''
    });

    useEffect(() => {
        fetchIssues();
    }, [filters]);

    const fetchIssues = async () => {
        try {
            setLoading(true);
            const response = await api.get('/issues', { params: filters });
            setIssues(response.data.issues || []);
        } catch (error) {
            console.error('Error fetching issues:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedIssues.length === 0) return;

        try {
            await adminAPI.bulkUpdateIssues(selectedIssues, { status: bulkAction });
            setSelectedIssues([]);
            setBulkAction('');
            fetchIssues();
        } catch (error) {
            console.error('Error performing bulk action:', error);
        }
    };

    const handleStatusUpdate = async (issueId, newStatus) => {
        try {
            await adminAPI.bulkUpdateIssues([issueId], { status: newStatus });
            fetchIssues();
        } catch (error) {
            console.error('Error updating issue status:', error);
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
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-16 bg-gray-200 rounded"></div>
                            ))}
                        </div>
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
                        <h1 className="text-3xl font-bold text-gray-900">Issue Management</h1>
                        <p className="text-gray-600 mt-2">Manage and track all reported issues</p>
                    </div>
                    <Link
                        to="/create-issue"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create Issue
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Search issues..."
                        value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                        className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                        className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>
                    <select
                        value={filters.priority}
                        onChange={(e) => setFilters({...filters, priority: e.target.value})}
                        className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Priorities</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                    <select
                        value={filters.category}
                        onChange={(e) => setFilters({...filters, category: e.target.value})}
                        className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">All Categories</option>
                        <option value="road">Road</option>
                        <option value="water">Water</option>
                        <option value="electricity">Electricity</option>
                        <option value="public safety">Public Safety</option>
                        <option value="sanitation">Sanitation</option>
                        <option value="infrastructure">Infrastructure</option>
                        <option value="other">Other</option>
                    </select>
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

            {/* Issues Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <input
                                        type="checkbox"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedIssues(issues.map(issue => issue._id));
                                            } else {
                                                setSelectedIssues([]);
                                            }
                                        }}
                                        checked={selectedIssues.length === issues.length && issues.length > 0}
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
                                    Category
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Reporter
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {issues.map((issue) => (
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
                                        {issue.category?.primary || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {issue.submittedBy?.name || 'Unknown'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(issue.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <select
                                            value={issue.status}
                                            onChange={(e) => handleStatusUpdate(issue._id, e.target.value)}
                                            className="border border-gray-300 rounded-md px-2 py-1 text-xs mr-2"
                                        >
                                            <option value="Open">Open</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Under Review">Under Review</option>
                                            <option value="Resolved">Resolved</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                        <Link
                                            to={`/issues/${issue._id}`}
                                            className="text-blue-600 hover:text-blue-800 text-xs"
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {issues.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Issues Found</h3>
                    <p className="text-gray-600 mb-4">No issues match your current filters.</p>
                    <Link
                        to="/create-issue"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                        Create First Issue
                    </Link>
                </div>
            )}
        </div>
    );
};

export default AdminIssueList;