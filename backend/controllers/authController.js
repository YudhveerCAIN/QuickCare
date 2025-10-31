const User=require('../models/User');
const bcrypt=require('bcrypt');
const otpService=require('../services/otpService');
const jwtService=require('../services/jwtService');
const sessionService=require('../services/sessionService');
const securityService=require('../services/securityService');
const {clearFailedLoginAttempts}=require('../middlewares/rateLimitMiddleware');

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private


exports.register=async (req,res)=>{
    try{
        const {name,email,password,contact,role='citizen',department,employeeId,address}=req.body;

        // Check if user already exists and is verified
        const existingUser=await User.findOne({email});
        if(existingUser && existingUser.isVerified){
            return res.status(400).json({
                success: false,
                message:'Email already registered and verified'
            });
        }

        // If user exists but is not verified, delete the old record to allow re-registration
        if(existingUser && !existingUser.isVerified){
            await User.findByIdAndDelete(existingUser._id);
            // Also invalidate any existing OTPs for this email
            await otpService.invalidateOTPs(email, 'registration');
        }

        // Validate required fields based on role
        if (['department_officer', 'admin'].includes(role) && !department) {
            return res.status(400).json({
                success: false,
                message:'Department is required for this role'
            });
        }

        if (['department_officer', 'admin', 'moderator', 'system_admin'].includes(role) && !employeeId) {
            return res.status(400).json({
                success: false,
                message:'Employee ID is required for this role'
            });
        }

        const userData = {
            name,
            email,
            password,
            contact,
            role,
            isVerified: false, // Require email verification
            isActive: true
        };

        // Add optional fields if provided
        if (department) userData.department = department;
        if (employeeId) userData.employeeId = employeeId;
        if (address) userData.address = address;

        // Create user (unverified)
        const user = await User.create(userData);
        
        console.log('User created, sending verification email:', {
            id: user._id,
            email: user.email,
            isVerified: user.isVerified
        });

        // Send OTP for email verification
        const otpService = require('../services/otpService');
        const otpResult = await otpService.generateAndSendOTP(email, 'registration');
        
        if (!otpResult.success) {
            // If OTP sending fails, still return success but inform user
            console.error('Failed to send OTP:', otpResult.message);
            return res.status(201).json({
                success: true,
                message: 'Registration successful! However, there was an issue sending the verification email. Please try resending the OTP.',
                requiresVerification: true,
                email: user.email
            });
        }

        // Log successful registration
        await securityService.logSecurityEvent(
            'USER_REGISTERED',
            user._id,
            user.email,
            req.ip,
            req.get('User-Agent'),
            {
                role: user.role,
                requiresVerification: true
            }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful! Please check your email for the verification code.',
            requiresVerification: true,
            email: user.email
        });

    }catch(err){
        console.error('Registration error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Server error during registration', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
}
// @desc    Login a user
// @route   POST /api/auth/login
// @access  Public

exports.login= async (req,res)=>{
    try{
        const {email,password}=req.body;
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');

        // Check for login lock
        const lockStatus = securityService.checkLoginLock(email, ipAddress);
        if (lockStatus.locked) {
            const waitMinutes = Math.ceil(lockStatus.remainingTime / (60 * 1000));
            return res.status(429).json({
                success: false,
                message: `Account temporarily locked due to multiple failed login attempts. Try again in ${waitMinutes} minutes.`,
                code: 'ACCOUNT_TEMPORARILY_LOCKED',
                expiresAt: lockStatus.expiresAt,
                consecutiveFailures: lockStatus.consecutiveFailures
            });
        }

        const user=await User.findOne({email}).select('+password');
        if(!user){
            // Track failed login attempt
            securityService.trackLoginAttempt(email, ipAddress, false, 'USER_NOT_FOUND');
            return res.status(400).json({
                success: false,
                message:'Invalid credentials'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            securityService.trackLoginAttempt(email, ipAddress, false, 'ACCOUNT_DEACTIVATED');
            return res.status(403).json({ 
                success: false,
                message: 'Account is deactivated. Please contact administrator.' 
            });
        }

        // Check if user is verified
        if (!user.isVerified) {
            securityService.trackLoginAttempt(email, ipAddress, false, 'EMAIL_NOT_VERIFIED');
            return res.status(403).json({ 
                success: false,
                message: 'Please verify your email address before logging in. Check your email for the verification code.',
                code: 'EMAIL_NOT_VERIFIED',
                email: user.email
            });
        }

        const isMatch= await bcrypt.compare(password,user.password)
        if(!isMatch){
            // Track failed login attempt
            securityService.trackLoginAttempt(email, ipAddress, false, 'INVALID_PASSWORD');
            return res.status(400).json({ 
                success: false,
                message: 'Invalid credentials' 
            });
        }

        // Track successful login
        securityService.trackLoginAttempt(email, ipAddress, true);

        // Clear any failed login attempts on successful login
        clearFailedLoginAttempts(email, req.ip);

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Create session with enhanced session service
        const deviceInfo = sessionService.detectDeviceInfo(req);
        deviceInfo.loginMethod = 'password';

        const sessionResult = await sessionService.createSession(user._id, {
            role: user.role,
            name: user.name,
            email: user.email,
            department: user.department,
            permissions: user.permissions,
            lastLogin: user.lastLogin
        }, deviceInfo);

        if (!sessionResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create session'
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                department: user.department,
                permissions: user.permissions,
                isActive: user.isActive,
                isVerified: user.isVerified,
                lastLogin: user.lastLogin
            },
            accessToken: sessionResult.tokens.accessToken,
            refreshToken: sessionResult.tokens.refreshToken,
            expiresIn: sessionResult.tokens.expiresIn,
            tokenType: sessionResult.tokens.tokenType,
            sessionId: sessionResult.session.id
        });

    }catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            success: false,
            message: 'Server error during login', 
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
}


// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private

exports.getMe=async (req,res)=>{
    try{
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('assignedIssues', 'title status priority')
            .populate('reportedIssues', 'title status priority');
        
        res.json(user);
    }catch(err){
        res.status(500).json({message:'Server error fetching profile'});
    }
}

exports.updateProfile = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      contact, 
      address,
      profileImage,
      department,
      employeeId 
    } = req.body;
    
    const updateFields = {};
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Enhanced validation
    if (name !== undefined) {
      if (!name || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Name must be at least 2 characters long'
        });
      }
      updateFields.name = name.trim();
    }

    if (contact !== undefined) {
      if (!contact || contact.trim().length < 10) {
        return res.status(400).json({
          success: false,
          message: 'Contact number must be at least 10 digits'
        });
      }
      // Basic phone number validation
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(contact.replace(/[\s\-\(\)]/g, ''))) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid contact number'
        });
      }
      updateFields.contact = contact.trim();
    }

    if (address !== undefined) {
      updateFields.address = address;
    }

    if (profileImage !== undefined) {
      updateFields.profileImage = profileImage;
    }

    // Role-based field updates
    if (department !== undefined && ['department_officer', 'admin', 'moderator', 'system_admin'].includes(req.user.role)) {
      updateFields.department = department;
    }

    if (employeeId !== undefined && ['department_officer', 'admin', 'moderator', 'system_admin'].includes(req.user.role)) {
      updateFields.employeeId = employeeId;
    }

    // Handle email change with re-verification
    if (email !== undefined && email !== req.user.email) {
      // Enhanced email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }

      // Check if email is already taken
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: req.user._id } 
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email address is already registered'
        });
      }

      // Generate OTP for email verification
      try {
        const otpResult = await otpService.generateAndSendOTP(email.toLowerCase(), 'email_change', req.user._id);
        
        // Store pending email change
        updateFields.pendingEmailChange = email.toLowerCase();
        
        // Log security event
        securityService.logSecurityEvent(
          'EMAIL_CHANGE_REQUESTED',
          req.user._id,
          req.user.email,
          ipAddress,
          userAgent,
          {
            oldEmail: req.user.email,
            newEmail: email.toLowerCase()
          }
        );

        const updatedUser = await User.findByIdAndUpdate(
          req.user._id,
          updateFields,
          { new: true, runValidators: true }
        ).select('-password');

        return res.json({
          success: true,
          message: 'Profile updated. Please verify your new email address.',
          user: updatedUser,
          emailChangeRequested: true,
          otpSent: true,
          expiresAt: otpResult.expiresAt,
          profileCompletion: calculateProfileCompletion(updatedUser),
          ...(process.env.NODE_ENV === 'development' && { 
            emailPreview: otpResult.emailPreview 
          })
        });

      } catch (otpError) {
        console.error('OTP sending failed during email change:', otpError);
        return res.status(500).json({
          success: false,
          message: 'Failed to send verification email. Please try again.',
          error: process.env.NODE_ENV === 'development' ? otpError.message : undefined
        });
      }
    }

    // Update user profile
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    // Log profile update
    securityService.logSecurityEvent(
      'PROFILE_UPDATED',
      req.user._id,
      req.user.email,
      ipAddress,
      userAgent,
      {
        updatedFields: Object.keys(updateFields)
      }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
      profileCompletion: calculateProfileCompletion(updatedUser)
    });

  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during profile update',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

