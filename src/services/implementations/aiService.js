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
 * @returns {Promise<Object>} Response with resume content
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
 * Process response from n8n - simplified to handle common response formats
 * @param {Object} response - Axios response
 * @returns {Object} Processed response with resume field
 */
function processCustomizationResponse(response) {
  if (!response || !response.data) {
    throw new Error('Empty response from N8N webhook');
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