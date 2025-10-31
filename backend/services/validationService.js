/**
 * Advanced Validation Service
 * Provides comprehensive validation utilities for the application
 */

class ValidationService {
  constructor() {
    // Common password patterns to avoid
    this.commonPasswords = [
      'password', 'password123', '123456', '123456789', 'qwerty',
      'abc123', 'password1', 'admin', 'letmein', 'welcome',
      'monkey', '1234567890', 'dragon', 'master', 'hello'
    ];

    // Disposable email domains to block
    this.disposableEmailDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'mailinator.com', 'throwaway.email', 'temp-mail.org',
      'yopmail.com', 'maildrop.cc', 'sharklasers.com'
    ];

    // Valid country codes for phone validation
    this.countryCodes = {
      'US': { code: '+1', minLength: 10, maxLength: 10 },
      'IN': { code: '+91', minLength: 10, maxLength: 10 },
      'UK': { code: '+44', minLength: 10, maxLength: 11 },
      'CA': { code: '+1', minLength: 10, maxLength: 10 },
      'AU': { code: '+61', minLength: 9, maxLength: 9 }
    };
  }

  /**
   * Validate password strength with detailed scoring
   * @param {string} password - Password to validate
   * @returns {Object} - Validation result with score and suggestions
   */
  validatePasswordStrength(password) {
    const result = {
      isValid: false,
      score: 0,
      strength: 'Very Weak',
      errors: [],
      suggestions: []
    };

    if (!password || typeof password !== 'string') {
      result.errors.push('Password is required');
      return result;
    }

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /[0-9]/.test(password),
      symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noCommon: !this.commonPasswords.includes(password.toLowerCase()),
      noRepeated: !/(.)\1{2,}/.test(password),
      noSequential: !/123|abc|qwe/i.test(password)
    };

    // Calculate score
    Object.values(checks).forEach(check => {
      if (check) score += 12.5;
    });

    // Length bonus
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Deduct points for weaknesses
    if (password.length < 8) {
      result.errors.push('Password must be at least 8 characters long');
      result.suggestions.push('Use at least 8 characters');
    }

    if (!checks.lowercase) {
      result.errors.push('Password must contain lowercase letters');
      result.suggestions.push('Add lowercase letters (a-z)');
    }

    if (!checks.uppercase) {
      result.errors.push('Password must contain uppercase letters');
      result.suggestions.push('Add uppercase letters (A-Z)');
    }

    if (!checks.numbers) {
      result.errors.push('Password must contain numbers');
      result.suggestions.push('Add numbers (0-9)');
    }

    if (!checks.symbols) {
      result.errors.push('Password must contain special characters');
      result.suggestions.push('Add special characters (!@#$%^&*)');
    }

    if (!checks.noCommon) {
      result.errors.push('Password is too common');
      result.suggestions.push('Avoid common passwords');
    }

    if (!checks.noRepeated) {
      result.errors.push('Avoid repeated characters');
      result.suggestions.push('Don\'t repeat characters (aaa, 111)');
    }

    // Determine strength
    result.score = Math.min(100, Math.max(0, score));
    
    if (result.score >= 80) {
      result.strength = 'Very Strong';
      result.isValid = true;
    } else if (result.score >= 60) {
      result.strength = 'Strong';
      result.isValid = true;
    } else if (result.score >= 40) {
      result.strength = 'Medium';
      result.isValid = result.errors.length === 0;
    } else if (result.score >= 20) {
      result.strength = 'Weak';
    } else {
      result.strength = 'Very Weak';
    }

    return result;
  }

  /**
   * Validate email with comprehensive checks
   * @param {string} email - Email to validate
   * @returns {Object} - Validation result
   */
  validateEmail(email) {
    const result = {
      isValid: false,
      errors: [],
      suggestions: []
    };

    if (!email || typeof email !== 'string') {
      result.errors.push('Email is required');
      return result;
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      result.errors.push('Invalid email format');
      return result;
    }

    const [localPart, domain] = trimmedEmail.split('@');

    // Length checks
    if (trimmedEmail.length > 254) {
      result.errors.push('Email address is too long');
    }

    if (localPart.length > 64) {
      result.errors.push('Email local part is too long');
    }

    // Local part validation
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      result.errors.push('Email cannot start or end with a dot');
    }

    if (/\.\./.test(localPart)) {
      result.errors.push('Email cannot contain consecutive dots');
    }

    // Domain validation
    if (domain.length > 253) {
      result.errors.push('Email domain is too long');
    }

    if (this.disposableEmailDomains.includes(domain)) {
      result.errors.push('Disposable email addresses are not allowed');
      result.suggestions.push('Please use a permanent email address');
    }

    // Check for common typos
    const commonDomains = {
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'hotmial.com': 'hotmail.com',
      'outlok.com': 'outlook.com'
    };

    if (commonDomains[domain]) {
      result.suggestions.push(`Did you mean ${localPart}@${commonDomains[domain]}?`);
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate phone number with international support
   * @param {string} phone - Phone number to validate
   * @param {string} countryCode - Country code (optional)
   * @returns {Object} - Validation result
   */
  validatePhoneNumber(phone, countryCode = null) {
    const result = {
      isValid: false,
      errors: [],
      formattedNumber: null,
      detectedCountry: null
    };

    if (!phone || typeof phone !== 'string') {
      result.errors.push('Phone number is required');
      return result;
    }

    // Clean the phone number
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length < 7) {
      result.errors.push('Phone number is too short');
      return result;
    }

    if (cleanPhone.length > 15) {
      result.errors.push('Phone number is too long');
      return result;
    }

    // Check for obviously fake numbers
    const fakePatterns = [
      /^0+$/, /^1+$/, /^(123){2,}/, /^1234567890$/
    ];

    for (const pattern of fakePatterns) {
      if (pattern.test(cleanPhone)) {
        result.errors.push('Please provide a valid phone number');
        return result;
      }
    }

    // Country-specific validation
    if (countryCode && this.countryCodes[countryCode]) {
      const countryInfo = this.countryCodes[countryCode];
      const expectedLength = countryInfo.minLength;
      
      if (cleanPhone.length < countryInfo.minLength || cleanPhone.length > countryInfo.maxLength) {
        result.errors.push(`Phone number must be ${expectedLength} digits for ${countryCode}`);
      } else {
        result.formattedNumber = `${countryInfo.code}${cleanPhone}`;
        result.detectedCountry = countryCode;
      }
    } else {
      // Try to detect country from number
      for (const [country, info] of Object.entries(this.countryCodes)) {
        if (cleanPhone.length >= info.minLength && cleanPhone.length <= info.maxLength) {
          result.detectedCountry = country;
          result.formattedNumber = `${info.code}${cleanPhone}`;
          break;
        }
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate name with cultural considerations
   * @param {string} name - Name to validate
   * @returns {Object} - Validation result
   */
  validateName(name) {
    const result = {
      isValid: false,
      errors: [],
      suggestions: []
    };

    if (!name || typeof name !== 'string') {
      result.errors.push('Name is required');
      return result;
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      result.errors.push('Name must be at least 2 characters long');
    }

    if (trimmedName.length > 100) {
      result.errors.push('Name must be less than 100 characters');
    }

    // Allow letters, spaces, hyphens, apostrophes, and periods
    // Support for international characters
    if (!/^[\p{L}\s\-'\.]+$/u.test(trimmedName)) {
      result.errors.push('Name can only contain letters, spaces, hyphens, apostrophes, and periods');
    }

    // Check for suspicious patterns
    if (/^\s+|\s+$/.test(name)) {
      result.suggestions.push('Remove leading/trailing spaces');
    }

    if (/\s{2,}/.test(trimmedName)) {
      result.suggestions.push('Remove extra spaces between words');
    }

    if (/^[a-z]/.test(trimmedName)) {
      result.suggestions.push('Consider capitalizing the first letter');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Sanitize input to prevent XSS and injection attacks
   * @param {string} input - Input to sanitize
   * @returns {string} - Sanitized input
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/[<>]/g, '');
  }

  /**
   * Check if input contains potential security threats
   * @param {string} input - Input to check
   * @returns {Object} - Security check result
   */
  checkSecurity(input) {
    const result = {
      isSafe: true,
      threats: []
    };

    if (typeof input !== 'string') return result;

    const threats = [
      { pattern: /<script/i, type: 'XSS Script Tag' },
      { pattern: /javascript:/i, type: 'JavaScript Protocol' },
      { pattern: /on\w+\s*=/i, type: 'Event Handler' },
      { pattern: /union\s+select/i, type: 'SQL Injection' },
      { pattern: /drop\s+table/i, type: 'SQL Injection' },
      { pattern: /insert\s+into/i, type: 'SQL Injection' },
      { pattern: /delete\s+from/i, type: 'SQL Injection' },
      { pattern: /update\s+set/i, type: 'SQL Injection' }
    ];

    for (const threat of threats) {
      if (threat.pattern.test(input)) {
        result.isSafe = false;
        result.threats.push(threat.type);
      }
    }

    return result;
  }
}

module.exports = new ValidationService();