/**
 * Verify email change with OTP
 * @route POST /api/auth/verify-email-change
 * @access Private
 */
exports.verifyEmailChange = async (req, res) => {
  try {
    const { otp } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user.pendingEmailChange) {
      return res.status(400).json({
        success: false,
        message: 'No pending email change found'
      });
    }

    // Verify OTP
    const verification = await otpService.verifyOTP(user.pendingEmailChange, otp, 'email_change');
    
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.message,
        attemptsRemaining: verification.attemptsRemaining
      });
    }

    // Update email and clear pending change
    const oldEmail = user.email;
    user.email = user.pendingEmailChange;
    user.pendingEmailChange = undefined;
    await user.save();

    // Log security event
    securityService.logSecurityEvent(
      'EMAIL_CHANGED',
      user._id,
      user.email,
      ipAddress,
      userAgent,
      {
        oldEmail,
        newEmail: user.email
      }
    );

    res.json({
      success: true,
      message: 'Email address updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        permissions: user.permissions,
        isActive: user.isActive,
        isVerified: user.isVerified
      },
      profileCompletion: calculateProfileCompletion(user)
    });

  } catch (error) {
    console.error('Email change verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  }
};

/**
 * Get profile completion status
 * @route GET /api/auth/profile-completion
 * @access Private
 */
exports.getProfileCompletion = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const completion = calculateProfileCompletion(user);

    res.json({
      success: true,
      profileCompletion: completion,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        contact: user.contact,
        address: user.address,
        profileImage: user.profileImage,
        department: user.department,
        employeeId: user.employeeId,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Profile completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile completion'
    });
  }
};

