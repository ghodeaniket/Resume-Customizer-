/**
 * Development Server with Mock Services
 * 
 * This file serves as an alternative entry point for development with mock services.
 * It configures the environment to use mock implementations instead of real ones.
 */

// Set environment variables for development
process.env.NODE_ENV = 'development';
process.env.MOCK_SERVICES = 'true';

const logger = require('./src/utils/logger');
const services = require('./src/services');

// Register mock implementations
logger.info('Configuring application with mock services');

try {
  // Import mock services
  const aiServiceMock = require('./__mocks__/services/aiService');
  const storageServiceMock = require('./__mocks__/services/storageService');
  const queueServiceMock = require('./__mocks__/services/queueService');

  // Register mock services
  services.registerService('ai', aiServiceMock);
  services.registerService('storage', storageServiceMock);
  services.registerService('queue', queueServiceMock);

  // Add visual markers for mock mode
  logger.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  logger.warn('!!                MOCK MODE ACTIVE                  !!');
  logger.warn('!! Application is running with mock service         !!');
  logger.warn('!! implementations. Data will not persist beyond    !!');
  logger.warn('!! server restart. This mode is for development.    !!');
  logger.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

  // Add model mocks
  require('./__mocks__/modelResolver');
  
  // Start the application
  require('./src/app');
} catch (error) {
  logger.error(`Failed to initialize mock services: ${error.message}`);
  process.exit(1);
}
