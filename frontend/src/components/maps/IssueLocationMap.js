import React, { useState, useCallback } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '8px'
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

const IssueLocationMap = ({ issue }) => {
  const [selectedMarker, setSelectedMarker] = useState(null);
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
    preventGoogleFontsLoading: true,
  });

  const center = {
    lat: parseFloat(issue.lat),
    lng: parseFloat(issue.lng)
  };

  const onMapClick = useCallback(() => {
    setSelectedMarker(null);
  }, []);

  const onMarkerClick = useCallback(() => {
    setSelectedMarker(issue);
  }, [issue]);

  const getPriorityColor = (priority) => {
    const colors = {
      'low': '#3B82F6',      // Blue
      'medium': '#F59E0B',   // Yellow
      'high': '#F97316',     // Orange
      'urgent': '#EF4444'    // Red
    };
    return colors[priority] || '#6B7280'; // Default gray
  };

  const getStatusColor = (status) => {
    const colors = {
      'Open': '#EF4444',           // Red
      'In Progress': '#F59E0B',    // Yellow
      'Under Review': '#8B5CF6',   // Purple
      'Resolved': '#10B981',       // Green
      'Closed': '#6B7280'          // Gray
    };
    return colors[status] || '#6B7280';
  };

  if (loadError) {
    console.error('Google Maps load error:', loadError);
    return (
      <div className="w-full h-[300px] bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center border-2 border-dashed border-blue-200">
        <div className="text-center p-6">
          <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Unavailable</h3>
          <p className="text-gray-600 text-sm mb-4">
            Interactive map couldn't load, but you can still view the location.
          </p>

          {/* Location Info Card */}
          <div className="bg-white rounded-lg p-4 mb-4 text-left shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2">{issue.title}</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{issue.address}</span>
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span>{parseFloat(issue.lat).toFixed(6)}, {parseFloat(issue.lng).toFixed(6)}</span>
              </div>
            </div>
          </div>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${issue.lat},${issue.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in Google Maps
          </a>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <svg className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-gray-500 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={16}
        center={center}
        options={mapOptions}
        onClick={onMapClick}
      >
        <Marker
          position={center}
          onClick={onMarkerClick}
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: getPriorityColor(issue.priority),
            fillOpacity: 0.8,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
          }}
        />

        {selectedMarker && (
          <InfoWindow
            position={center}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="max-w-sm p-2">
              <div className="flex items-start space-x-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">
                    {issue.title}
                  </h3>
                  <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                    {issue.description}
                  </p>

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

                  <div className="text-xs text-gray-500 space-y-1">
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

                    {issue.trackingNumber && (
                      <div className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                        <span>{issue.trackingNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      <div className="mt-2 text-xs text-gray-500 text-center">
        Click the marker to see issue details •
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

export default IssueLocationMap;