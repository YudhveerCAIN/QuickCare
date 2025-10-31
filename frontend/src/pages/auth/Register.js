import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    contact: '',
  });
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Real-time validation as user types
    let error = '';
    switch (name) {
      case 'name':
        error = validateName(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(value, formData.password);
        break;
      case 'contact':
        error = validateContact(value);
        break;
      default:
        break;
    }
    
    setValidationErrors({
      ...validationErrors,
      [name]: error
    });
  };

  // Real-time validation functions
  const validateName = (name) => {
    if (!name || name.trim().length < 2) {
      return 'Name must be at least 2 characters long';
    }
    if (name.trim().length > 100) {
      return 'Name must be less than 100 characters';
    }
    if (!/^[a-zA-Z\s\-'\.]+$/.test(name.trim())) {
      return 'Name can only contain letters, spaces, hyphens, apostrophes, and periods';
    }
    return '';
  };

  const validateEmail = (email) => {
    if (!email) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const validatePassword = (password) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    
    // Check for at least 2 criteria
    let criteriaCount = 0;
    if (/[a-z]/.test(password)) criteriaCount++;
    if (/[A-Z]/.test(password)) criteriaCount++;
    if (/[0-9]/.test(password)) criteriaCount++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) criteriaCount++;
    
    if (criteriaCount < 2) {
      return 'Password must contain at least 2 of: lowercase, uppercase, number, or special character';
    }
    
    // Check for weak patterns
    if (/(.)\1{2,}/.test(password) || 
        /123456|654321|qwerty|password|admin|letmein/i.test(password) ||
        /^[0-9]+$/.test(password) ||
        /^[a-zA-Z]+$/.test(password)) {
      return 'Password is too weak. Avoid common patterns and repeated characters';
    }
    
    return '';
  };

  const validateConfirmPassword = (confirmPassword, password) => {
    if (!confirmPassword) {
      return 'Please confirm your password';
    }
    if (confirmPassword !== password) {
      return 'Passwords do not match';
    }
    return '';
  };

  const validateContact = (contact) => {
    if (!contact) {
      return 'Contact number is required';
    }
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(contact)) {
      return 'Please enter a valid 10-digit Indian mobile number';
    }
    return '';
  };

  // Helper function to check if field is valid
  const isFieldValid = (fieldName) => {
    const value = formData[fieldName];
    if (!value) return false;
    
    switch (fieldName) {
      case 'name':
        return validateName(value) === '';
      case 'email':
        return validateEmail(value) === '';
      case 'password':
        return validatePassword(value) === '';
      case 'confirmPassword':
        return validateConfirmPassword(value, formData.password) === '';
      case 'contact':
        return validateContact(value) === '';
      default:
        return false;
    }
  };

  // Helper function to get validation icon
  const getValidationIcon = (fieldName) => {
    const value = formData[fieldName];
    if (!value) return null;
    
    const isValid = isFieldValid(fieldName);
    return isValid ? (
      <span className="text-green-500 text-sm">✓</span>
    ) : (
      <span className="text-red-500 text-sm">✗</span>
    );
  };

  // Helper function to check if entire form is valid
  const isFormValid = () => {
    return (
      isFieldValid('name') &&
      isFieldValid('email') &&
      isFieldValid('contact') &&
      isFieldValid('password') &&
      isFieldValid('confirmPassword')
    );
  };





  const validateForm = () => {
    const errors = {};
    
    // Validate all fields
    const nameError = validateName(formData.name);
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);
    const contactError = validateContact(formData.contact);
    const confirmPasswordError = validateConfirmPassword(formData.confirmPassword, formData.password);
    
    // Only add errors if they exist
    if (nameError) errors.name = nameError;
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;
    if (contactError) errors.contact = contactError;
    if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        contact: formData.contact.trim(),
      });
      
      if (result.success) {
        if (result.autoLogin) {
          // User is automatically logged in, redirect to dashboard
          toast.success('Registration successful! Welcome to QuickCare!');
          navigate('/dashboard');
        } else if (result.data && result.data.requiresVerification) {
          // OTP verification flow
          toast.success(result.data.message || 'Registration successful! Please check your email for OTP verification.');
          navigate('/verify-otp', { state: { email: result.data.email || formData.email } });
        } else {
          // Fallback
          toast.success('Registration successful! Please check your email for OTP verification.');
          navigate('/verify-otp', { state: { email: formData.email } });
        }
      } else {
        // Handle backend validation errors
        if (result.errors && Array.isArray(result.errors)) {
          result.errors.forEach(error => {
            toast.error(error, { duration: 6000 }); // Show longer for password errors
            
            // If it's a password error, show the requirements
            if (error.toLowerCase().includes('password')) {
              setShowPasswordRequirements(true);
              setValidationErrors(prev => ({
                ...prev,
                password: error
              }));
            }
          });
        } else {
          // Show specific error messages
          const message = result.message || 'Registration failed';
          
          if (message.includes('Email already registered')) {
            toast.error('This email is already registered. Please use a different email or try logging in instead.', {
              duration: 8000
            });
            setValidationErrors(prev => ({
              ...prev,
              email: 'This email is already registered'
            }));
          } else {
            toast.error(message);
          }
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Creating your account..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">Q</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        {/* Information Panel */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Quick Registration
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>All fields marked with <span className="text-red-500">*</span> are required</li>
                  <li>After successful registration, you'll be automatically logged in</li>
                  <li>Your phone number will be used for important notifications</li>
                  <li>Choose a strong password to keep your account secure</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Validation Progress */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Registration Progress</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`flex items-center ${isFieldValid('name') ? 'text-green-600' : 'text-gray-400'}`}>
                <span className="mr-2">{isFieldValid('name') ? '✅' : '⭕'}</span>
                Full Name
              </div>
              <div className={`flex items-center ${isFieldValid('email') ? 'text-green-600' : 'text-gray-400'}`}>
                <span className="mr-2">{isFieldValid('email') ? '✅' : '⭕'}</span>
                Email Address
              </div>
              <div className={`flex items-center ${isFieldValid('contact') ? 'text-green-600' : 'text-gray-400'}`}>
                <span className="mr-2">{isFieldValid('contact') ? '✅' : '⭕'}</span>
                Phone Number
              </div>
              <div className={`flex items-center ${isFieldValid('password') ? 'text-green-600' : 'text-gray-400'}`}>
                <span className="mr-2">{isFieldValid('password') ? '✅' : '⭕'}</span>
                Password
              </div>
              <div className={`flex items-center ${isFieldValid('confirmPassword') ? 'text-green-600' : 'text-gray-400'} col-span-2`}>
                <span className="mr-2">{isFieldValid('confirmPassword') ? '✅' : '⭕'}</span>
                Password Confirmation
              </div>
            </div>
            <div className="mt-3 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(
                    [isFieldValid('name'), isFieldValid('email'), isFieldValid('contact'), 
                     isFieldValid('password'), isFieldValid('confirmPassword')]
                    .filter(Boolean).length / 5
                  ) * 100}%`
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {[isFieldValid('name'), isFieldValid('email'), isFieldValid('contact'), 
                isFieldValid('password'), isFieldValid('confirmPassword')]
                .filter(Boolean).length} of 5 fields completed
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 flex items-center justify-between">
                <span>Full Name <span className="text-red-500">*</span></span>
                {getValidationIcon('name')}
              </label>
              <div className="relative">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 pr-10 border ${
                    validationErrors.name ? 'border-red-300 bg-red-50' : 
                    isFieldValid('name') ? 'border-green-300 bg-green-50' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {validationErrors.name}
                </p>
              )}
              {isFieldValid('name') && !validationErrors.name && (
                <p className="mt-1 text-sm text-green-600 flex items-center">
                  <span className="mr-1">✅</span>
                  Name looks good!
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 flex items-center justify-between">
                <span>Email Address <span className="text-red-500">*</span></span>
                {getValidationIcon('email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.email ? 'border-red-300 bg-red-50' : 
                  isFieldValid('email') ? 'border-green-300 bg-green-50' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
              />
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {validationErrors.email}
                </p>
              )}
              {isFieldValid('email') && !validationErrors.email && (
                <p className="mt-1 text-sm text-green-600 flex items-center">
                  <span className="mr-1">✅</span>
                  Valid email format!
                </p>
              )}
            </div>

            <div>
              <label htmlFor="contact" className="block text-sm font-medium text-gray-700 flex items-center justify-between">
                <span>Phone Number <span className="text-red-500">*</span></span>
                {getValidationIcon('contact')}
              </label>
              <input
                id="contact"
                name="contact"
                type="tel"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.contact ? 'border-red-300 bg-red-50' : 
                  isFieldValid('contact') ? 'border-green-300 bg-green-50' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="Enter your 10-digit mobile number"
                value={formData.contact}
                onChange={handleChange}
              />
              {validationErrors.contact && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {validationErrors.contact}
                </p>
              )}
              {isFieldValid('contact') && !validationErrors.contact && (
                <p className="mt-1 text-sm text-green-600 flex items-center">
                  <span className="mr-1">✅</span>
                  Valid phone number!
                </p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 flex items-center justify-between">
                <span>Password <span className="text-red-500">*</span></span>
                {getValidationIcon('password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.password ? 'border-red-300 bg-red-50' : 
                  isFieldValid('password') ? 'border-green-300 bg-green-50' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setShowPasswordRequirements(true)}
                onBlur={() => {
                  setShowPasswordRequirements(false);
                  const error = validatePassword(formData.password);
                  if (error) {
                    setValidationErrors({...validationErrors, password: error});
                  }
                }}
              />
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
              {(showPasswordRequirements || validationErrors.password) && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                  <p className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li className={`flex items-center ${formData.password.length >= 6 ? 'text-green-600' : ''}`}>
                      <span className="mr-2">{formData.password.length >= 6 ? '✓' : '•'}</span>
                      At least 6 characters long
                    </li>
                    <li className={`flex items-center ${
                      (/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password)) ||
                      (/[a-z]/.test(formData.password) && /[0-9]/.test(formData.password)) ||
                      (/[a-z]/.test(formData.password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) ||
                      (/[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password)) ||
                      (/[A-Z]/.test(formData.password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) ||
                      (/[0-9]/.test(formData.password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password))
                      ? 'text-green-600' : ''
                    }`}>
                      <span className="mr-2">{
                        (/[a-z]/.test(formData.password) && /[A-Z]/.test(formData.password)) ||
                        (/[a-z]/.test(formData.password) && /[0-9]/.test(formData.password)) ||
                        (/[a-z]/.test(formData.password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) ||
                        (/[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password)) ||
                        (/[A-Z]/.test(formData.password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) ||
                        (/[0-9]/.test(formData.password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password))
                        ? '✓' : '•'
                      }</span>
                      At least 2 of: lowercase, uppercase, number, or special character
                    </li>
                    <li className={`flex items-center ${
                      !/(.)\1{2,}/.test(formData.password) && 
                      !/123456|654321|qwerty|password|admin|letmein/i.test(formData.password) &&
                      !/^[0-9]+$/.test(formData.password) &&
                      !/^[a-zA-Z]+$/.test(formData.password)
                      ? 'text-green-600' : ''
                    }`}>
                      <span className="mr-2">{
                        !/(.)\1{2,}/.test(formData.password) && 
                        !/123456|654321|qwerty|password|admin|letmein/i.test(formData.password) &&
                        !/^[0-9]+$/.test(formData.password) &&
                        !/^[a-zA-Z]+$/.test(formData.password)
                        ? '✓' : '•'
                      }</span>
                      Avoid common patterns and repeated characters
                    </li>
                  </ul>
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 flex items-center justify-between">
                <span>Confirm Password <span className="text-red-500">*</span></span>
                {getValidationIcon('confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  validationErrors.confirmPassword ? 'border-red-300 bg-red-50' : 
                  isFieldValid('confirmPassword') ? 'border-green-300 bg-green-50' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠️</span>
                  {validationErrors.confirmPassword}
                </p>
              )}
              {isFieldValid('confirmPassword') && !validationErrors.confirmPassword && (
                <p className="mt-1 text-sm text-green-600 flex items-center">
                  <span className="mr-1">✅</span>
                  Passwords match perfectly!
                </p>
              )}
            </div>
          </div>

          {/* Debug info - remove this later */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
              <p>Form Valid: {isFormValid() ? '✅ Yes' : '❌ No'}</p>
              <p>Field Status:</p>
              <ul className="ml-4">
                <li>Name: {isFieldValid('name') ? '✅' : '❌'}</li>
                <li>Email: {isFieldValid('email') ? '✅' : '❌'}</li>
                <li>Contact: {isFieldValid('contact') ? '✅' : '❌'}</li>
                <li>Password: {isFieldValid('password') ? '✅' : '❌'}</li>
                <li>Confirm Password: {isFieldValid('confirmPassword') ? '✅' : '❌'}</li>
              </ul>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </button>
            {Object.keys(validationErrors).length > 0 && (
              <p className="mt-2 text-sm text-red-600 text-center">
                Please fix the validation errors above
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;