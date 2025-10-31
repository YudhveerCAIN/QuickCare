const validateRegistration = (req, res, next) => {
  const { name, email, password, contact } = req.body;
  const errors = [];

  // Enhanced name validation
  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  } else if (name.trim().length > 100) {
    errors.push('Name must be less than 100 characters');
  } else if (!/^[a-zA-Z\s\-'\.]+$/.test(name.trim())) {
    errors.push('Name can only contain letters, spaces, hyphens, apostrophes, and periods');
  }

  // Simple email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || !emailRegex.test(email)) {
    errors.push('Please provide a valid email address');
  } else if (email.length > 255) {
    errors.push('Email address is too long');
  }

  // Enhanced password validation with strength requirements
  if (!password) {
    errors.push('Password is required');
  } else {
    const passwordErrors = validatePasswordStrength(password);
    errors.push(...passwordErrors);
  }

  // Enhanced contact validation with international format support
  if (!contact || contact.trim().length < 10) {
    errors.push('Contact number must be at least 10 digits');
  } else {
    const phoneErrors = validatePhoneNumber(contact);
    errors.push(...phoneErrors);
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      success: false,
      message: 'Validation failed', 
      errors 
    });
  }

  next();
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Array} - Array of error messages
 */
const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }
  
  // More lenient validation - just require at least 2 of these criteria
  let criteriaCount = 0;
  
  if (/[a-z]/.test(password)) criteriaCount++;
  if (/[A-Z]/.test(password)) criteriaCount++;
  if (/[0-9]/.test(password)) criteriaCount++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) criteriaCount++;
  
  if (criteriaCount < 2) {
    errors.push('Password must contain at least 2 of the following: lowercase letter, uppercase letter, number, or special character');
  }
  
  // Check for common weak patterns
  const weakPatterns = [
    /(.)\1{2,}/, // Repeated characters (aaa, 111)
    /123456|654321|qwerty|password|admin|letmein/i, // Common passwords
    /^[0-9]+$/, // Only numbers
    /^[a-zA-Z]+$/ // Only letters
  ];
  
  for (const pattern of weakPatterns) {
    if (pattern.test(password)) {
      errors.push('Password is too weak. Avoid common patterns and repeated characters');
      break;
    }
  }
  
  return errors;
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {Array} - Array of error messages
 */
const validatePhoneNumber = (phone) => {
  const errors = [];
  
  // Remove all non-digit characters for validation
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length < 10) {
    errors.push('Phone number must have at least 10 digits');
  }
  
  if (cleanPhone.length > 15) {
    errors.push('Phone number cannot exceed 15 digits');
  }
  
  // Simple validation - just check if it's all digits and reasonable length
  if (!/^\d{10,15}$/.test(cleanPhone)) {
    errors.push('Please provide a valid phone number (10-15 digits)');
  }
  
  return errors;
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  const errors = [];

  // Enhanced email validation for login
  if (!email) {
    errors.push('Email is required');
  } else if (typeof email !== 'string') {
    errors.push('Email must be a string');
  } else if (email.length > 255) {
    errors.push('Email address is too long');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Please provide a valid email address');
    }
  }

  // Enhanced password validation for login
  if (!password) {
    errors.push('Password is required');
  } else if (typeof password !== 'string') {
    errors.push('Password must be a string');
  } else if (password.length > 128) {
    errors.push('Password is too long');
  }

  // Check for potential injection attempts
  const suspiciousPatterns = [
    /<script/i, // XSS attempts
    /javascript:/i, // JavaScript injection
    /on\w+\s*=/i, // Event handlers
    /union\s+select/i, // SQL injection
    /drop\s+table/i, // SQL injection
    /insert\s+into/i // SQL injection
  ];

  const inputToCheck = `${email} ${password}`;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(inputToCheck)) {
      errors.push('Invalid input detected');
      break;
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      success: false,
      message: 'Validation failed', 
      errors 
    });
  }

  next();
};

const validateIssue = (req, res, next) => {
  const { title, description, category, priority, lat, lng, address } = req.body;
  const errors = [];

  // Title validation
  if (!title || title.trim().length < 5) {
    errors.push('Title must be at least 5 characters long');
  }

  // Description validation
  if (!description || description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long');
  }

  // Category validation
  const validCategories = ['road', 'water', 'electricity', 'public safety', 'sanitation', 'infrastructure', 'other'];
  if (!category || !validCategories.includes(category)) {
    errors.push('Category must be one of: road, water, electricity, public safety, sanitation, infrastructure, other');
  }

  // Priority validation
  const validPriorities = ['low', 'medium', 'high', 'urgent'];
  if (priority && !validPriorities.includes(priority)) {
    errors.push('Priority must be one of: low, medium, high, urgent');
  }

  // Location validation - expect separate lat, lng, address fields
  if (!lat || !lng || !address) {
    errors.push('Location fields (lat, lng, address) are required');
  } else {
    // Validate coordinate ranges
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      errors.push('Latitude must be a valid number between -90 and 90');
    }
    
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      errors.push('Longitude must be a valid number between -180 and 180');
    }
    
    if (!address.trim()) {
      errors.push('Address is required');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      success: false,
      message: 'Validation failed', 
      errors 
    });
  }

  next();
};

