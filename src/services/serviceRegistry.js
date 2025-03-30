/**
 * Service Registry
 * 
 * This module manages the registration and retrieval of service implementations.
 * It provides a centralized way to access services with dependency injection.
 */

const logger = require('../utils/logger');
const config = require('../config/configManager');
const resumeRepository = require('../repositories/resumeRepository');

// Service implementations
const ResumeService = require('./implementations/resumeServiceImpl');
const { getService: getServiceFromFactory } = require('./serviceFactory');

// Cached service instances
const serviceInstances = new Map();

/**
 * Service types
 */
const ServiceType = {
  RESUME: 'resume',
  STORAGE: 'storage',
  AI: 'ai',
  QUEUE: 'queue',
  AUTH: 'auth'
};

/**
 * Get a service instance
 * @param {string} serviceType - Service type from ServiceType enum
 * @returns {Object} Service instance
 */
function getService(serviceType) {
  // Return cached instance if available
  if (serviceInstances.has(serviceType)) {
    return serviceInstances.get(serviceType);
  }

  let serviceInstance;

  switch (serviceType) {
    case ServiceType.RESUME:
      // ResumeService requires other services, so get them first
      const storageService = getService(ServiceType.STORAGE);
      const aiService = getService(ServiceType.AI);
      const queueService = getService(ServiceType.QUEUE);
      
      // Create ResumeService with dependencies
      serviceInstance = new ResumeService({
        resumeRepository,
        storageService,
        aiService,
        queueService
      });
      break;
      
    case ServiceType.STORAGE:
    case ServiceType.AI:
    case ServiceType.QUEUE:
    case ServiceType.AUTH:
      // These services are provided by the legacy factory
      serviceInstance = getServiceFromFactory(
        serviceType === ServiceType.STORAGE ? 'storage' :
        serviceType === ServiceType.AI ? 'ai' :
        serviceType === ServiceType.QUEUE ? 'queue' :
        'auth'
      );
      break;
      
    default:
      throw new Error(`Unknown service type: ${serviceType}`);
  }
  
  // Cache the instance
  serviceInstances.set(serviceType, serviceInstance);
  
  return serviceInstance;
}

/**
 * Register a custom service implementation
 * @param {string} serviceType - Service type from ServiceType enum
 * @param {Object} implementation - Service implementation
 */
function registerService(serviceType, implementation) {
  logger.info(`Registering custom service implementation for ${serviceType}`);
  serviceInstances.set(serviceType, implementation);
}

/**
 * Reset all service instances
 * Used mainly for testing
 */
function resetServices() {
  logger.info('Resetting all service instances');
  
  // Call destroy method on services that have it
  for (const [type, service] of serviceInstances.entries()) {
    if (typeof service.destroy === 'function') {
      try {
        service.destroy();
      } catch (error) {
        logger.error(`Error destroying service ${type}: ${error.message}`);
      }
    }
  }
  
  // Clear the cache
  serviceInstances.clear();
}

module.exports = {
  ServiceType,
  getService,
  registerService,
  resetServices
};
