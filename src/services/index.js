/**
 * Services Index
 * 
 * This module provides a clean interface to access all services used in the application.
 * Services are lazy-loaded when first accessed.
 */

const { getService, registerService } = require('./serviceFactory');

/**
 * Storage Service
 * Handles file storage operations (S3)
 */
exports.storage = () => getService('storage');

/**
 * AI Service
 * Handles resume customization operations
 */
exports.ai = () => getService('ai');

/**
 * Queue Service
 * Handles background job processing
 */
exports.queue = () => getService('queue');

/**
 * Reset all services (mainly for testing and cleanup)
 */
exports.resetAllServices = () => {
  const { resetServices } = require('./serviceFactory');
  resetServices();
};

/**
 * Register a custom service implementation
 * Used for testing or alternative implementations
 */
exports.registerService = registerService;
