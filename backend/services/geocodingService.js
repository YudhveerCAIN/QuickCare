const axios = require('axios');

class GeocodingService {
  constructor() {
    // Using Nominatim (OpenStreetMap) as primary service - free and reliable
    this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
    this.requestDelay = 1000; // 1 second delay between requests (Nominatim rate limit)
    this.lastRequestTime = 0;
  }

  // Rate limiting helper
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  // Forward geocoding: address/query -> coordinates
  async forwardGeocode(query, options = {}) {
    try {
      await this.waitForRateLimit();

      const params = {
        format: 'json',
        q: query,
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
        const { north, south, east, west } = options.boundingBox;
        params.viewbox = `${west},${north},${east},${south}`;
        params.bounded = 1;
      }

      const response = await axios.get(`${this.nominatimBaseUrl}/search`, {
        params,
        headers: {
          'User-Agent': 'QuickCare-App/1.0 (civic-reporting-app)',
        },
        timeout: 10000
      });

      if (!response.data || response.data.length === 0) {
        return {
          success: false,
          message: 'No results found for the given query',
          results: []
        };
      }

      const results = response.data.map(item => ({
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        importance: parseFloat(item.importance || 0),
        type: item.type,
        class: item.class,
        address: this.parseNominatimAddress(item.address),
        boundingBox: item.boundingbox ? {
          north: parseFloat(item.boundingbox[1]),
          south: parseFloat(item.boundingbox[0]),
          east: parseFloat(item.boundingbox[3]),
          west: parseFloat(item.boundingbox[2])
        } : null
      }));

      return {
        success: true,
        results,
        query: query
      };

    } catch (error) {
      console.error('Forward geocoding error:', error);
      return {
        success: false,
        message: 'Geocoding service temporarily unavailable',
        error: error.message,
        results: []
      };
    }
  }

  // Reverse geocoding: coordinates -> address
  async reverseGeocode(latitude, longitude, options = {}) {
    try {
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
          'User-Agent': 'QuickCare-App/1.0 (civic-reporting-app)',
        },
        timeout: 10000
      });

      if (!response.data || response.data.error) {
        return {
          success: false,
          message: 'No address found for the given coordinates',
          address: null
        };
      }

      const result = {
        displayName: response.data.display_name,
        latitude: parseFloat(response.data.lat),
        longitude: parseFloat(response.data.lon),
        type: response.data.type,
        class: response.data.class,
        address: this.parseNominatimAddress(response.data.address),
        boundingBox: response.data.boundingbox ? {
          north: parseFloat(response.data.boundingbox[1]),
          south: parseFloat(response.data.boundingbox[0]),
          east: parseFloat(response.data.boundingbox[3]),
          west: parseFloat(response.data.boundingbox[2])
        } : null
      };

      return {
        success: true,
        result,
        coordinates: { latitude, longitude }
      };

    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return {
        success: false,
        message: 'Reverse geocoding service temporarily unavailable',
        error: error.message,
        address: null
      };
    }
  }

  // Parse Nominatim address components into standardized format
  parseNominatimAddress(addressComponents) {
    if (!addressComponents) return null;

    return {
      houseNumber: addressComponents.house_number || '',
      street: addressComponents.road || addressComponents.street || '',
      neighborhood: addressComponents.neighbourhood || addressComponents.suburb || '',
      city: addressComponents.city || addressComponents.town || addressComponents.village || '',
      district: addressComponents.state_district || addressComponents.county || '',
      state: addressComponents.state || '',
      postalCode: addressComponents.postcode || '',
      country: addressComponents.country || '',
      countryCode: addressComponents.country_code || ''
    };
  }

  // Validate coordinates
  validateCoordinates(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return {
        valid: false,
        message: 'Invalid coordinate format'
      };
    }

    if (lat < -90 || lat > 90) {
      return {
        valid: false,
        message: 'Latitude must be between -90 and 90 degrees'
      };
    }

    if (lng < -180 || lng > 180) {
      return {
        valid: false,
        message: 'Longitude must be between -180 and 180 degrees'
      };
    }

    return {
      valid: true,
      latitude: lat,
      longitude: lng
    };
  }

  // Get location suggestions for autocomplete
  async getLocationSuggestions(query, options = {}) {
    if (!query || query.length < 3) {
      return {
        success: false,
        message: 'Query must be at least 3 characters long',
        suggestions: []
      };
    }

    const result = await this.forwardGeocode(query, {
      limit: options.limit || 5,
      countryCode: options.countryCode,
      boundingBox: options.boundingBox
    });

    if (!result.success) {
      return result;
    }

    const suggestions = result.results.map(item => ({
      id: `${item.latitude}_${item.longitude}`,
      displayName: item.displayName,
      shortName: this.createShortName(item.address),
      coordinates: {
        latitude: item.latitude,
        longitude: item.longitude
      },
      type: item.type,
      importance: item.importance
    }));

    return {
      success: true,
      suggestions,
      query
    };
  }

  // Create short, user-friendly name from address
  createShortName(address) {
    if (!address) return '';

    const parts = [];
    
    if (address.houseNumber && address.street) {
      parts.push(`${address.houseNumber} ${address.street}`);
    } else if (address.street) {
      parts.push(address.street);
    }

    if (address.neighborhood) {
      parts.push(address.neighborhood);
    }

    if (address.city) {
      parts.push(address.city);
    }

    return parts.slice(0, 2).join(', ') || 'Unknown Location';
  }

  // Calculate distance between two coordinates (in kilometers)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = new GeocodingService();