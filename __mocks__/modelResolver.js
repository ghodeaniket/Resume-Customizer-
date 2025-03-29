/**
 * Model Resolver for Mock Mode
 * 
 * This file patches the model imports to use mock implementations
 * without modifying the production code. This is done through
 * Node.js module cache manipulation.
 */

const path = require('path');
const logger = require('../src/utils/logger');

// Require cache manipulation function
function registerMockModel(modelName) {
  const modulePath = path.resolve(__dirname, '../src/models', modelName.toLowerCase() + '.js');
  const mockPath = path.resolve(__dirname, 'models', modelName + '.js');
  
  try {
    // Clean the cache
    if (require.cache[modulePath]) {
      delete require.cache[modulePath];
    }
    
    // Load the mock model
    const mockModel = require(mockPath);
    
    // Override the module in the require cache
    require.cache[modulePath] = {
      id: modulePath,
      filename: modulePath,
      loaded: true,
      exports: mockModel
    };
    
    logger.info(`Registered mock model for: ${modelName}`);
  } catch (error) {
    logger.error(`Failed to register mock model for ${modelName}: ${error.message}`);
    throw error;
  }
}

// Register the mock models
registerMockModel('Resume');
registerMockModel('User');

logger.info('Mock model resolver initialized');
