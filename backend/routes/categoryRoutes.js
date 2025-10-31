const express = require('express');
const Category = require('../models/Category');
const { auth } = require('../middlewares/authMiddleware');

const router = express.Router();

// Get all active categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.getActiveCategories();
    
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Get category by ID
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      category
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category'
    });
  }
});

// Create new category (Admin only)
router.post('/',
  auth,
  async (req, res) => {
    try {
      // Check if user is admin
      if (req.user.role !== 'Admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }

      const category = new Category(req.body);
      await category.save();

      res.status(201).json({
        success: true,
        message: 'Category created successfully',
        category
      });
    } catch (error) {
      console.error('Create category error:', error);
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Category name already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create category'
      });
    }
  }
);

module.exports = router;