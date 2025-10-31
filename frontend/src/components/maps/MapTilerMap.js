import React, { useState } from 'react';

const MapTilerMap = ({ issue }) => {
  const [showInfo, setShowInfo] = useState(true);
  
  const getPriorityColor = (priority) => {
    const colors = {
      'low': '#3B82F6',
      'medium': '#F59E0B', 
      'high': '#F97316',
      'urgent': '#EF4444'
    };
    return colors[priority] || '#6B7280';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Open': '#EF4444',
      'In Progress': '#F59E0B',
      'Under Review': '#8B5CF6',
      'Resolved': '#10B981',
      'Closed': '#6B7280'
    };
    return colors[status] || '#6B7280';
  };

  const lat = parseFloat(issue.lat);
  const lng = parseFloat(issue.lng);
  const zoom = 15;

  return (
    <div className="w-full">
      <div className="w-full h-[300px] rounded-lg overflow-hidden border border-gray-200 relative">
        {/* OpenStreetMap Embed - NO API KEY NEEDED! */}
        <iframe
          width="100%"
          height="300"
          frameBorder="0"
          scrolling="no"
          marginHeight="0"
          marginWidth="0"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`}
          style={{ border: 0 }}
          title="Issue Location Map"
          className="w-full h-full"
        />
        
        {/* Issue Info Overlay */}
        {showInfo && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-10">
            <button
              onClick={() => setShowInfo(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h4 className="font-semibold text-gray-900 text-sm mb-2 pr-6">
              {issue.title}
            </h4>
            
            <div className="flex items-center space-x-2 mb-2">
              <span 
                className="px-2 py-1 text-xs font-medium rounded-full text-white"
                style={{ backgroundColor: getStatusColor(issue.status) }}
              >
                {issue.status}
              </span>
              <span 
                className="px-2 py-1 text-xs font-medium rounded-full text-white"
                style={{ backgroundColor: getPriorityColor(issue.priority) }}
              >
                {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)}
              </span>
            </div>

            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex items-center">
                <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{issue.address}</span>
              </div>
              
              {issue.category?.primary && (
                <div className="flex items-center">
                  <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span>{issue.category.primary}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show Info Button (when hidden) */}
        {!showInfo && (
          <button
            onClick={() => setShowInfo(true)}
            className="absolute top-4 left-4 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow z-10"
            title="Show issue details"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
        <span>Interactive map powered by OpenStreetMap</span>
        <div className="flex items-center space-x-2">
          <a 
            href={`https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            Google Maps
          </a>
          <span>•</span>
          <a 
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=${zoom}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            Full Map
          </a>
        </div>
      </div>
    </div>
  );
};

export default MapTilerMap;