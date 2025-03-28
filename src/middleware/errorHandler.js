const logger = require('../utils/logger');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errorType = err.name || 'Error';

  // Handle specific error types
  if (errorType === 'SequelizeValidationError') {
    statusCode = 400;
    message = err.errors.map(e => e.message).join(', ');
  } else if (errorType === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = 'Duplicate field value entered';
  } else if (errorType === 'SequelizeDatabaseError') {
    statusCode = 500;
    message = 'Database error';
  } else if (errorType === 'SyntaxError' && err.status === 400) {
    statusCode = 400;
    message = 'Invalid JSON';
  } else if (errorType === 'JsonWebTokenError' || errorType === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  } else if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    // In production, don't expose detailed error messages for 500 errors
    message = 'Internal server error';
  }

  // Send error response
  return res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
    error: errorType,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.errors || err.error || null
    })
  });
};

module.exports = errorHandler;