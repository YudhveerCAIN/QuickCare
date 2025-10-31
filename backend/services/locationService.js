const axios = require('axios');

class LocationService {
    constructor() {
        // Using Nominatim (OpenStreetMap) as the primary geocoding service
        // It's free and doesn't require API keys
        this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
        
        // Rate limiting: Nominatim allows 1 request per second
        this.lastRequestTime = 0;
        this.minRequestInterval = 1000; // 1 second
    }

    /**
     * Rate limiting helper
     */
    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.minRequestInterval) {
            const waitTime = this.minRequestInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastRequestTime = Date.now();
    }

    /**
     * Forward geocoding: Convert address to coordinates
     * @param {string} address - Address to geocode
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Geocoding result
     */
    async geocodeAddress(address, options = {}) {
        try {
            if (!address || typeof address !== 'string') {
                throw new Error('Valid address string is required');
            }

            await this.waitForRateLimit();

            const params = {
                format: 'json',
                q: address.trim(),
                limit: options.limit || 5,
                addressdetails: 1,
                extratags: 1,
                namedetails: 1,
                ...options.params
            };

            // Add country bias if provided
            if (options.countryCode) {
                params.countrycodes = options.countryCode;
            }

            // Add bounding box if provided
            if (options.boundingBox) {
                params.viewbox = options.boundingBox.join(',');
                params.bounded = 1;
            }

            const response = await axios.get(`${this.nominatimBaseUrl}/search`, {
                params,
                headers: {
                    'User-Agent': 'QuickCare-App/1.0 (civic-issues-platform)',
                },
                timeout: 10000
            });

            const results = response.data;

            if (!results || results.length === 0) {
                return {
                    success: false,
                    message: 'No results found for the given address',
                    results: []
                };
            }

            // Format results
            const formattedResults = results.map(result => ({
                displayName: result.display_name,
                latitude: parseFloat(result.lat),
                longitude: parseFloat(result.lon),
                importance: parseFloat(result.importance || 0),
                type: result.type,
                class: result.class,
                address: this.formatAddress(result.address),
                boundingBox: result.boundingbox ? {
                    south: parseFloat(result.boundingbox[0]),
                    north: parseFloat(result.boundingbox[1]),
                    west: parseFloat(result.boundingbox[2]),
                    east: parseFloat(result.boundingbox[3])
                } : null,
                raw: result
            }));

            return {
                success: true,
                results: formattedResults,
                count: formattedResults.length
            };

        } catch (error) {
            console.error('Geocoding error:', error);
            
            if (error.code === 'ECONNABORTED') {
                throw new Error('Geocoding request timed out. Please try again.');
            }
            
            if (error.response?.status === 429) {
                throw new Error('Too many requests. Please wait a moment and try again.');
            }
            
            throw new Error('Failed to geocode address. Please try again.');
        }
    }

    /**
     * Reverse geocoding: Convert coordinates to address
     * @param {number} latitude - Latitude coordinate
     * @param {number} longitude - Longitude coordinate
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Reverse geocoding result
     */
    async reverseGeocode(latitude, longitude, options = {}) {
        try {
            if (typeof latitude !== 'number' || typeof longitude !== 'number') {
                throw new Error('Valid latitude and longitude numbers are required');
            }

            if (latitude < -90 || latitude > 90) {
                throw new Error('Latitude must be between -90 and 90');
            }

            if (longitude < -180 || longitude > 180) {
                throw new Error('Longitude must be between -180 and 180');
            }

            await this.waitForRateLimit();

            const params = {
                format: 'json',
                lat: latitude,
                lon: longitude,
                zoom: options.zoom || 18,
                addressdetails: 1,
                extratags: 1,
                namedetails: 1,
                ...options.params
            };

            const response = await axios.get(`${this.nominatimBaseUrl}/reverse`, {
                params,
                headers: {
                    'User-Agent': 'QuickCare-App/1.0 (civic-issues-platform)',
                },
                timeout: 10000
            });

            const result = response.data;

            if (!result || result.error) {
                return {
                    success: false,
                    message: result?.error || 'No address found for the given coordinates',
                    address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                };
            }

            const formattedAddress = this.formatAddress(result.address);

            return {
                success: true,
                displayName: result.display_name,
                address: formattedAddress,
                coordinates: {
                    latitude,
                    longitude
                },
                type: result.type,
                class: result.class,
                importance: parseFloat(result.importance || 0),
                boundingBox: result.boundingbox ? {
                    south: parseFloat(result.boundingbox[0]),
                    north: parseFloat(result.boundingbox[1]),
                    west: parseFloat(result.boundingbox[2]),
                    east: parseFloat(result.boundingbox[3])
                } : null,
                raw: result
            };

        } catch (error) {
            console.error('Reverse geocoding error:', error);
            
            if (error.code === 'ECONNABORTED') {
                throw new Error('Reverse geocoding request timed out. Please try again.');
            }
            
            if (error.response?.status === 429) {
                throw new Error('Too many requests. Please wait a moment and try again.');
            }
            
            throw new Error('Failed to reverse geocode coordinates. Please try again.');
        }
    }

    /**
     * Format address components into a structured object
     * @param {Object} addressComponents - Raw address components from Nominatim
     * @returns {Object} - Formatted address object
     */
    formatAddress(addressComponents) {
        if (!addressComponents) return {};

        return {
            houseNumber: addressComponents.house_number || '',
            road: addressComponents.road || addressComponents.street || '',
            neighbourhood: addressComponents.neighbourhood || addressComponents.suburb || '',
            city: addressComponents.city || addressComponents.town || addressComponents.village || '',
            district: addressComponents.district || addressComponents.county || '',
            state: addressComponents.state || addressComponents.region || '',
            postcode: addressComponents.postcode || '',
            country: addressComponents.country || '',
            countryCode: addressComponents.country_code || '',
            formatted: this.buildFormattedAddress(addressComponents)
        };
    }

    /**
     * Build a formatted address string from components
     * @param {Object} components - Address components
     * @returns {string} - Formatted address string
     */
    buildFormattedAddress(components) {
        const parts = [];
        
        // Building number and street
        if (components.house_number && components.road) {
            parts.push(`${components.house_number} ${components.road}`);
        } else if (components.road) {
            parts.push(components.road);
        }
        
        // Neighbourhood/Area
        if (components.neighbourhood || components.suburb) {
            parts.push(components.neighbourhood || components.suburb);
        }
        
        // City
        if (components.city || components.town || components.village) {
            parts.push(components.city || components.town || components.village);
        }
        
        // State
        if (components.state) {
            parts.push(components.state);
        }
        
        // Postcode
        if (components.postcode) {
            parts.push(components.postcode);
        }
        
        // Country (if not India, to avoid redundancy for Indian addresses)
        if (components.country && components.country_code !== 'in') {
            parts.push(components.country);
        }
        
        return parts.join(', ');
    }

    /**
     * Validate coordinates
     * @param {number} latitude - Latitude coordinate
     * @param {number} longitude - Longitude coordinate
     * @returns {Object} - Validation result
     */
    validateCoordinates(latitude, longitude) {
        const errors = [];
        
        if (typeof latitude !== 'number' || isNaN(latitude)) {
            errors.push('Latitude must be a valid number');
        } else if (latitude < -90 || latitude > 90) {
            errors.push('Latitude must be between -90 and 90');
        }
        
        if (typeof longitude !== 'number' || isNaN(longitude)) {
            errors.push('Longitude must be a valid number');
        } else if (longitude < -180 || longitude > 180) {
            errors.push('Longitude must be between -180 and 180');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     * @param {number} lat1 - First latitude
     * @param {number} lon1 - First longitude
     * @param {number} lat2 - Second latitude
     * @param {number} lon2 - Second longitude
     * @returns {number} - Distance in kilometers
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     * @param {number} degrees - Degrees to convert
     * @returns {number} - Radians
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Get location suggestions based on partial input
     * @param {string} query - Partial address or location name
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} - Suggestions result
     */
    async getLocationSuggestions(query, options = {}) {
        try {
            if (!query || query.length < 3) {
                return {
                    success: false,
                    message: 'Query must be at least 3 characters long',
                    suggestions: []
                };
            }

            const geocodeResult = await this.geocodeAddress(query, {
                limit: options.limit || 5,
                countryCode: options.countryCode || 'in', // Default to India
                ...options
            });

            if (!geocodeResult.success) {
                return geocodeResult;
            }

            // Format suggestions for autocomplete
            const suggestions = geocodeResult.results.map(result => ({
                label: result.displayName,
                value: result.displayName,
                coordinates: {
                    lat: result.latitude,
                    lng: result.longitude
                },
                address: result.address,
                type: result.type,
                importance: result.importance
            }));

            return {
                success: true,
                suggestions,
                count: suggestions.length
            };

        } catch (error) {
            console.error('Location suggestions error:', error);
            throw error;
        }
    }
}

module.exports = new LocationService();