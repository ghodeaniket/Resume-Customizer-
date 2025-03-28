const logger = require('../utils/logger');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error with appropriate level based on status code
  const logMethod = err.statusCode >= 500 ? 'error' : 'warn';
  
  logger[logMethod](`Error: ${err.message}`, {
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    errorName: err.name,
    errorType: err.type,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });

  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errorType = err.name || err.type || 'Error';
  let errorDetails = null;

  // Handle specific error types
  if (errorType === 'SequelizeValidationError') {
    statusCode = 400;
    message = err.errors.map(e => e.message).join(', ');
    errorDetails = err.errors;
  } else if (errorType === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = 'Duplicate field value entered';
    errorDetails = err.errors;
  } else if (errorType === 'SequelizeDatabaseError') {
    statusCode = 500;
    message = 'Database error';
    errorDetails = process.env.NODE_ENV === 'development' ? err.parent : null;
  } else if (errorType === 'SyntaxError' && (err.status === 400 || err.message.includes('JSON'))) {
    statusCode = 400;
    message = 'Invalid JSON';
  } else if (errorType === 'JsonWebTokenError' || errorType === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  } else if (errorType === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large';
    } else {
      message = `File upload error: ${err.message}`;
    }
  } else if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    // In production, don't expose detailed error messages for 500 errors
    message = 'Internal server error';
    errorDetails = null;
  } else {
    // Handle custom error details
    if (err.originalError) {
      errorDetails = {
        type: err.originalError.name,
        message: err.originalError.message,
        ...(err.originalError.code && { code: err.originalError.code })
      };
    } else if (err.details) {
      errorDetails = err.details;
    }
  }

  // Prepare error response
  const errorResponse = {
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
    code: err.code || errorType,
    ...(errorDetails && process.env.NODE_ENV === 'development' && { details: errorDetails }),
    ...(err.resumeStatus && { data: {
      status: err.resumeStatus,
      error: err.resumeError
    }}),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Send error response
  return res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;