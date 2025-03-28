/**
 * Real N8N Client Implementation
 */
const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const logger = require('../../utils/logger');

class N8NClient {
  constructor() {
    // Get webhook URL and path from environment variables
    this.webhookUrl = process.env.N8N_WEBHOOK_URL;
    this.webhookPath = process.env.N8N_WEBHOOK_PATH || 'customize-resume-ai';
    this.timeoutMs = parseInt(process.env.CUSTOMIZATION_TIMEOUT_MS || '120000');
    this.maxRetries = parseInt(process.env.CUSTOMIZATION_MAX_RETRIES || '3');
    
    if (!this.webhookUrl) {
      throw new Error('N8N_WEBHOOK_URL is not defined in environment variables');
    }
    
    this.fullWebhookUrl = `${this.webhookUrl}/${this.webhookPath}`;
    
    // Create axios instance for n8n
    this.client = axios.create({
      baseURL: this.webhookUrl,
      timeout: this.timeoutMs
    });

    // Configure retry mechanism
    axiosRetry(this.client, {
      retries: this.maxRetries,
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
    
    logger.info('Initialized Real N8N Client Service');
  }

  async customizeResume(data) {
    try {
      const { resumeContent, jobDescription, jobTitle, companyName } = data;
      
      // Validate required fields
      if (!resumeContent || !jobDescription) {
        throw new Error('Resume content and job description are required');
      }
      
      logger.info(`Sending resume customization request to n8n webhook at ${this.fullWebhookUrl}`);
      
      // Make the API call with retry capability
      const response = await this.client.post(this.webhookPath, {
        resumeContent,
        jobDescription,
        jobTitle: jobTitle || '',
        companyName: companyName || ''
      });
      
      logger.info('Resume customization request successful');
      
      // Handle different response types more robustly
      let processedResponse = {};
      
      // Check response type and format
      if (response && response.data) {
        if (typeof response.data === 'string') {
          try {
            // If the response is a JSON string, parse it
            processedResponse = JSON.parse(response.data);
          } catch (parseError) {
            // If it can't be parsed as JSON, treat it as raw markdown
            logger.info('Response is not JSON, treating as raw content');
            processedResponse = { resume: response.data };
          }
        } else if (typeof response.data === 'object') {
          // If response is already an object
          processedResponse = response.data;
          
          // If the object doesn't have a resume field, but has some other text content
          // that could be markdown, create a resume field with that content
          if (!processedResponse.resume) {
            // Try to find any field that might contain the resume content
            const possibleContentFields = Object.keys(processedResponse).filter(key => 
              typeof processedResponse[key] === 'string' && 
              processedResponse[key].length > 100
            );
            
            if (possibleContentFields.length > 0) {
              // Use the first substantial text field as resume content
              processedResponse = { 
                resume: processedResponse[possibleContentFields[0]],
                originalResponse: processedResponse
              };
            } else {
              // If no suitable fields found, create an empty resume field
              // and keep the original response for reference
              processedResponse = { 
                resume: JSON.stringify(processedResponse),
                originalResponse: processedResponse
              };
            }
          }
        } else {
          // If it's neither string nor object (unlikely), log and create a default
          logger.warn(`Unexpected response type: ${typeof response.data}`);
          processedResponse = { resume: String(response.data) };
        }
      } else {
        throw new Error('Empty response from N8N webhook');
      }
      
      return processedResponse;
    } catch (error) {
      logger.error(`Error calling n8n webhook: ${error.message}`);
      
      // Enhance error with more details
      const enhancedError = new Error(`N8N webhook call failed: ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.webhookUrl = this.fullWebhookUrl;
      enhancedError.status = error.response?.status;
      enhancedError.statusText = error.response?.statusText;
      
      throw enhancedError;
    }
  }
}

// Create a singleton instance
const n8nClient = new N8NClient();

module.exports = n8nClient;