/**
 * Calculate profile completion percentage
 * @param {Object} user - User object
 * @returns {Object} - Completion data
 */
function calculateProfileCompletion(user) {
  const requiredFields = ['name', 'email', 'contact'];
  const optionalFields = ['address', 'profileImage'];
  const roleSpecificFields = [];

  // Add role-specific required fields
  if (['department_officer', 'admin', 'moderator', 'system_admin'].includes(user.role)) {
    roleSpecificFields.push('department', 'employeeId');
  }

  const allRequiredFields = [...requiredFields, ...roleSpecificFields];
  const allFields = [...allRequiredFields, ...optionalFields];

  let completedRequired = 0;
  let completedOptional = 0;
  const missingFields = [];

  // Check required fields
  allRequiredFields.forEach(field => {
    if (field === 'address') {
      if (user.address && (user.address.street || user.address.city)) {
        completedRequired++;
      } else {
        missingFields.push(field);
      }
    } else if (user[field] && user[field].toString().trim()) {
      completedRequired++;
    } else {
      missingFields.push(field);
    }
  });

  // Check optional fields
  optionalFields.forEach(field => {
    if (field === 'address') {
      if (user.address && user.address.street && user.address.city && user.address.state) {
        completedOptional++;
      }
    } else if (user[field] && user[field].toString().trim()) {
      completedOptional++;
    }
  });

  const requiredPercentage = allRequiredFields.length > 0 
    ? Math.round((completedRequired / allRequiredFields.length) * 100) 
    : 100;
  
  const overallPercentage = allFields.length > 0 
    ? Math.round(((completedRequired + completedOptional) / allFields.length) * 100) 
    : 100;

  return {
    requiredPercentage,
    overallPercentage,
    completedRequired,
    totalRequired: allRequiredFields.length,
    completedOptional,
    totalOptional: optionalFields.length,
    missingFields,
    isComplete: requiredPercentage === 100,
    nextSteps: getNextSteps(missingFields, user.role)
  };
}

