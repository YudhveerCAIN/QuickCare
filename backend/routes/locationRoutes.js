const express = require('express');
const locationService = require('../services/locationService');
const { auth: authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// Simple test route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Location routes working'
  });
});

// Get nearby locations
router.get('/nearby', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Validate coordinates
    const validation = locationService.validateCoordinates(parseFloat(lat), parseFloat(lng));
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates',
        errors: validation.errors
      });
    }

    // For now, return mock nearby locations
    // In a real implementation, this would query a database for nearby issues/locations
    res.json({
      success: true,
      locations: [],
      center: { lat: parseFloat(lat), lng: parseFloat(lng) },
      radius: parseFloat(radius),
      message: 'Nearby locations retrieved successfully'
    });
  } catch (error) {
    console.error('Get nearby locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get nearby locations'
    });
  }
});

// Validate location
router.post('/validate', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Validate coordinates
    const validation = locationService.validateCoordinates(parseFloat(lat), parseFloat(lng));
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates',
        errors: validation.errors
      });
    }

    // If address is provided, verify it matches the coordinates
    let addressValidation = { isValid: true };
    if (address) {
      try {
        const reverseResult = await locationService.reverseGeocode(parseFloat(lat), parseFloat(lng));
        if (reverseResult.success) {
          // Simple validation - check if provided address contains key components
          const providedLower = address.toLowerCase();
          const reversedLower = reverseResult.displayName.toLowerCase();
          addressValidation.isValid = providedLower.includes(reverseResult.address.city?.toLowerCase()) ||
                                     reversedLower.includes(providedLower.split(',')[0]);
          addressValidation.suggestedAddress = reverseResult.displayName;
        }
      } catch (geocodeError) {
        console.warn('Address validation geocoding failed:', geocodeError.message);
      }
    }

    res.json({
      success: true,
      isValid: validation.valid && addressValidation.isValid,
      coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) },
      addressValidation,
      message: 'Location validated successfully'
    });
  } catch (error) {
    console.error('Validate location error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate location'
    });
  }
});

module.exports = router;