/**
 * Logger Middleware
 * 
 * Provides consistent logging for HTTP requests and responses
 */

const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Safely stringify objects for logging
 * @param {Object} obj - Object to stringify
 * @returns {string} Stringified object
 */
function safeStringify(obj) {
  try {
    return JSON.stringify(obj, (key, value) => {
      // Handle circular references
      if (key && typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      // Mask sensitive fields
      if (
        key === 'password' || 
        key === 'token' || 
        key === 'accessToken' || 
        key === 'refreshToken' ||
        key === 'apiKey' ||
        key === 'authorization'
      ) {
        return '[REDACTED]';
      }
      return value;
    });
  } catch (error) {
    return `[Error: ${error.message}]`;
  }
}

/**
 * HTTP request logger middleware
 */
function requestLogger(req, res, next) {
  // Generate a unique request ID
  req.requestId = uuidv4();
  
  // Start timer
  const start = Date.now();
  
  // Log request
  logger.info(`${req.method} ${req.originalUrl}`, {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    query: req.query,
    params: req.params,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Log request body for non-GET requests (with sensitive info redacted)
  if (req.method !== 'GET' && req.body) {
    const seen = new WeakSet();
    logger.debug('Request Body:', {
      requestId: req.requestId,
      body: safeStringify(req.body)
    });
  }
  
  // Capture the original send method
  const originalSend = res.send;
  
  // Override the send method to log response
  res.send = function(body) {
    // Calculate duration
    const duration = Date.now() - start;
    
    // Log response summary
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration
    });
    
    // For non-200 responses, log the response body (with sensitive info redacted)
    if (res.statusCode >= 400) {
      const seen = new WeakSet();
      let responseBody;
      
      // Parse JSON if it's a string
      if (typeof body === 'string') {
        try {
          responseBody = JSON.parse(body);
        } catch (e) {
          responseBody = body.slice(0, 1000); // Limit string length
        }
      } else {
        responseBody = body;
      }
      
      logger.debug('Response Body:', {
        requestId: req.requestId,
        body: safeStringify(responseBody)
      });
    }
    
    // Call the original send method
    originalSend.call(this, body);
    return this;
  };
  
  next();
}

/**
 * Error logger middleware
 */
function errorLogger(err, req, res, next) {
  // Include request ID if available
  const requestId = req.requestId || uuidv4();
  
  // Log the error
  logger.error(`Error: ${err.message}`, {
    requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode: err.statusCode || 500,
    errorName: err.name,
    errorMessage: err.message,
    errorStack: err.stack
  });
  
  next(err);
}

module.exports = {
  requestLogger,
  errorLogger
};
