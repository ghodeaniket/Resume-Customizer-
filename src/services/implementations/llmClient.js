/**
 * LLM Client
 * 
 * Client for interacting with Language Model APIs
 */

const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const logger = require('../../utils/logger');
const { ServiceError } = require('../../utils/errors');

class LLMClient {
  /**
   * Create a new LLM client
   * @param {Object} config - Configuration
   * @param {string} config.apiKey - API key
   * @param {string} config.baseUrl - Base URL for API
   * @param {string} config.modelName - Model name
   * @param {number} config.timeout - Request timeout in milliseconds
   */
  constructor(config) {
    this.config = config;
    this.client = this.initializeClient();
    logger.info(`LLMClient initialized for model: ${this.config.modelName}`);
  }
  
  /**
   * Initialize the HTTP client with retry capability
   * @private
   * @returns {Object} Axios client
   */
  initializeClient() {
    const client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout || 60000,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Configure retry logic
    axiosRetry(client, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        const shouldRetry = axiosRetry.isNetworkError(error) || 
               axiosRetry.isRetryableError(error) ||
               (error.response && error.response.status >= 500);
               
        if (shouldRetry) {
          logger.warn(`Retrying LLM API call due to error: ${error.message}`);
        }
        
        return shouldRetry;
      },
      onRetry: (retryCount, error) => {
        logger.warn(`Retry attempt #${retryCount} for LLM API call: ${error.message}`);
      }
    });
    
    return client;
  }
  
  /**
   * Send completion request to LLM API
   * @param {Object} options - Request options
   * @param {Array} options.messages - Messages for completion
   * @param {number} options.temperature - Temperature (0.0 to 1.0)
   * @param {number} options.maxTokens - Maximum tokens to generate
   * @returns {Promise<string>} Completion text
   */
  async complete({ messages, temperature = 0.7, maxTokens = 2000 }) {
    try {
      // Get endpoint based on provider
      const endpoint = this.getEndpointForProvider();
      
      logger.info(`Sending completion request to ${this.config.baseUrl}${endpoint}`);
      
      const response = await this.client.post(endpoint, {
        model: this.config.modelName,
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens
      });
      
      return this.extractContentFromResponse(response.data);
    } catch (error) {
      logger.error(`LLM API error: ${error.message}`);
      
      // Enhance error with more details
      const enhancedError = new ServiceError(`LLM request failed: ${error.message}`, 'llm-api');
      enhancedError.originalError = error;
      enhancedError.provider = this.config.baseUrl;
      enhancedError.model = this.config.modelName;
      enhancedError.status = error.response?.status;
      enhancedError.statusText = error.response?.statusText;
      
      throw enhancedError;
    }
  }
  
  /**
   * Get API endpoint based on provider
   * @private
   * @returns {string} API endpoint
   */
  getEndpointForProvider() {
    // Customize based on which LLM provider you're using
    if (this.config.baseUrl.includes('openrouter')) {
      return '/api/v1/chat/completions';
    } else if (this.config.baseUrl.includes('openai')) {
      return '/v1/chat/completions';
    } else if (this.config.baseUrl.includes('anthropic')) {
      return '/v1/messages';
    }
    
    return '/api/chat/completions'; // Default
  }
  
  /**
   * Extract content from LLM API response
   * @private
   * @param {Object} responseData - Response data
   * @returns {string} Extracted content
   */
  extractContentFromResponse(responseData) {
    // Handle different API response formats
    if (responseData.choices?.[0]?.message?.content) {
      // OpenAI/OpenRouter format
      return responseData.choices[0].message.content;
    } else if (responseData.content) {
      // Anthropic format
      return responseData.content;
    }
    
    logger.warn('Unexpected LLM response format:', responseData);
    throw new ServiceError('Unexpected response format from LLM API', 'llm-response');
  }
}

module.exports = LLMClient;