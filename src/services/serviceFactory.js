/**
 * Service Factory
 * 
 * This module provides a factory pattern for services, allowing us to:
 * 1. Easily switch between real and mock implementations
 * 2. Configure all services in one place
 * 3. Ensure services are properly initialized only once
 */

const logger = require('../utils/logger');

// Track initialized services
const serviceInstances = new Map();

// Environment check function
const useMockServices = () => {
  return process.env.NODE_ENV === 'development' && process.env.MOCK_SERVICES === 'true';
};

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

  let serviceModule;
  const isMockMode = useMockServices();

  try {
    // Try to load the appropriate implementation
    if (isMockMode) {
      logger.info(`Initializing MOCK service: ${serviceName}`);
      serviceModule = require(`./mocks/${serviceName}Service`);
      // Add visual identifier for mock services
      serviceModule.isMockService = true;
    } else {
      serviceModule = require(`./implementations/${serviceName}Service`);
    }

    // Initialize the service if it has an init method
    if (typeof serviceModule.init === 'function') {
      serviceModule.init();
    }

    // Cache the instance
    serviceInstances.set(serviceName, serviceModule);
    
    return serviceModule;
  } catch (error) {
    // Handle errors when loading the service implementation
    logger.error(`Failed to load ${isMockMode ? 'mock' : 'real'} implementation for ${serviceName}:`, error);
    
    if (isMockMode) {
      // In mock mode, throw error - don't silently fall back
      throw new Error(`Failed to initialize mock service for ${serviceName}: ${error.message}`);
    }
    
    // In real mode, only fall back to mock in development if explicitly requested
    if (process.env.NODE_ENV === 'development' && process.env.FALLBACK_TO_MOCK === 'true') {
      logger.warn(`Falling back to mock implementation for ${serviceName} (FALLBACK_TO_MOCK=true)`);
      try {
        serviceModule = require(`./mocks/${serviceName}Service`);
        if (typeof serviceModule.init === 'function') {
          serviceModule.init();
        }
        
        // Mark it clearly as a fallback mock
        serviceModule.isMockService = true;
        serviceModule.isFallbackMock = true;
        
        // Cache the instance
        serviceInstances.set(serviceName, serviceModule);
        return serviceModule;
      } catch (fallbackError) {
        logger.error(`Failed to load fallback mock for ${serviceName}:`, fallbackError);
        throw new Error(`Service ${serviceName} initialization failed and fallback was not available`);
      }
    }
    
    // No fallback requested or not in development - just throw the error
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
        logger.error(`Error destroying service ${name}:`, error);
      }
    }
  }
  
  serviceInstances.clear();
}

module.exports = {
  getService,
  resetServices,
  useMockServices
};
