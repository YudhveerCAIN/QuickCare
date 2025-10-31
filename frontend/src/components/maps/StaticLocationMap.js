import React from 'react';

const StaticLocationMap = ({ issue }) => {
  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'bg-blue-500',
      'medium': 'bg-yellow-500',
      'high': 'bg-orange-500',
      'urgent': 'bg-red-500'
    };
    return colors[priority] || 'bg-gray-500';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Open': 'bg-red-500',
      'In Progress': 'bg-yellow-500',
      'Under Review': 'bg-purple-500',
      'Resolved': 'bg-green-500',
      'Closed': 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="w-full">
      {/* Static Map using OpenStreetMap */}
      <div className="relative w-full h-[300px] bg-gray-100 rounded-lg overflow-hidden">
        <iframe
          width="100%"
          height="300"
          frameBorder="0"
          scrolling="no"
          marginHeight="0"
          marginWidth="0"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(issue.lng) - 0.01},${parseFloat(issue.lat) - 0.01},${parseFloat(issue.lng) + 0.01},${parseFloat(issue.lat) + 0.01}&layer=mapnik&marker=${issue.lat},${issue.lng}`}
          style={{ border: 0 }}
          title="Issue Location Map"
        />
        
        {/* Overlay with issue info */}
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-1">
            {issue.title}
          </h4>
          
          <div className="flex items-center space-x-2 mb-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${getStatusColor(issue.status)}`}>
              {issue.status}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full text-white ${getPriorityColor(issue.priority)}`}>
              {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)}
            </span>
          </div>

          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{issue.address}</span>
            </div>
            
            {issue.category?.primary && (
              <div className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>{issue.category.primary}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        Interactive map powered by OpenStreetMap • 
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${issue.lat},${issue.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 ml-1"
        >
          Open in Google Maps
        </a>
      </div>
    </div>
  );
};

export default StaticLocationMap;