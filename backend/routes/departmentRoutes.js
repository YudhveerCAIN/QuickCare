const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const {auth} = require('../middlewares/authMiddleware');
const { roleMiddleware } = require('../middlewares/roleMiddlerware');

// Get all departments
router.get('/', async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching departments', error: error.message });
  }
});

// Create department (admin/system_admin only)
router.post('/', 
  auth, 
  roleMiddleware('admin', 'system_admin'), 
  async (req, res) => {
    try {
      const { name, description, contactInfo, location } = req.body;

      const department = await Department.create({
        name,
        description,
        contactInfo,
        location,
        isActive: true
      });

      res.status(201).json(department);
    } catch (error) {
      res.status(500).json({ message: 'Error creating department', error: error.message });
    }
  }
);

// Update department (admin/system_admin only)
router.put('/:id', 
  auth, 
  roleMiddleware('admin', 'system_admin'), 
  async (req, res) => {
    try {
      const { name, description, contactInfo, location, isActive } = req.body;

      const department = await Department.findByIdAndUpdate(
        req.params.id,
        { name, description, contactInfo, location, isActive },
        { new: true, runValidators: true }
      );

      if (!department) {
        return res.status(404).json({ message: 'Department not found' });
      }

      res.json(department);
    } catch (error) {
      res.status(500).json({ message: 'Error updating department', error: error.message });
    }
  }
);

// Delete department (admin/system_admin only)
router.delete('/:id', 
  auth, 
  roleMiddleware('admin', 'system_admin'), 
  async (req, res) => {
    try {
      const department = await Department.findByIdAndDelete(req.params.id);

      if (!department) {
        return res.status(404).json({ message: 'Department not found' });
      }

      res.json({ message: 'Department deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting department', error: error.message });
    }
  }
);

module.exports = router;
