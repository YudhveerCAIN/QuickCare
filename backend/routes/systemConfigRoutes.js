const express = require('express');
const router = express.Router();
const {auth} = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddlerware');
const {
  getSystemConfig,
  updateSystemConfig,
  getConfigSection,
  updateConfigSection,
  resetSystemConfig
} = require('../controllers/systemConfigController');

// Get system configuration (system_admin only)
router.get('/', 
  auth, 
  roleMiddleware('system_admin'), 
  getSystemConfig
);

// Update system configuration (system_admin only)
router.put('/', 
  auth, 
  roleMiddleware('system_admin'), 
  updateSystemConfig
);

// Get specific configuration section (system_admin only)
router.get('/:section', 
  auth, 
  roleMiddleware('system_admin'), 
  getConfigSection
);

// Update specific configuration section (system_admin only)
router.put('/:section', 
  auth, 
  roleMiddleware('system_admin'), 
  updateConfigSection
);

// Reset system configuration to defaults (system_admin only)
router.post('/reset', 
  auth, 
  roleMiddleware('system_admin'), 
  resetSystemConfig
);

module.exports = router;
