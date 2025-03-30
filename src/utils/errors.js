/**
 * Custom Error Classes
 * 
 * This module defines custom error classes used throughout the application
 * to provide more specific error types and consistent error handling.
 */

/**
 * Base application error class
 */
class AppError extends Error {
  /**
   * Create a new AppError
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Internal error code
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Indicates this is an expected operational error
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for when a resource is not found
 */
class NotFoundError extends AppError {
  /**
   * Create a new NotFoundError
   * @param {string} message - Error message
   * @param {string} resource - Resource type
   */
  constructor(message = 'Resource not found', resource = 'resource') {
    super(message, 404, 'NOT_FOUND');
    this.resource = resource;
  }
}

/**
 * Error for validation failures
 */
class ValidationError extends AppError {
  /**
   * Create a new ValidationError
   * @param {string} message - Error message
   * @param {Object} errors - Validation errors object
   */
  constructor(message = 'Validation failed', errors = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * Error for unauthorized access attempts
 */
class UnauthorizedError extends AppError {
  /**
   * Create a new UnauthorizedError
   * @param {string} message - Error message
   */
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Error for forbidden access attempts
 */
class ForbiddenError extends AppError {
  /**
   * Create a new ForbiddenError
   * @param {string} message - Error message
   */
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Error for service unavailability
 */
class ServiceUnavailableError extends AppError {
  /**
   * Create a new ServiceUnavailableError
   * @param {string} message - Error message
   * @param {string} service - Name of the unavailable service
   */
  constructor(message = 'Service unavailable', service = 'unknown') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.service = service;
  }
}

/**
 * Error for bad gateway scenarios
 */
class BadGatewayError extends AppError {
  /**
   * Create a new BadGatewayError
   * @param {string} message - Error message
   * @param {string} gateway - Name of the gateway
   */
  constructor(message = 'Bad gateway', gateway = 'unknown') {
    super(message, 502, 'BAD_GATEWAY');
    this.gateway = gateway;
  }
}

/**
 * Error for file operations
 */
class FileError extends AppError {
  /**
   * Create a new FileError
   * @param {string} message - Error message
   * @param {string} operation - File operation that failed
   */
  constructor(message = 'File operation failed', operation = 'unknown') {
    super(message, 400, 'FILE_ERROR');
    this.operation = operation;
  }
}

/**
 * Error for unsupported file types
 */
class UnsupportedFileTypeError extends FileError {
  /**
   * Create a new UnsupportedFileTypeError
   * @param {string} message - Error message
   * @param {string} fileType - Unsupported file type
   */
  constructor(message = 'Unsupported file type', fileType = 'unknown') {
    super(message, 'validate');
    this.fileType = fileType;
    this.code = 'UNSUPPORTED_FILE_TYPE';
  }
}

/**
 * Factory to create appropriate error from generic Error
 * @param {Error} error - Original error
 * @returns {AppError} Appropriate AppError subclass
 */
function createAppError(error) {
  // If it's already an AppError, return it
  if (error instanceof AppError) {
    return error;
  }
  
  // Check for specific error types based on message or other properties
  if (error.message && error.message.toLowerCase().includes('not found')) {
    return new NotFoundError(error.message);
  }
  
  if (error.message && (
    error.message.toLowerCase().includes('validation') ||
    error.message.toLowerCase().includes('invalid')
  )) {
    return new ValidationError(error.message);
  }
  
  if (error.message && error.message.toLowerCase().includes('unauthorized')) {
    return new UnauthorizedError(error.message);
  }
  
  if (error.message && error.message.toLowerCase().includes('forbidden')) {
    return new ForbiddenError(error.message);
  }
  
  if (error.message && error.message.toLowerCase().includes('unsupported file type')) {
    return new UnsupportedFileTypeError(error.message);
  }
  
  // Default to generic AppError
  return new AppError(
    error.message || 'Something went wrong',
    error.statusCode || 500
  );
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ServiceUnavailableError,
  BadGatewayError,
  FileError,
  UnsupportedFileTypeError,
  createAppError
};
