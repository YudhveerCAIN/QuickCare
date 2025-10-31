const express = require('express');
const locationService = require('../services/locationService');
const { auth: authMiddleware } = require('../middlewares/authMiddleware');
const rateLimitMiddleware = require('../middlewares/rateLimitMiddleware');

const router = express.Router();

// Simple test route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Geocoding routes working'
  });
});

// Forward geocoding (address to coordinates) - Public endpoint
router.get('/forward',
  rateLimitMiddleware.geocodingLimiter,
  async (req, res) => {
    try {
      const { address, limit, countryCode } = req.query;

      if (!address) {
        return res.status(400).json({
          success: false,
          message: 'Address is required'
        });
      }

      const result = await locationService.geocodeAddress(address, {
        limit: limit ? parseInt(limit) : 5,
        countryCode: countryCode || 'in'
      });

      if (result.success) {
        res.json({
          success: true,
          results: result.results.map(r => ({
            address: r.displayName,
            lat: r.latitude,
            lng: r.longitude,
            confidence: r.importance,
            type: r.type,
            components: r.address
          })),
          count: result.count,
          message: 'Geocoding completed successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message,
          results: []
        });
      }
    } catch (error) {
      console.error('Forward geocoding error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to geocode address'
      });
    }
  }
);

// Reverse geocoding (coordinates to address) - Public endpoint
router.get('/reverse',
  rateLimitMiddleware.geocodingLimiter,
  async (req, res) => {
    try {
      const { lat, lng, zoom } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const result = await locationService.reverseGeocode(
        parseFloat(lat),
        parseFloat(lng),
        { zoom: zoom ? parseInt(zoom) : 18 }
      );

      if (result.success) {
        res.json({
          success: true,
          displayName: result.displayName,
          address: result.displayName,
          components: result.address,
          coordinates: result.coordinates,
          type: result.type,
          message: 'Reverse geocoding completed successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message,
          address: result.address
        });
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to reverse geocode coordinates'
      });
    }
  }
);

// Get location suggestions for autocomplete
router.get('/suggestions',
  authMiddleware,
  rateLimitMiddleware.geocodingLimiter,
  async (req, res) => {
    try {
      const { q: query, limit, countryCode } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Query parameter is required'
        });
      }

      const result = await locationService.getLocationSuggestions(query, {
        limit: limit ? parseInt(limit) : 5,
        countryCode: countryCode || 'in'
      });

      if (result.success) {
        res.json({
          success: true,
          suggestions: result.suggestions,
          count: result.count,
          message: 'Location suggestions retrieved successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          suggestions: []
        });
      }
    } catch (error) {
      console.error('Location suggestions error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get location suggestions'
      });
    }
  }
);

// Calculate distance between two points
router.post('/distance', authMiddleware, async (req, res) => {
  try {
    const { from, to } = req.body;

    if (!from?.lat || !from?.lng || !to?.lat || !to?.lng) {
      return res.status(400).json({
        success: false,
        message: 'From and to coordinates (lat, lng) are required'
      });
    }

    // Validate coordinates
    const fromValidation = locationService.validateCoordinates(from.lat, from.lng);
    const toValidation = locationService.validateCoordinates(to.lat, to.lng);

    if (!fromValidation.valid || !toValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates',
        errors: [...fromValidation.errors, ...toValidation.errors]
      });
    }

    const distance = locationService.calculateDistance(from.lat, from.lng, to.lat, to.lng);

    res.json({
      success: true,
      distance: {
        kilometers: Math.round(distance * 100) / 100,
        miles: Math.round(distance * 0.621371 * 100) / 100
      },
      from,
      to,
      message: 'Distance calculated successfully'
    });
  } catch (error) {
    console.error('Calculate distance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate distance'
    });
  }
});

module.exports = router;