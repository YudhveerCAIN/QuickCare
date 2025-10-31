import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import IssueLocationMap from '../../components/maps/IssueLocationMap';
import StaticLocationMap from '../../components/maps/StaticLocationMap';
import MapTilerMap from '../../components/maps/MapTilerMap';
import SimpleLocationMap from '../../components/maps/SimpleLocationMap';
import AdminIssueActions from '../../components/admin/AdminIssueActions';

const IssueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [issue, setIssue] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [deletingComment, setDeletingComment] = useState(null);
  const [mapType, setMapType] = useState('maptiler'); // 'maptiler', 'google', 'static'

  const statusColors = {
    'Open': 'bg-red-100 text-red-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Resolved': 'bg-green-100 text-green-800',
    'Closed': 'bg-gray-100 text-gray-800'
  };

  const priorityColors = {
    'low': 'bg-blue-100 text-blue-800',
    'medium': 'bg-yellow-100 text-yellow-800',
    'high': 'bg-orange-100 text-orange-800',
    'urgent': 'bg-red-100 text-red-800'
  };

  useEffect(() => {
    fetchIssueDetails();
    fetchTimeline();
  }, [id]);

  const fetchIssueDetails = async () => {
    try {
      const response = await api.get(`/issues/${id}`);
      if (response.data.success) {
        setIssue(response.data.issue);
      }
    } catch (error) {
      console.error('Error fetching issue:', error);
      if (error.response?.status === 404) {
        toast.error('Issue not found');
        navigate('/issues');
      } else {
        toast.error('Failed to load issue details');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const response = await api.get(`/issues/${id}/timeline`);
      if (response.data.success) {
        setTimeline(response.data.timeline || []);
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  };

  const handleStatusChange = async (newStatus, reason = '') => {
    if (!user || (user.role !== 'Admin' && user.role !== 'Department' && issue.assignedTo?.id !== user.id)) {
      toast.error('You do not have permission to change the status');
      return;
    }

    setStatusLoading(true);
    try {
      const response = await api.put(`/issues/${id}/status`, {
        status: newStatus,
        reason
      });

      if (response.data.success) {
        setIssue(response.data.issue);
        toast.success('Status updated successfully');
        fetchTimeline(); // Refresh timeline
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentLoading(true);
    try {
      const response = await api.post(`/issues/${id}/comments`, {
        text: newComment.trim()
      });

      if (response.data.success) {
        setNewComment('');
        toast.success('Comment added successfully');
        fetchTimeline(); // Refresh timeline to show new comment
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setDeletingComment(commentId);
    try {
      const response = await api.delete(`/issues/${id}/comments/${commentId}`);

      if (response.data.success) {
        toast.success('Comment deleted successfully');
        fetchTimeline(); // Refresh timeline to remove deleted comment
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(error.response?.data?.message || 'Failed to delete comment');
    } finally {
      setDeletingComment(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canUpdateStatus = user && (
    user.role === 'Admin' || 
    user.role === 'Department' || 
    issue?.assignedTo?.id === user.id
  );

  if (loading) {
    return <LoadingSpinner text="Loading issue details..." />;
  }

  if (!issue) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Issue Not Found</h2>
          <p className="text-gray-600 mb-4">The issue you're looking for doesn't exist or has been removed.</p>
          <Link to="/issues" className="text-blue-600 hover:text-blue-800">
            Back to Issues
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
          <Link to="/issues" className="hover:text-blue-600">Issues</Link>
          <span>/</span>
          <span className="text-gray-900">{issue.title}</span>
        </nav>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{issue.title}</h1>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[issue.status] || 'bg-gray-100 text-gray-800'}`}>
                {issue.status}
              </span>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${priorityColors[issue.priority] || 'bg-gray-100 text-gray-800'}`}>
                {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)} Priority
              </span>
              {issue.trackingNumber && (
                <span className="text-sm text-gray-500">
                  #{issue.trackingNumber}
                </span>
              )}
            </div>
          </div>
          
          {canUpdateStatus && (
            <div className="flex space-x-2">
              {issue.status !== 'In Progress' && (
                <button
                  onClick={() => handleStatusChange('In Progress')}
                  disabled={statusLoading}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700 disabled:opacity-50"
                >
                  Start Progress
                </button>
              )}
              {issue.status !== 'Resolved' && (
                <button
                  onClick={() => handleStatusChange('Resolved')}
                  disabled={statusLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin Actions */}
      {(user?.role === 'admin' || user?.role === 'system_admin') && (
        <AdminIssueActions issue={issue} onUpdate={fetchIssueDetails} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{issue.description}</p>
          </div>

          {/* Images */}
          {issue.images && issue.images.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Images</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {issue.images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image.url}
                      alt={`Issue image ${index + 1}`}
                      className="w-full h-64 object-cover rounded-md cursor-pointer hover:opacity-90"
                      onClick={() => window.open(image.url, '_blank')}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Comments & Updates</h2>
            
            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mb-6">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={commentLoading || !newComment.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {commentLoading ? 'Adding...' : 'Comment'}
                </button>
              </div>
            </form>

            {/* Timeline */}
            <div className="space-y-4">
              {timeline.length > 0 ? (
                timeline.map((item, index) => {

                  
                  return (
                  <div key={index} className="flex space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        {item.actionType === 'status_change' ? (
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {item.performedBy?.name || 'System'}
                            {item.actionType === 'comment' && String(item.performedBy?.id || item.performedBy?._id) === String(user?.id || user?._id) && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">You</span>
                            )}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {formatDate(item.createdAt)}
                            </span>
                            {item.actionType === 'comment' && 
                             String(item.performedBy?.id || item.performedBy?._id) === String(user?.id || user?._id) && (
                              <button
                                onClick={() => handleDeleteComment(item.commentId)}
                                disabled={deletingComment === item.commentId}
                                className="flex items-center space-x-1 text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-50 transition-colors"
                                title="Delete comment"
                              >
                                {deletingComment === item.commentId ? (
                                  <>
                                    <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    <span>Deleting...</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>Delete</span>

                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{item.description}</p>
                      </div>
                    </div>
                  </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-center py-4">No comments or updates yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Issue Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Issue Information</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Submitted by</dt>
                <dd className="text-sm text-gray-900">{issue.submittedBy?.name || 'Anonymous'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">{formatDate(issue.createdAt)}</dd>
              </div>
              {issue.assignedTo && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Assigned to</dt>
                  <dd className="text-sm text-gray-900">{issue.assignedTo.name}</dd>
                </div>
              )}
              {issue.category?.primary && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Category</dt>
                  <dd className="text-sm text-gray-900">
                    {issue.category.primary}
                    {issue.category.secondary && ` - ${issue.category.secondary}`}
                  </dd>
                </div>
              )}
              {issue.tags && issue.tags.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tags</dt>
                  <dd className="flex flex-wrap gap-1 mt-1">
                    {issue.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
            
            {/* Interactive Map */}
            {issue.lat && issue.lng ? (
              <div className="mb-4">
                {/* Map Type Selector */}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">
                    {mapType === 'maptiler' && 'MapTiler Map'}
                    {mapType === 'google' && 'Google Maps'}
                    {mapType === 'static' && 'OpenStreetMap'}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setMapType('maptiler')}
                      className={`text-xs px-2 py-1 rounded ${mapType === 'maptiler' ? 'bg-blue-100 text-blue-800' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      MapTiler
                    </button>
                    <button
                      onClick={() => setMapType('google')}
                      className={`text-xs px-2 py-1 rounded ${mapType === 'google' ? 'bg-blue-100 text-blue-800' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      Google
                    </button>
                    <button
                      onClick={() => setMapType('static')}
                      className={`text-xs px-2 py-1 rounded ${mapType === 'static' ? 'bg-blue-100 text-blue-800' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                      Static
                    </button>
                  </div>
                </div>

                {/* Map Component */}
                {mapType === 'maptiler' && <MapTilerMap issue={issue} />}
                {mapType === 'google' && <IssueLocationMap issue={issue} />}
                {mapType === 'static' && <StaticLocationMap issue={issue} />}
              </div>
            ) : (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-500 text-sm">No location coordinates available</p>
              </div>
            )}

            {/* Location Details */}
            <div className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="text-sm text-gray-900">{issue.address || 'Not specified'}</dd>
              </div>
              {issue.landmark && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Landmark</dt>
                  <dd className="text-sm text-gray-900">{issue.landmark}</dd>
                </div>
              )}
              {issue.lat && issue.lng && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Coordinates</dt>
                  <dd className="text-sm text-gray-900">
                    {parseFloat(issue.lat).toFixed(6)}, {parseFloat(issue.lng).toFixed(6)}
                  </dd>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetail;