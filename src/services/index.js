/**
 * Services Index
 * 
 * This module provides a clean interface to access all services used in the application.
 * Services are lazy-loaded when first accessed and use the appropriate implementation
 * based on configuration.
 */

const { getService } = require('./serviceFactory');

/**
 * Storage Service
 * Handles file storage operations (S3, local, or mock)
 */
exports.storage = () => getService('storage');

/**
 * AI Service
 * Handles resume customization operations (n8n or mock)
 */
exports.ai = () => getService('ai');

/**
 * Queue Service
 * Handles background job processing (Bull or mock)
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
 * Get service factory
 */
exports.serviceFactory = require('./serviceFactory');