/**
 * Upload profile image
 * @route POST /api/auth/upload-profile-image
 * @access Private
 */
exports.uploadProfileImage = async (req, res) => {
  try {
    const { imageData, fileName } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: 'Image data is required'
      });
    }

    // Basic image validation
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const base64Pattern = /^data:image\/(jpeg|jpg|png|gif);base64,/;
    
    if (!base64Pattern.test(imageData)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image format. Please upload JPEG, PNG, or GIF images.'
      });
    }

    // Extract image type and data
    const matches = imageData.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image data format'
      });
    }

    const imageType = matches[1];
    const base64Data = matches[2];

    // Check file size (limit to 5MB)
    const sizeInBytes = (base64Data.length * 3) / 4;
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (sizeInBytes > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'Image size must be less than 5MB'
      });
    }

    // For now, we'll store the base64 data directly
    // In production, you would upload to a service like Cloudinary or AWS S3
    const profileImageUrl = imageData;

    // Update user profile with new image
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: profileImageUrl },
      { new: true, runValidators: true }
    ).select('-password');

    // Log security event
    securityService.logSecurityEvent(
      'PROFILE_IMAGE_UPDATED',
      req.user._id,
      req.user.email,
      ipAddress,
      userAgent,
      {
        fileName: fileName || 'unknown',
        imageType,
        sizeInBytes
      }
    );

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      user: updatedUser,
      profileCompletion: calculateProfileCompletion(updatedUser)
    });

  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during image upload'
    });
  }
};

/**
 * Delete profile image
 * @route DELETE /api/auth/profile-image
 * @access Private
 */
exports.deleteProfileImage = async (req, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Update user profile to remove image
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $unset: { profileImage: 1 } },
      { new: true, runValidators: true }
    ).select('-password');

    // Log security event
    securityService.logSecurityEvent(
      'PROFILE_IMAGE_DELETED',
      req.user._id,
      req.user.email,
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      message: 'Profile image deleted successfully',
      user: updatedUser,
      profileCompletion: calculateProfileCompletion(updatedUser)
    });

  } catch (error) {
    console.error('Profile image deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during image deletion'
    });
  }
};

/**
 * Get suggested next steps for profile completion
 * @param {Array} missingFields - Array of missing field names
 * @param {String} userRole - User's role
 * @returns {Array} - Array of next step suggestions
 */
function getNextSteps(missingFields, userRole) {
  const steps = [];
  
  if (missingFields.includes('contact')) {
    steps.push('Add your contact number for better communication');
  }
  
  if (missingFields.includes('address')) {
    steps.push('Complete your address information');
  }
  
  if (missingFields.includes('profileImage')) {
    steps.push('Upload a profile picture');
  }
  
  if (missingFields.includes('department') && ['department_officer', 'admin', 'moderator', 'system_admin'].includes(userRole)) {
    steps.push('Specify your department');
  }
  
  if (missingFields.includes('employeeId') && ['department_officer', 'admin', 'moderator', 'system_admin'].includes(userRole)) {
    steps.push('Add your employee ID');
  }

  if (steps.length === 0) {
    steps.push('Your profile is complete! Consider adding optional information.');
  }

  return steps;
}

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log security event
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    securityService.logPasswordChange(user._id, user.email, ipAddress, userAgent);

    res.json({ 
      success: true,
      message: 'Password changed successfully' 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during password change' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting user' });
  }
};

