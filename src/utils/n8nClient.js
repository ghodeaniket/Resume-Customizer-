const axios = require('axios');
const axiosRetry = require('axios-retry');
const { n8n, customization } = require('../config/env');
const logger = require('./logger');

// Create axios instance for n8n
const n8nClient = axios.create({
  baseURL: n8n.webhookUrl,
  timeout: customization.timeoutMs
});

// Configure retry mechanism
axiosRetry(n8nClient, {
  retries: customization.maxRetries,
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

/**
 * Send request to n8n webhook for resume customization
 */
const customizeResume = async (data) => {
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
    
    // Return the response data
    return response.data;
  } catch (error) {
    logger.error(`Error calling n8n webhook: ${error.message}`);
    
    // Enhance error with more details
    const enhancedError = new Error(`N8N webhook call failed: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.webhookUrl = n8n.fullWebhookUrl;
    enhancedError.status = error.response?.status;
    enhancedError.statusText = error.response?.statusText;
    
    throw enhancedError;
  }
};

module.exports = {
  customizeResume
};