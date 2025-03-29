/**
 * Dependency Injection Container Configuration
 * 
 * This file sets up the DI container using Awilix.
 * It registers all services, repositories, controllers, and utilities.
 */

const { createContainer, asClass, asFunction, asValue, Lifetime } = require('awilix');
const logger = require('../utils/logger');

// Import services
const aiServiceImpl = require('../services/implementations/aiService');
const storageServiceImpl = require('../services/implementations/storageService');
const queueServiceImpl = require('../services/implementations/queueService');

// Import services for mock mode (only imported when needed)
let aiServiceMock, storageServiceMock, queueServiceMock;

// Import repositories
const resumeRepository = require('../repositories/resumeRepository');
const userRepository = require('../repositories/userRepository');

// Import config
const config = require('./env');

// Environment check function
const useMockServices = () => {
  return process.env.NODE_ENV === 'development' && process.env.MOCK_SERVICES === 'true';
};

/**
 * Configure and create the container
 */
function setupContainer() {
  const container = createContainer();
  
  // Register configuration
  container.register({
    config: asValue(config),
    env: asValue(process.env),
    useMockServices: asValue(useMockServices())
  });
  
  // Register logger
  container.register({
    logger: asValue(logger)
  });
  
  // Conditionally register services based on environment
  if (useMockServices()) {
    logger.info('Setting up container with MOCK services');
    
    // Lazy load mock implementations to avoid importing them in production
    aiServiceMock = require('../../__mocks__/services/aiService');
    storageServiceMock = require('../../__mocks__/services/storageService');
    queueServiceMock = require('../../__mocks__/services/queueService');
    
    // Register mock services
    container.register({
      aiService: asValue(aiServiceMock),
      storageService: asValue(storageServiceMock),
      queueService: asValue(queueServiceMock)
    });
    
    // Initialize mock services
    if (typeof aiServiceMock.init === 'function') aiServiceMock.init();
    if (typeof storageServiceMock.init === 'function') storageServiceMock.init();
    if (typeof queueServiceMock.init === 'function') queueServiceMock.init();
  } else {
    logger.info('Setting up container with REAL services');
    
    // Register real service implementations
    container.register({
      aiService: asValue(aiServiceImpl),
      storageService: asValue(storageServiceImpl),
      queueService: asValue(queueServiceImpl)
    });
    
    // Initialize real services
    if (typeof aiServiceImpl.init === 'function') aiServiceImpl.init();
    if (typeof storageServiceImpl.init === 'function') storageServiceImpl.init();
    if (typeof queueServiceImpl.init === 'function') queueServiceImpl.init();
  }
  
  // Register repositories
  container.register({
    resumeRepository: asFunction(() => resumeRepository).singleton(),
    userRepository: asFunction(() => userRepository).singleton(),
  });
  
  // Register models through repositories
  
  return container;
}

// Create and export the container
const container = setupContainer();

module.exports = container;
