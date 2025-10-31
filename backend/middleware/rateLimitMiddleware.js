const rateLimit = require('express-rate-limit');
const MongoStore = require('rate-limit-mongo');

// Create rate limit middleware factory
const createRateLimitMiddleware = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later',
      retryAfter: Math.ceil(options.windowMs / 1000) || 900
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Use MongoDB store for distributed rate limiting
    store: process.env.MONGODB_URI ? new MongoStore({
      uri: process.env.MONGODB_URI,
      collectionName: 'rateLimits',
      expireTimeMs: options.windowMs || 15 * 60 * 1000
    }) : undefined,
    // Custom key generator to include user ID if authenticated
    keyGenerator: (req) => {
      if (req.user && req.user.id) {
        return `${req.ip}-${req.user.id}`;
      }
      return req.ip;
    },
    // Custom handler for rate limit exceeded
    handler: (req, res) => {
      const retryAfter = Math.ceil(options.windowMs / 1000) || 900;
      
      res.status(429).json({
        success: false,
        message: options.message || 'Too many requests, please try again later',
        retryAfter,
        limit: options.max || 100,
        windowMs: options.windowMs || 15 * 60 * 1000
      });
    },
    // Skip successful requests in some cases
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    // Skip failed requests in some cases
    skipFailedRequests: options.skipFailedRequests || false
  };

  // Merge provided options with defaults
  const finalOptions = { ...defaultOptions, ...options };

  return rateLimit(finalOptions);
};

// Pre-configured rate limiters for common use cases
const rateLimitMiddleware = {
  // General API rate limiting
  general: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many API requests, please try again later'
  }),

  // Strict rate limiting for sensitive operations
  strict: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per 15 minutes
    message: 'Too many requests for this operation, please try again later'
  }),

  // Comment creation rate limiting
  comments: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 comments per 15 minutes
    message: 'Too many comments created, please try again later',
    skipSuccessfulRequests: false
  }),

  // Like/reaction rate limiting
  likes: createRateLimitMiddleware({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 likes per minute
    message: 'Too many like actions, please slow down',
    skipFailedRequests: true
  }),

  // Search rate limiting
  search: createRateLimitMiddleware({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // 20 searches per minute
    message: 'Too many search requests, please slow down'
  }),

  // Authentication rate limiting
  auth: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: true
  }),

  // File upload rate limiting
  upload: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 uploads per 15 minutes
    message: 'Too many file uploads, please try again later'
  })
};

// Export both the factory function and pre-configured limiters
module.exports = createRateLimitMiddleware;
module.exports.rateLimitMiddleware = rateLimitMiddleware;