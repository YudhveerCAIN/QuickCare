const SystemConfig = require('../models/SystemConfig');

// Get system configuration
exports.getSystemConfig = async (req, res) => {
  try {
    const config = await SystemConfig.getConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching system configuration', error: error.message });
  }
};

// Update system configuration
exports.updateSystemConfig = async (req, res) => {
  try {
    const updateData = req.body;
    
    // Get existing config or create new one
    let config = await SystemConfig.findOne();
    if (!config) {
      config = new SystemConfig(updateData);
    } else {
      Object.assign(config, updateData);
    }
    
    const updatedConfig = await config.save();
    res.json(updatedConfig);
  } catch (error) {
    res.status(500).json({ message: 'Error updating system configuration', error: error.message });
  }
};

// Get specific configuration section
exports.getConfigSection = async (req, res) => {
  try {
    const { section } = req.params;
    const config = await SystemConfig.getConfig();
    
    if (config[section]) {
      res.json({ [section]: config[section] });
    } else {
      res.status(404).json({ message: 'Configuration section not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching configuration section', error: error.message });
  }
};

// Update specific configuration section
exports.updateConfigSection = async (req, res) => {
  try {
    const { section } = req.params;
    const updateData = req.body;
    
    const config = await SystemConfig.getConfig();
    config[section] = { ...config[section], ...updateData };
    
    const updatedConfig = await config.save();
    res.json({ [section]: updatedConfig[section] });
  } catch (error) {
    res.status(500).json({ message: 'Error updating configuration section', error: error.message });
  }
};

// Reset system configuration to defaults
exports.resetSystemConfig = async (req, res) => {
  try {
    await SystemConfig.deleteMany({});
    const defaultConfig = await SystemConfig.create({});
    res.json(defaultConfig);
  } catch (error) {
    res.status(500).json({ message: 'Error resetting system configuration', error: error.message });
  }
};
