/**
 * AI Service Factory Tests
 */

const { AIServiceFactory, AIServiceImplementation } = require('../../../src/services/factories/aiServiceFactory');
const N8NAIService = require('../../../src/services/implementations/n8nAIServiceImpl');
const DirectLLMAIService = require('../../../src/services/implementations/directLLMAIServiceImpl');

describe('AIServiceFactory', () => {
  const mockN8NConfig = {
    webhookUrl: 'http://localhost:5678',
    webhookPath: '/webhook/customize-resume-ai',
    timeoutMs: 30000,
    maxRetries: 3
  };

  const mockLLMConfig = {
    apiKey: 'test-api-key',
    baseUrl: 'https://api.example.com',
    modelName: 'test-model',
    timeoutMs: 30000
  };

  test('should create N8NAIService when N8N implementation is specified', () => {
    const service = AIServiceFactory.createAIService(
      AIServiceImplementation.N8N, 
      mockN8NConfig
    );
    
    expect(service).toBeInstanceOf(N8NAIService);
  });

  test('should create DirectLLMAIService when DIRECT_LLM implementation is specified', () => {
    const service = AIServiceFactory.createAIService(
      AIServiceImplementation.DIRECT_LLM, 
      mockLLMConfig
    );
    
    expect(service).toBeInstanceOf(DirectLLMAIService);
  });

  test('should fallback to N8NAIService when unknown implementation is specified', () => {
    const service = AIServiceFactory.createAIService(
      'unknown_implementation',
      mockN8NConfig
    );
    
    expect(service).toBeInstanceOf(N8NAIService);
  });
});
