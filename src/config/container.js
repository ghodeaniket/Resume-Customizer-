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

// Import repositories
const resumeRepository = require('../repositories/resumeRepository');
const userRepository = require('../repositories/userRepository');

// Import config
const config = require('./env');

/**
 * Configure and create the container
 */
function setupContainer() {
  const container = createContainer();
  
  // Register configuration
  container.register({
    config: asValue(config),
    env: asValue(process.env)
  });
  
  // Register logger
  container.register({
    logger: asValue(logger)
  });
  
  // Register service implementations
  container.register({
    aiService: asValue(aiServiceImpl),
    storageService: asValue(storageServiceImpl),
    queueService: asValue(queueServiceImpl)
  });
  
  // Initialize services
  if (typeof aiServiceImpl.init === 'function') aiServiceImpl.init();
  if (typeof storageServiceImpl.init === 'function') storageServiceImpl.init();
  if (typeof queueServiceImpl.init === 'function') queueServiceImpl.init();
  
  // Register repositories
  container.register({
    resumeRepository: asFunction(() => resumeRepository).singleton(),
    userRepository: asFunction(() => userRepository).singleton(),
  });
  
  return container;
}

// Create and export the container
const container = setupContainer();

module.exports = container;
