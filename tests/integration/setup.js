/**
 * Integration Test Setup
 * 
 * This module sets up the environment for integration tests,
 * including database connection, test data generation,
 * and cleanup functions.
 */

const { sequelize } = require('../../src/models');
const { registerService, ServiceType } = require('../../src/services/serviceRegistry');

// Mock services for testing
const mockStorageService = {
  uploadFile: jest.fn().mockResolvedValue('https://test-bucket.s3.amazonaws.com/test-file'),
  getFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
  deleteFile: jest.fn().mockResolvedValue(true)
};

const mockAIService = {
  customizeResume: jest.fn().mockResolvedValue({
    resume: '# Customized Resume\n\nThis is a customized resume content for testing.'
  })
};

const mockQueueService = {
  addJob: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
  processJob: jest.fn()
};

/**
 * Setup function to run before all tests
 */
async function setupBeforeAll() {
  // Connect to test database
  await sequelize.authenticate();
  
  // Register mock services
  registerService(ServiceType.STORAGE, mockStorageService);
  registerService(ServiceType.AI, mockAIService);
  registerService(ServiceType.QUEUE, mockQueueService);
}

/**
 * Setup function to run before each test
 */
async function setupBeforeEach() {
  // Sync database (force=true to drop tables and recreate)
  await sequelize.sync({ force: true });
  
  // Reset mock function calls
  mockStorageService.uploadFile.mockClear();
  mockStorageService.getFile.mockClear();
  mockStorageService.deleteFile.mockClear();
  mockAIService.customizeResume.mockClear();
  mockQueueService.addJob.mockClear();
  mockQueueService.processJob.mockClear();
}

/**
 * Teardown function to run after all tests
 */
async function teardownAfterAll() {
  // Close database connection
  await sequelize.close();
}

module.exports = {
  setupBeforeAll,
  setupBeforeEach,
  teardownAfterAll,
  mockStorageService,
  mockAIService,
  mockQueueService
};
