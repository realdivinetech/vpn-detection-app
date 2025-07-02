const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Strict rate limiter for detection endpoints
const detectionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 detection requests per minute
  message: {
    success: false,
    error: 'Too many detection requests. Please wait before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP address as key
    return req.headers['cf-connecting-ip'] ||
           req.headers['x-real-ip'] ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '127.0.0.1';
  }
});

// Admin endpoints rate limiter
const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 admin requests per minute
  message: {
    success: false,
    error: 'Too many admin requests from this IP.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Export rate limiter for heavy operations
const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 exports per hour
  message: {
    success: false,
    error: 'Export limit reached. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  generalLimiter,
  detectionLimiter,
  adminLimiter,
  exportLimiter
};