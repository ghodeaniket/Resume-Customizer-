/**
 * AI Service Factory
 * 
 * Factory for creating AI service instances based on configuration
 */

const N8NAIService = require('../implementations/n8nAIServiceImpl');
const DirectLLMAIService = require('../implementations/directLLMAIServiceImpl');
const logger = require('../../utils/logger');

/**
 * AI Service Implementation Types
 */
const AIServiceImplementation = {
  N8N: 'n8n',
  DIRECT_LLM: 'direct_llm'
};

/**
 * Factory for creating AI service instances
 */
class AIServiceFactory {
  /**
   * Create a new AI service instance based on implementation type
   * @param {string} implementationType - Implementation type from AIServiceImplementation
   * @param {Object} config - Configuration for the implementation
   * @returns {IAIService} AI service instance
   */
  static createAIService(implementationType, config) {
    logger.info(`Creating AI service with implementation: ${implementationType}`);
    
    switch (implementationType) {
    case AIServiceImplementation.N8N:
      return new N8NAIService(config);
    
    case AIServiceImplementation.DIRECT_LLM:
      return new DirectLLMAIService(config);
    
    default:
      logger.warn(`Unknown implementation type: ${implementationType}, falling back to N8N`);
      return new N8NAIService(config);
    }
  }
}

module.exports = {
  AIServiceFactory,
  AIServiceImplementation
};