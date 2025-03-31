/**
 * Global Error Handler Middleware
 * 
 * This middleware handles all errors throughout the application and
 * provides a consistent error response format.
 */

const logger = require('../utils/logger');
const { AppError, createAppError } = require('../utils/errors');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Convert any regular errors to AppError for consistent handling
  const error = err instanceof AppError ? err : createAppError(err);
  
  // Log the error with appropriate level based on status code
  const logMethod = error.statusCode >= 500 ? 'error' : 'warn';
  
  // Enhanced logging for serverless environment
  const logData = {
    statusCode: error.statusCode,
    code: error.code,
    path: req.path,
    method: req.method,
    errorName: error.name,
    errorMessage: error.message,
    isOperational: error.isOperational,
    environment: process.env.NODE_ENV,
    // Include additional debugging information for serverless environment
    isServerless: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
    functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
    awsRegion: process.env.AWS_REGION,
    memoryLimit: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
    remainingTime: context => context?.getRemainingTimeInMillis ? context.getRemainingTimeInMillis() : 'N/A',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
  
  // Log full error details
  logger[logMethod](`Error: ${error.message}`, logData);
  
  // If this is a production environment in Lambda, also console.log for CloudWatch logging
  if (process.env.NODE_ENV === 'production' && process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.error('ERROR DETAILS:', JSON.stringify(logData));
    console.error('STACK:', error.stack);
  }

  // Handle specific error types from external libraries
  if (err.name === 'SequelizeValidationError') {
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    error.message = err.errors.map(e => e.message).join(', ');
    error.errors = err.errors;
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    error.statusCode = 400;
    error.code = 'DUPLICATE_ERROR';
    error.message = 'Duplicate field value entered';
    error.errors = err.errors;
  } else if (err.name === 'MulterError') {
    error.statusCode = 400;
    error.code = 'FILE_UPLOAD_ERROR';
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      error.message = 'File too large';
    }
  }

  // Prepare error response
  const errorResponse = {
    status: error.statusCode >= 500 ? 'error' : 'fail',
    message: error.message,
    code: error.code,
  };
  
  // Add details for non-production environments
  if (process.env.NODE_ENV !== 'production') {
    if (error.errors) {
      errorResponse.errors = error.errors;
    }
    
    if (error.stack) {
      errorResponse.stack = error.stack;
    }
  }
  
  // Add specific data for certain error types
  if (error.resource) {
    errorResponse.resource = error.resource;
  }
  
  if (error.operation) {
    errorResponse.operation = error.operation;
  }
  
  // Add resume status if available (for resume-specific errors)
  if (err.resumeStatus) {
    errorResponse.data = {
      status: err.resumeStatus,
      error: err.resumeError
    };
  }

  // Send error response
  return res.status(error.statusCode).json(errorResponse);
};

module.exports = errorHandler;