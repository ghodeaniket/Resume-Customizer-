/**
 * Controller Utilities
 * 
 * This module provides utilities for controllers.
 */

const logger = require('./logger');

/**
 * Wrap a controller function with error handling
 * @param {Function} controllerFn - Controller function to wrap
 * @param {string} description - Description for logging
 * @returns {Function} Wrapped controller function
 */
const withErrorHandling = (controllerFn, description) => {
  return async (req, res, next) => {
    try {
      return await controllerFn(req, res, next);
    } catch (error) {
      logger.error(`${description} error:`, error);
      next(error);
    }
  };
};

/**
 * Create standard successful response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {Object} data - Response data
 * @returns {Object} Express response
 */
const successResponse = (res, statusCode, message, data = null) => {
  const response = {
    status: 'success',
    message
  };
  
  if (data) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Create standard error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} error - Error details
 * @returns {Object} Express response
 */
const errorResponse = (res, statusCode, message, error = null) => {
  const response = {
    status: 'fail',
    message
  };
  
  if (error) {
    response.error = error;
  }
  
  return res.status(statusCode).json(response);
};

module.exports = {
  withErrorHandling,
  successResponse,
  errorResponse
};