/**
 * Refresh access token
 * @route POST /api/auth/refresh-token
 * @access Public
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Get updated user data
    const verification = jwtService.verifyRefreshToken(refreshToken);
    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        message: verification.error,
        code: verification.code
      });
    }

    // Get fresh user data
    const user = await User.findById(verification.payload.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
        code: 'USER_INACTIVE'
      });
    }

    // Refresh session with updated user data
    const sessionRefresh = await sessionService.refreshSession(refreshToken, {
      role: user.role,
      name: user.name,
      email: user.email,
      department: user.department,
      permissions: user.permissions,
      lastLogin: user.lastLogin
    });

    if (!sessionRefresh.success) {
      return res.status(401).json({
        success: false,
        message: sessionRefresh.error,
        code: sessionRefresh.code
      });
    }

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: sessionRefresh.tokens.accessToken,
      refreshToken: sessionRefresh.tokens.refreshToken,
      expiresIn: sessionRefresh.tokens.expiresIn,
      tokenType: sessionRefresh.tokens.tokenType,
      sessionId: sessionRefresh.session.id
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh'
    });
  }
};

/**
 * Logout user (invalidate session)
 * @route POST /api/auth/logout
 * @access Private
 */
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const accessToken = req.headers.authorization?.split(' ')[1];

    // Use session service to invalidate session
    const token = refreshToken || accessToken;
    if (token) {
      const result = await sessionService.invalidateSession(token, 'logout');
      
      if (!result.success) {
        console.warn('Session invalidation warning:', result.error);
        // Continue with logout even if session invalidation fails
      }
    }

    // Log security event
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    securityService.logSecurityEvent('LOGOUT', req.user._id, req.user.email, ipAddress, userAgent);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

/**
 * Logout from all devices (invalidate all user sessions)
 * @route POST /api/auth/logout-all
 * @access Private
 */
exports.logoutAll = async (req, res) => {
  try {
    // Invalidate all user sessions
    const result = await sessionService.invalidateAllUserSessions(req.user._id, 'logout_all');

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }

    // Log security event
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    securityService.logSecurityEvent('LOGOUT_ALL_DEVICES', req.user._id, req.user.email, ipAddress, userAgent);

    res.json({
      success: true,
      message: 'Logged out from all devices successfully',
      sessionsInvalidated: result.sessionsInvalidated
    });

  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

/**
 * Get security events (admin only)
 * @route GET /api/auth/security-events
 * @access Private (Admin)
 */
exports.getSecurityEvents = async (req, res) => {
  try {
    const { limit = 100, severity, userId } = req.query;

    if (userId) {
      const events = securityService.getUserSecurityEvents(userId, parseInt(limit));
      return res.json({
        success: true,
        events,
        count: events.length
      });
    }

    const events = securityService.getRecentSecurityEvents(parseInt(limit), severity);
    const stats = securityService.getSecurityStats();

    res.json({
      success: true,
      events,
      stats,
      count: events.length
    });

  } catch (error) {
    console.error('Get security events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching security events'
    });
  }
};
// Log security event endpoint
exports.logSecurityEvent = async (req, res) => {
  try {
    const { type, eventType, metadata, details, severity = 'medium' } = req.body;
    
    // Accept either 'type' or 'eventType' field
    const actualEventType = type || eventType;
    
    if (!actualEventType) {
      return res.status(400).json({
        success: false,
        message: 'Event type is required'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    // Log the security event
    const event = await securityService.logSecurityEvent(
      actualEventType,
      req.user._id,
      req.user.email,
      ipAddress,
      userAgent,
      {
        severity,
        ...metadata,
        ...details
      }
    );

    res.json({
      success: true,
      message: 'Security event logged successfully',
      event
    });

  } catch (error) {
    console.error('Log security event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error logging security event'
    });
  }
};

/**
 * Get user's active sessions
 * @route GET /api/auth/sessions
 * @access Private
 */
exports.getUserSessions = async (req, res) => {
  try {
    const sessions = await sessionService.getUserSessions(req.user._id);
    
    res.json({
      success: true,
      sessions,
      count: sessions.length
    });

  } catch (error) {
    console.error('Get user sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching sessions'
    });
  }
};

/**
 * Invalidate specific session
 * @route DELETE /api/auth/sessions/:sessionId
 * @access Private
 */
exports.invalidateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get session to verify ownership
    const Session = require('../models/Session');
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Verify user owns this session
    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Invalidate session
    const result = await sessionService.invalidateSession(session.accessToken, 'manual_invalidation');
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      message: 'Session invalidated successfully'
    });

  } catch (error) {
    console.error('Invalidate session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error invalidating session'
    });
  }
};

/**
 * Get session statistics (admin only)
 * @route GET /api/auth/sessions/stats
 * @access Private (Admin)
 */
exports.getSessionStats = async (req, res) => {
  try {
    const stats = await sessionService.getSessionStats();
    
    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Get session stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching session statistics'
    });
  }
};