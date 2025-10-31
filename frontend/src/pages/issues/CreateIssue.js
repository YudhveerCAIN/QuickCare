import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const CreateIssue = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: {
      primary: '',
      secondary: ''
    },
    priority: 'medium',
    location: {
      address: '',
      coordinates: {
        lat: '',
        lng: ''
      },
      landmark: ''
    },
    tags: []
  });
  const [images, setImages] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    console.log('🚀 CreateIssue component mounted - fetching data...');
    fetchCategories();
    getCurrentLocation();
  }, []);

  const fetchCategories = async () => {
    console.log('📂 Fetching categories...');
    try {
      const response = await api.get('/categories');
      console.log('✅ Categories fetched successfully:', response.data);
      if (response.data.success) {
        setCategories(response.data.categories || []);
      }
    } catch (error) {
      console.error('❌ Error fetching categories:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser. Please enter address manually.');
      return;
    }

    setLocationLoading(true);
    toast.loading('Getting your location...', { id: 'location-loading' });

    // Check if location permission is already granted
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        console.log('🔐 Geolocation permission status:', result.state);
        if (result.state === 'denied') {
          setLocationLoading(false);
          toast.dismiss('location-loading');
          toast.error('Location access denied. Please enable location permissions and try again, or enter address manually.');
          return;
        }
      });
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds timeout
      maximumAge: 300000 // 5 minutes cache
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('📍 Location obtained:', { latitude, longitude, accuracy });
        
        setFormData(prev => {
          const newFormData = {
            ...prev,
            location: {
              ...prev.location,
              coordinates: {
                lat: latitude.toString(),
                lng: longitude.toString()
              }
            }
          };
          console.log('📍 Updated form data with coordinates:', newFormData.location.coordinates);
          return newFormData;
        });
        
        toast.dismiss('location-loading');
        toast.success('Location obtained successfully!');
        
        // Reverse geocode to get address
        console.log('🌍 Attempting reverse geocoding for:', { latitude, longitude });
        try {
          const response = await api.get(`/geocoding/reverse?lat=${latitude}&lng=${longitude}`);
          console.log('✅ Reverse geocoding successful:', response.data);
          if (response.data.success && response.data.displayName) {
            setFormData(prev => {
              const newFormData = {
                ...prev,
                location: {
                  ...prev.location,
                  address: response.data.displayName
                }
              };
              console.log('🏠 Updated form data with address:', newFormData.location.address);
              return newFormData;
            });
            toast.success('Address found: ' + response.data.displayName.substring(0, 50) + '...');
          } else {
            toast.error('Location obtained but could not determine address. Please enter address manually.');
          }
        } catch (error) {
          console.error('❌ Error reverse geocoding:', {
            error: error.message,
            response: error.response?.data,
            status: error.response?.status,
            coordinates: { latitude, longitude }
          });
          toast.error('Location obtained but could not determine address. Please enter address manually.');
        }
        setLocationLoading(false);
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        setLocationLoading(false);
        toast.dismiss('location-loading');
        
        let errorMessage = 'Could not get your location. ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access denied. Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable. Please check your internet connection.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again or enter address manually.';
            break;
          default:
            errorMessage += 'An unknown error occurred. Please enter address manually.';
            break;
        }
        
        toast.error(errorMessage);
      },
      options
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear validation error
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleLocationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }));
  };

  const handleCoordinateChange = (coord, value) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        coordinates: {
          ...prev.location.coordinates,
          [coord]: value
        }
      }
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 3) {
      toast.error('Maximum 3 images allowed');
      return;
    }
    
    files.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 5MB.`);
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file.`);
        return;
      }
    });
    
    setImages(prev => [...prev, ...files]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.trim().length < 5) {
      errors.title = 'Title must be at least 5 characters';
    }
    
    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }
    
    if (!formData.category.primary) {
      errors.category = 'Category is required';
    }
    
    if (!formData.location.address.trim()) {
      errors.address = 'Address is required';
    }
    
    if (!formData.location.coordinates.lat || !formData.location.coordinates.lng) {
      errors.coordinates = 'Location coordinates are required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }
    
    setLoading(true);
    
    try {
      const formDataToSend = new FormData();
      
      // Add text fields - format to match backend validation
      formDataToSend.append('title', formData.title.trim());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('category', formData.category.primary); // Send as string, not object
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('lat', parseFloat(formData.location.coordinates.lat));
      formDataToSend.append('lng', parseFloat(formData.location.coordinates.lng));
      formDataToSend.append('address', formData.location.address.trim());
      if (formData.location.landmark.trim()) {
        formDataToSend.append('landmark', formData.location.landmark.trim());
      }
      
      if (formData.tags.length > 0) {
        formDataToSend.append('tags', JSON.stringify(formData.tags));
      }
      
      // Add images
      images.forEach((image, index) => {
        formDataToSend.append('image', image);
      });
      
      const response = await api.post('/issues', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        toast.success('Issue reported successfully!');
        navigate('/issues');
      }
    } catch (error) {
      console.error('Error creating issue:', error);
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach(err => toast.error(err));
      } else {
        toast.error(error.response?.data?.message || 'Failed to create issue');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Submitting your issue..." />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Report New Issue</h1>
        <p className="mt-2 text-gray-600">
          Help improve your community by reporting issues that need attention.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Issue Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.title ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Brief description of the issue"
              />
              {validationErrors.title && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Detailed description of the issue"
              />
              {validationErrors.description && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category.primary"
                  value={formData.category.primary}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.category ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select a category</option>
                  <option value="road">Road & Transportation</option>
                  <option value="water">Water & Drainage</option>
                  <option value="electricity">Electricity & Power</option>
                  <option value="public safety">Public Safety</option>
                  <option value="environment">Environment</option>
                  <option value="other">Other</option>
                </select>
                {validationErrors.category && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Location</h2>
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={locationLoading}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {locationLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Getting location...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Use current location</span>
                </>
              )}
            </button>
          </div>

          {/* Location Permission Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <div className="flex">
              <svg className="w-5 h-5 text-blue-400 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-medium">Location Access</p>
                <p>Click "Use current location" to automatically fill in your address. You may need to allow location access in your browser.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.location.address}
                onChange={(e) => handleLocationChange('address', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.address ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Street address or location description"
              />
              {validationErrors.address && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.address}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Landmark (Optional)
              </label>
              <input
                type="text"
                value={formData.location.landmark}
                onChange={(e) => handleLocationChange('landmark', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nearby landmark or reference point"
              />
            </div>

            {/* Debug: Show current coordinates */}
            <div className="mb-2 p-2 bg-gray-100 rounded text-xs">
              <strong>Debug:</strong> Current coordinates: lat={formData.location.coordinates.lat}, lng={formData.location.coordinates.lng}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.location.coordinates.lat}
                  onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.coordinates ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Latitude"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.location.coordinates.lng}
                  onChange={(e) => handleCoordinateChange('lng', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.coordinates ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Longitude"
                />
              </div>
            </div>
            {validationErrors.coordinates && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.coordinates}</p>
            )}
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Images (Optional)</h2>
          
          <div className="space-y-4">
            <div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Images
              </label>
              <p className="mt-1 text-sm text-gray-500">
                Upload up to 3 images (max 5MB each)
              </p>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/issues')}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Issue'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateIssue;