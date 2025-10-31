import { useState } from 'react';

const SimpleLocationMap = ({ issue }) => {
    const [showDetails, setShowDetails] = useState(true);

    const getPriorityColor = (priority) => {
        const colors = {
            'low': 'from-blue-400 to-blue-600',
            'medium': 'from-yellow-400 to-yellow-600',
            'high': 'from-orange-400 to-orange-600',
            'urgent': 'from-red-400 to-red-600'
        };
        return colors[priority] || 'from-gray-400 to-gray-600';
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

    const lat = parseFloat(issue.lat);
    const lng = parseFloat(issue.lng);

    return (
        <div className="w-full relative">
            {/* Map Container */}
            <div className={`w-full h-[300px] rounded-lg relative bg-gradient-to-br ${getPriorityColor(issue.priority)} shadow-lg overflow-visible`}>
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 rounded-lg overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                            </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#grid)" />
                    </svg>
                </div>

                {/* Location Pin - Centered */}
                <div
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                    onClick={() => setShowDetails(!showDetails)}
                    style={{ zIndex: 10 }}
                >
                    {/* Pin Shadow */}
                    <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-6 h-3 bg-black opacity-20 rounded-full blur-sm"></div>

                    {/* Pin */}
                    <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-white hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>

                    {/* Pulse Animation */}
                    <div className="absolute top-0 left-0 w-12 h-12 bg-white rounded-full animate-ping opacity-20"></div>
                </div>

                {/* Coordinates Display */}
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-xs font-mono">
                    {lat.toFixed(4)}, {lng.toFixed(4)}
                </div>
            </div>

            {/* POPUP - OUTSIDE the map container, positioned absolutely */}
            {showDetails && (
                <div
                    className="absolute left-1/2 transform -translate-x-1/2"
                    style={{
                        top: '20px', // Position from top of the entire component
                        zIndex: 1000 // Very high z-index
                    }}
                >
                    {/* Popup Container */}
                    <div className="relative">
                        {/* Popup Body */}
                        <div className="bg-white rounded-lg shadow-2xl border border-gray-300 w-80 max-w-[90vw]">
                            {/* Header */}
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center rounded-t-lg">
                                <h3 className="font-bold text-gray-900 text-sm truncate pr-2">
                                    📍 {issue.title}
                                </h3>
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 hover:bg-gray-200 rounded p-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <p className="text-gray-600 text-sm mb-3">
                                    {issue.description}
                                </p>

                                {/* Status and Priority badges */}
                                <div className="flex items-center space-x-2 mb-4">
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full text-white ${getStatusColor(issue.status)}`}>
                                        {issue.status}
                                    </span>
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full text-white bg-gradient-to-r ${getPriorityColor(issue.priority)}`}>
                                        {issue.priority.charAt(0).toUpperCase() + issue.priority.slice(1)}
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="text-sm text-gray-600 space-y-3">
                                    <div className="flex items-start">
                                        <svg className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="leading-tight">{issue.address}</span>
                                    </div>

                                    {issue.category?.primary && (
                                        <div className="flex items-center">
                                            <svg className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                            </svg>
                                            <span>{issue.category.primary}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 713 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                        </svg>
                                        <span className="font-mono text-xs">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pointy Arrow pointing down to the pin */}
                        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2">
                            <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[15px] border-l-transparent border-r-transparent border-t-white drop-shadow-lg"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Links */}
            <div className="mt-3 flex justify-between items-center text-xs">
                <span className="text-gray-500">Click pin to toggle details</span>
                <div className="flex items-center space-x-3">
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Google Maps
                    </a>
                    <a
                        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-green-600 hover:text-green-800 transition-colors"
                    >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        OpenStreetMap
                    </a>
                </div>
            </div>
        </div>
    );
};

export default SimpleLocationMap;