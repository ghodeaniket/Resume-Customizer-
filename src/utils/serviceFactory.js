/**
 * Service Factory - Implements dependency injection pattern
 * 
 * This module is responsible for creating and providing access to all services
 * based on the current environment configuration.
 */
const dotenv = require('dotenv');
const logger = require('./logger');

// Load environment variables
dotenv.config();

// Determine if mock services should be used
const useMockServices = process.env.NODE_ENV === 'development' && process.env.MOCK_SERVICES === 'true';

// Visual indicator for mock mode
if (useMockServices) {
  logger.warn('=======================================================');
  logger.warn('| RUNNING IN MOCK MODE - NO EXTERNAL SERVICES USED    |');
  logger.warn('| All external service calls will use mock data       |');
  logger.warn('=======================================================');
}

// Create and export services
const services = {
  // S3 Storage Service
  s3Service: useMockServices 
    ? require('../mocks/s3Mock') 
    : require('../services/real/s3Service'),

  // N8N Client Service
  n8nClient: useMockServices 
    ? require('../mocks/n8nMock') 
    : require('../services/real/n8nClient'),

  // Queue Service
  queueService: useMockServices 
    ? require('../mocks/queueMock') 
    : require('../services/real/queueService'),

  // Add other services as needed...
};

module.exports = services;