const validateComment = (req, res, next) => {
  const { text } = req.body;
  const errors = [];

  if (!text || text.trim().length < 1) {
    errors.push('Comment text is required');
  }

  if (text && text.trim().length > 500) {
    errors.push('Comment text must be less than 500 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      message: 'Validation failed', 
      errors 
    });
  }

  next();
};

const validateObjectId = (req, res, next) => {
  const { id, issueId, userId } = req.params;
  const objectId = id || issueId || userId;
  
  if (!objectId || !/^[0-9a-fA-F]{24}$/.test(objectId)) {
    return res.status(400).json({ 
      message: 'Invalid ID format' 
    });
  }

  next();
};

const validateProfileUpdate = (req, res, next) => {
  const { name, email, contact, address } = req.body;
  const errors = [];

  // Name validation
  if (name !== undefined) {
    if (!name || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    if (name && name.length > 100) {
      errors.push('Name must be less than 100 characters');
    }
  }

  // Email validation
  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.push('Please provide a valid email address');
    }
    if (email && email.length > 255) {
      errors.push('Email address is too long');
    }
  }

  // Contact validation
  if (contact !== undefined) {
    if (!contact || contact.trim().length < 10) {
      errors.push('Contact number must be at least 10 digits');
    }
    // Enhanced phone number validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanContact = contact.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleanContact)) {
      errors.push('Please provide a valid contact number');
    }
  }

  // Address validation
  if (address !== undefined && address !== null) {
    if (typeof address !== 'object') {
      errors.push('Address must be an object');
    } else {
      if (address.street && address.street.length > 255) {
        errors.push('Street address is too long');
      }
      if (address.city && address.city.length > 100) {
        errors.push('City name is too long');
      }
      if (address.state && address.state.length > 100) {
        errors.push('State name is too long');
      }
      if (address.zipCode && !/^[0-9]{5,10}$/.test(address.zipCode)) {
        errors.push('Please provide a valid zip code');
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      success: false,
      message: 'Validation failed', 
      errors 
    });
  }

  next();
};

const validateEmailChangeOTP = (req, res, next) => {
  const { otp } = req.body;
  const errors = [];

  if (!otp) {
    errors.push('OTP is required');
  } else if (typeof otp !== 'string') {
    errors.push('OTP must be a string');
  } else if (!/^[0-9]{6}$/.test(otp)) {
    errors.push('OTP must be a 6-digit number');
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      success: false,
      message: 'Validation failed', 
      errors 
    });
  }

  next();
};

/**
 * Validate password change request
 */
const validatePasswordChange = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const errors = [];

  if (!currentPassword) {
    errors.push('Current password is required');
  } else if (typeof currentPassword !== 'string') {
    errors.push('Current password must be a string');
  }

  if (!newPassword) {
    errors.push('New password is required');
  } else if (typeof newPassword !== 'string') {
    errors.push('New password must be a string');
  } else {
    // Validate new password strength
    const passwordErrors = validatePasswordStrength(newPassword);
    errors.push(...passwordErrors);
    
    // Check if new password is same as current
    if (currentPassword && newPassword === currentPassword) {
      errors.push('New password must be different from current password');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      success: false,
      message: 'Validation failed', 
      errors 
    });
  }

  next();
};

/**
 * Validate email format and domain
 */
const validateEmailFormat = (req, res, next) => {
  const { email } = req.body;
  const errors = [];

  if (email !== undefined) {
    if (!email || typeof email !== 'string') {
      errors.push('Email must be a valid string');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.push('Please provide a valid email address');
      } else if (email.length > 255) {
        errors.push('Email address is too long');
      } else {
        // Advanced email validation
        const localPart = email.split('@')[0];
        const domain = email.split('@')[1]?.toLowerCase();
        
        // Check local part length
        if (localPart.length > 64) {
          errors.push('Email local part is too long');
        }
        
        // Check for consecutive dots
        if (/\.\./.test(email)) {
          errors.push('Email cannot contain consecutive dots');
        }
        
        // Check for valid domain format
        if (domain) {
          if (domain.length > 253) {
            errors.push('Email domain is too long');
          }
          
          if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
            errors.push('Email domain contains invalid characters');
          }
          
          if (domain.startsWith('.') || domain.endsWith('.')) {
            errors.push('Email domain cannot start or end with a dot');
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      success: false,
      message: 'Email validation failed', 
      errors 
    });
  }

  next();
};

/**
 * Sanitize input to prevent XSS and injection attacks
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    return str
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[<>]/g, ''); // Remove angle brackets
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateIssue,
  validateComment,
  validateObjectId,
  validateProfileUpdate,
  validateEmailChangeOTP,
  validatePasswordChange,
  validateEmailFormat,
  sanitizeInput,
  validatePasswordStrength,
  validatePhoneNumber
};
