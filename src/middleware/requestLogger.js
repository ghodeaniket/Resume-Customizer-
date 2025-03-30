/**
 * Request Logger Middleware
 * 
 * This middleware logs incoming requests and outgoing responses,
 * providing a consistent logging format for API requests.
 */

const logger = require('../utils/logger');

/**
 * Request logging middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requestLogger(req, res, next) {
  // Start time for request
  const startTime = new Date();
  const requestId = generateRequestId();
  
  // Add requestId to the request object
  req.requestId = requestId;
  
  // Log request
  logger.info(`[${requestId}] Incoming request`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    query: maskSensitiveData(req.query),
    body: maskSensitiveData(req.body)
  });
  
  // Capture response data
  const originalSend = res.send;
  
  res.send = function(body) {
    res.responseBody = body;
    return originalSend.apply(res, arguments);
  };
  
  // Log response when finished
  res.on('finish', () => {
    const responseTime = new Date() - startTime;
    
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel](`[${requestId}] Response sent`, {
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('content-length') || 0
    });
    
    // For errors, log more details but be careful with sensitive data
    if (res.statusCode >= 400) {
      let responseBody = null;
      
      try {
        if (typeof res.responseBody === 'string') {
          const parsedBody = JSON.parse(res.responseBody);
          responseBody = {
            message: parsedBody.message,
            code: parsedBody.code
          };
        }
      } catch (error) {
        // If we can't parse it, just use a placeholder
        responseBody = '[Unparseable response body]';
      }
      
      logger[logLevel](`[${requestId}] Error response details`, {
        errorBody: responseBody
      });
    }
  });
  
  next();
}

/**
 * Generate a unique request ID
 * @returns {string} Request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Mask sensitive data from request objects
 * @param {Object} data - Data object to mask
 * @returns {Object} Masked data object
 */
function maskSensitiveData(data) {
  if (!data) return data;
  
  // Create a shallow copy to avoid modifying the original
  const maskedData = { ...data };
  
  // Fields to mask
  const sensitiveFields = [
    'password', 'newPassword', 'currentPassword', 
    'token', 'accessToken', 'refreshToken',
    'apiKey', 'secret', 'authorization',
    'cardNumber', 'cvv', 'securityCode'
  ];
  
  // Mask sensitive fields
  for (const field of sensitiveFields) {
    if (field in maskedData) {
      maskedData[field] = '[REDACTED]';
    }
  }
  
  return maskedData;
}

module.exports = requestLogger;
