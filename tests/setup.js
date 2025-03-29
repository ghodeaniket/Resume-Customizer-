/**
 * Jest Setup File
 * 
 * This file sets up mock services for testing.
 */

const services = require('../src/services');

// Mock services for testing
jest.mock('../src/services/implementations/aiService', () => 
  require('./mocks/services/aiService'));

jest.mock('../src/services/implementations/storageService', () => 
  require('./mocks/services/storageService'));

jest.mock('../src/services/implementations/queueService', () => 
  require('./mocks/services/queueService'));

// Register mocks with service factory before tests
beforeAll(() => {
  // Reset services before tests
  services.resetAllServices();
});

// Clean up after tests
afterAll(() => {
  // Reset services after tests
  services.resetAllServices();
});
