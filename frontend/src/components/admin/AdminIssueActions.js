import React, { useState } from 'react';
import { adminAPI } from '../../services/api';

const AdminIssueActions = ({ issue, onUpdate }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(issue.status);
    const [selectedPriority, setSelectedPriority] = useState(issue.priority);

    const handleStatusUpdate = async (newStatus) => {
        try {
            setIsUpdating(true);
            await adminAPI.bulkUpdateIssues([issue._id], { status: newStatus });
            setSelectedStatus(newStatus);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handlePriorityUpdate = async (newPriority) => {
        try {
            setIsUpdating(true);
            await adminAPI.bulkUpdateIssues([issue._id], { priority: newPriority });
            setSelectedPriority(newPriority);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error updating priority:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'Open': 'bg-red-100 text-red-800 border-red-200',
            'In Progress': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'Under Review': 'bg-purple-100 text-purple-800 border-purple-200',
            'Resolved': 'bg-green-100 text-green-800 border-green-200',
            'Closed': 'bg-gray-100 text-gray-800 border-gray-200'
        };
        return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            'low': 'bg-blue-100 text-blue-800 border-blue-200',
            'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'high': 'bg-orange-100 text-orange-800 border-orange-200',
            'urgent': 'bg-red-100 text-red-800 border-red-200'
        };
        return colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Admin Actions
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Management */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Issue Status
                    </label>
                    <div className="space-y-2">
                        <div className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(selectedStatus)}`}>
                            Current: {selectedStatus}
                        </div>
                        <select
                            value={selectedStatus}
                            onChange={(e) => handleStatusUpdate(e.target.value)}
                            disabled={isUpdating}
                            className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>
                </div>

                {/* Priority Management */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Issue Priority
                    </label>
                    <div className="space-y-2">
                        <div className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getPriorityColor(selectedPriority)}`}>
                            Current: {selectedPriority?.charAt(0).toUpperCase() + selectedPriority?.slice(1)}
                        </div>
                        <select
                            value={selectedPriority}
                            onChange={(e) => handlePriorityUpdate(e.target.value)}
                            disabled={isUpdating}
                            className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => handleStatusUpdate('In Progress')}
                        disabled={isUpdating || selectedStatus === 'In Progress'}
                        className="bg-yellow-600 text-white px-3 py-1 rounded-md text-sm hover:bg-yellow-700 disabled:opacity-50"
                    >
                        Mark In Progress
                    </button>
                    <button
                        onClick={() => handleStatusUpdate('Under Review')}
                        disabled={isUpdating || selectedStatus === 'Under Review'}
                        className="bg-purple-600 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-700 disabled:opacity-50"
                    >
                        Mark Under Review
                    </button>
                    <button
                        onClick={() => handleStatusUpdate('Resolved')}
                        disabled={isUpdating || selectedStatus === 'Resolved'}
                        className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                        Mark Resolved
                    </button>
                    <button
                        onClick={() => handlePriorityUpdate('urgent')}
                        disabled={isUpdating || selectedPriority === 'urgent'}
                        className="bg-red-600 text-white px-3 py-1 rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
                    >
                        Mark Urgent
                    </button>
                </div>
            </div>

            {isUpdating && (
                <div className="mt-4 flex items-center text-blue-600">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                </div>
            )}
        </div>
    );
};

export default AdminIssueActions;