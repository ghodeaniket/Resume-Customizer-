/**
 * Service Factory
 * 
 * This module provides a clean factory pattern for services.
 * It manages service initialization and caching.
 */

const logger = require('../utils/logger');

// Track initialized services
const serviceInstances = new Map();

/**
 * Get a service instance - creates it if it doesn't exist
 * @param {string} serviceName - The name of the service
 * @returns {Object} - The service instance
 */
function getService(serviceName) {
  // Return cached instance if available
  if (serviceInstances.has(serviceName)) {
    return serviceInstances.get(serviceName);
  }

  try {
    // Load the service implementation
    const serviceModule = require(`./implementations/${serviceName}Service`);

    // Initialize the service if it has an init method
    if (typeof serviceModule.init === 'function') {
      serviceModule.init();
    }

    // Cache the instance
    serviceInstances.set(serviceName, serviceModule);
    
    return serviceModule;
  } catch (error) {
    // Handle errors when loading the service implementation
    logger.error(`Failed to load service implementation for ${serviceName}: ${error.message}`);
    throw new Error(`Failed to initialize service ${serviceName}: ${error.message}`);
  }
}

/**
 * Clear all initialized services
 */
function resetServices() {
  // Call destroy method on services if available
  for (const [name, service] of serviceInstances.entries()) {
    if (typeof service.destroy === 'function') {
      try {
        service.destroy();
      } catch (error) {
        logger.error(`Error destroying service ${name}: ${error.message}`);
      }
    }
  }
  
  serviceInstances.clear();
}

/**
 * Register a custom service implementation
 * @param {string} serviceName - The name of the service
 * @param {Object} implementation - The service implementation
 */
function registerService(serviceName, implementation) {
  // Initialize if needed
  if (typeof implementation.init === 'function') {
    implementation.init();
  }
  
  // Store the implementation
  serviceInstances.set(serviceName, implementation);
  
  return implementation;
}

module.exports = {
  getService,
  resetServices,
  registerService
};
