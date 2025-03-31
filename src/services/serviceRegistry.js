/**
 * Service Registry
 * 
 * This module manages the registration and retrieval of service implementations.
 * It provides a centralized way to access services with dependency injection.
 */

const logger = require('../utils/logger');
const config = require('../config');
const { AIServiceFactory, AIServiceImplementation } = require('./factories/aiServiceFactory');

// Repositories
const resumeRepository = require('../repositories/resumeRepository');
const userRepository = require('../repositories/userRepository');

// Service implementations
const ResumeService = require('./implementations/resumeServiceImpl');
const AuthService = require('./implementations/authServiceImpl');
const StorageService = require('./implementations/storageServiceImpl');
const QueueService = require('./implementations/queueServiceImpl');

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
  case ServiceType.RESUME: {
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
  }
    
  case ServiceType.STORAGE: {
    // Create StorageService with configuration
    serviceInstance = new StorageService({
      accessKeyId: config.storage.s3.accessKeyId,
      secretAccessKey: config.storage.s3.secretAccessKey,
      region: config.storage.s3.region,
      bucketName: config.storage.s3.bucket,
      endpoint: process.env.AWS_ENDPOINT || null,
      forcePathStyle: process.env.AWS_FORCE_PATH_STYLE === 'true'
    });
    break;
  }
    
  case ServiceType.AI: {
    // Get AI service implementation type from config
    const implementationType = config.features.aiServiceImplementation;
    
    // Create AI service based on implementation type
    if (implementationType === AIServiceImplementation.N8N) {
      // N8N configuration
      const n8nConfig = {
        webhookUrl: config.n8n.webhookUrl,
        webhookPath: config.n8n.webhookPath,
        timeoutMs: config.n8n.timeoutMs,
        maxRetries: config.n8n.maxRetries
      };
      
      serviceInstance = AIServiceFactory.createAIService(
        AIServiceImplementation.N8N, 
        n8nConfig
      );
    } else if (implementationType === AIServiceImplementation.DIRECT_LLM) {
      // Direct LLM configuration
      const llmConfig = {
        apiKey: config.llm.apiKey,
        baseUrl: config.llm.baseUrl,
        modelName: config.llm.modelName,
        timeoutMs: config.llm.timeoutMs
      };
      
      serviceInstance = AIServiceFactory.createAIService(
        AIServiceImplementation.DIRECT_LLM, 
        llmConfig
      );
    } else {
      // Default to N8N if unknown implementation type
      logger.warn(`Unknown AI service implementation type: ${implementationType}, falling back to N8N`);
      
      serviceInstance = AIServiceFactory.createAIService(
        AIServiceImplementation.N8N, 
        {
          webhookUrl: config.n8n.webhookUrl,
          webhookPath: config.n8n.webhookPath,
          timeoutMs: config.n8n.timeoutMs,
          maxRetries: config.n8n.maxRetries
        }
      );
    }
    break;
  }
    
  case ServiceType.QUEUE: {
    // Create QueueService with configuration
    serviceInstance = new QueueService({
      queueName: 'resume-customization',
      redis: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password
      },
      defaultJobOptions: {
        attempts: config.n8n.maxRetries, // Reuse this config value
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    });
    break;
  }
    
  case ServiceType.AUTH: {
    // Create AuthService with dependencies
    serviceInstance = new AuthService({
      userModel: userRepository,
      emailService: null // We can inject an email service later if needed
    });
    break;
  }
      
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