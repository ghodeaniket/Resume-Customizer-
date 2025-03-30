/**
 * AI Service Implementation
 * Communicates with n8n for resume customization
 */

const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const logger = require('../../utils/logger');
const { n8n, customization } = require('../../config/env');

let n8nClient;

/**
 * Initialize the service
 */
function init() {
  // Get configuration
  const { webhookUrl, fullWebhookUrl } = n8n;
  const timeoutMs = customization.timeoutMs;
  const maxRetries = customization.maxRetries;
  
  if (!webhookUrl) {
    throw new Error('N8N_WEBHOOK_URL is not defined in environment variables');
  }
  
  // Create axios instance for n8n
  n8nClient = axios.create({
    baseURL: webhookUrl,
    timeout: timeoutMs
  });

  // Configure retry mechanism
  axiosRetry(n8nClient, {
    retries: maxRetries,
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
  
  logger.info(`AI Service initialized with n8n webhook at ${fullWebhookUrl}`);
}

/**
 * Customize a resume based on job description
 * @param {Object} data - Data for customization
 * @param {string} data.resumeContent - Content of the resume
 * @param {string} data.jobDescription - Job description
 * @param {string} data.jobTitle - Job title (optional)
 * @param {string} data.companyName - Company name (optional)
 */
async function customizeResume(data) {
  try {
    const { resumeContent, jobDescription, jobTitle, companyName } = data;
    
    // Validate required fields
    if (!resumeContent || !jobDescription) {
      throw new Error('Resume content and job description are required');
    }
    
    logger.info(`Sending resume customization request to n8n webhook at ${n8n.fullWebhookUrl}`);
    
    // Make the API call with retry capability
    const response = await n8nClient.post(n8n.webhookPath, {
      resumeContent,
      jobDescription,
      jobTitle: jobTitle || '',
      companyName: companyName || ''
    });
    
    logger.info('Resume customization request successful');
    
    // Process the response
    return processCustomizationResponse(response);
  } catch (error) {
    logger.error(`Error calling n8n webhook: ${error.message}`);
    
    // Enhance error with more details
    const enhancedError = new Error(`AI customization failed: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.webhookUrl = n8n.fullWebhookUrl;
    enhancedError.status = error.response?.status;
    enhancedError.statusText = error.response?.statusText;
    
    throw enhancedError;
  }
}

/**
 * Process response from n8n
 * @param {Object} response - Axios response
 */
function processCustomizationResponse(response) {
  // Handle different response types
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
}

/**
 * Clean up resources when service is destroyed
 */
function destroy() {
  logger.info('AI Service destroyed');
  // No specific cleanup needed
}

module.exports = {
  init,
  customizeResume,
  destroy
};