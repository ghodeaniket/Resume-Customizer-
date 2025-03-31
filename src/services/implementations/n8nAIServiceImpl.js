/**
 * N8N AI Service Implementation
 * 
 * This service provides AI functionality through an external n8n webhook
 */

const IAIService = require('../interfaces/aiService');
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const logger = require('../../utils/logger');
const { ServiceError } = require('../../utils/errors');

/**
 * N8N-based AI Service that implements the IAIService interface
 */
class N8NAIService extends IAIService {
  /**
   * Create a new N8NAIService instance
   * @param {Object} config - Configuration object
   * @param {string} config.webhookUrl - Base URL for the webhook
   * @param {string} config.webhookPath - Path for the webhook
   * @param {number} config.timeoutMs - Request timeout in milliseconds
   * @param {number} config.maxRetries - Maximum number of retries
   */
  constructor(config) {
    super();
    this.config = config;
    this.client = null;
    
    // Initialize the HTTP client
    this.initialize();
    
    logger.info(`N8NAIService initialized with n8n webhook at ${this.getFullWebhookUrl()}`);
  }

  /**
   * Initialize the HTTP client with retry capability
   * @private
   */
  initialize() {
    // Create axios instance
    this.client = axios.create({
      baseURL: this.config.webhookUrl,
      timeout: this.config.timeoutMs
    });

    // Configure retry mechanism
    axiosRetry(this.client, {
      retries: this.config.maxRetries,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Retry on connection errors, 5xx responses, or timeouts
        const shouldRetry = 
          axiosRetry.isNetworkError(error) || 
          axiosRetry.isRetryableError(error) ||
          (error.response && error.response.status >= 500) ||
          error.code === 'ECONNABORTED';
        
        if (shouldRetry) {
          logger.warn(`Retrying n8n webhook call due to error: ${error.message}`);
        }
        
        return shouldRetry;
      },
      onRetry: (retryCount, error) => {
        logger.warn(`Retry attempt #${retryCount} for n8n webhook call: ${error.message}`);
      }
    });
  }

  /**
   * Get the full webhook URL
   * @private
   * @returns {string} Full webhook URL
   */
  getFullWebhookUrl() {
    return `${this.config.webhookUrl}${this.config.webhookPath}`;
  }

  /**
   * Customize a resume based on job description
   * @param {Object} data - Data for customization
   * @param {string} data.resumeContent - Content of the resume
   * @param {string} data.jobDescription - Job description
   * @param {string} data.jobTitle - Job title (optional)
   * @param {string} data.companyName - Company name (optional)
   * @returns {Promise<Object>} Response with resume content
   */
  async customizeResume(data) {
    try {
      const { resumeContent, jobDescription, jobTitle, companyName } = data;
      
      // Validate required fields
      if (!resumeContent || !jobDescription) {
        throw new ServiceError('Resume content and job description are required', 'validation');
      }
      
      logger.info(`Sending resume customization request to n8n webhook at ${this.getFullWebhookUrl()}`);
      
      // Make the API call with retry capability
      const response = await this.client.post(this.config.webhookPath, {
        resumeContent,
        jobDescription,
        jobTitle: jobTitle || '',
        companyName: companyName || ''
      });
      
      logger.info('Resume customization request successful');
      
      // Process the response
      return this.processCustomizationResponse(response);
    } catch (error) {
      logger.error(`Error calling n8n webhook: ${error.message}`);
      
      // Enhance error with more details
      const enhancedError = new ServiceError(`AI customization failed: ${error.message}`, 'ai');
      enhancedError.originalError = error;
      enhancedError.webhookUrl = this.getFullWebhookUrl();
      enhancedError.status = error.response?.status;
      enhancedError.statusText = error.response?.statusText;
      
      throw enhancedError;
    }
  }

  /**
   * Process response from n8n - simplified to handle common response formats
   * @private
   * @param {Object} response - Axios response
   * @returns {Object} Processed response with resume field
   */
  processCustomizationResponse(response) {
    if (!response || !response.data) {
      throw new ServiceError('Empty response from AI service', 'empty-response');
    }
    
    let responseData = response.data;
    
    // Case 1: String response - could be JSON or direct markdown
    if (typeof responseData === 'string') {
      try {
        // Try to parse as JSON first
        const parsedData = JSON.parse(responseData);
        
        // If parsed successfully and has resume field, use that
        if (parsedData && parsedData.resume) {
          return parsedData;
        }
        
        // Otherwise, wrap the parsed data
        return { resume: responseData, originalResponse: parsedData };
      } catch (e) {
        // Not valid JSON, treat as direct markdown content
        return { resume: responseData };
      }
    }
    
    // Case 2: Object response
    if (typeof responseData === 'object') {
      // If already has resume field, return as is
      if (responseData.resume) {
        return responseData;
      }
      
      // Otherwise, use the entire object as the originalResponse
      return { 
        resume: JSON.stringify(responseData, null, 2),
        originalResponse: responseData
      };
    }
    
    // Case 3: Unexpected type - convert to string
    return { resume: String(responseData) };
  }

  /**
   * Validate model compatibility - can be extended for more advanced validation
   * @returns {Promise<boolean>} Validation result
   */
  async validateModelCompatibility() {
    // This could send a test request to verify API compatibility
    return true;
  }

  /**
   * Clean up resources
   */
  destroy() {
    logger.info('N8NAIService destroyed');
    // No explicit cleanup needed for HTTP client
  }
}

module.exports = N8NAIService;