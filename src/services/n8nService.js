const axios = require('axios');
const logger = require('../utils/logger');

// n8n API configuration
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/';
const N8N_API_KEY = process.env.N8N_API_KEY;

// Headers for n8n API calls
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-N8N-API-KEY': N8N_API_KEY
});

/**
 * Process webhook data from n8n
 */
exports.processWebhook = async (webhookData) => {
  try {
    // Validate webhook data
    if (!webhookData) {
      throw new Error('No webhook data provided');
    }

    // Process webhook data based on type/action
    const { type, action, data } = webhookData;

    // Example: Process a resume analysis webhook
    if (type === 'resume' && action === 'analyzed') {
      // Update resume with analysis results
      logger.info('Processing resume analysis webhook');
      
      // Implement business logic based on webhook data
      return {
        processed: true,
        type,
        action
      };
    }

    // Example: Process a customization completed webhook
    if (type === 'resume' && action === 'customized') {
      logger.info('Processing resume customization webhook');
      
      // Implement business logic based on webhook data
      return {
        processed: true,
        type,
        action
      };
    }

    // Default case
    return {
      processed: false,
      message: 'Webhook type or action not recognized'
    };
  } catch (error) {
    logger.error('Process webhook service error:', error);
    throw error;
  }
};

/**
 * Trigger an n8n workflow
 */
exports.triggerWorkflow = async (workflowId, data, userId) => {
  try {
    // Add user ID to data
    const payload = {
      ...data,
      userId,
      timestamp: new Date().toISOString()
    };

    // Call n8n webhook
    const response = await axios.post(
      `${N8N_WEBHOOK_URL}${workflowId}`,
      payload,
      { headers: getHeaders() }
    );

    // Extract execution ID from response
    const executionId = response.data?.executionId || 'unknown';

    return {
      executionId,
      status: 'started',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Trigger workflow service error:', error);
    throw error;
  }
};

/**
 * Get workflow execution status
 */
exports.getWorkflowStatus = async (executionId, userId) => {
  try {
    // Call n8n API to get execution status
    const response = await axios.get(
      `${process.env.N8N_API_URL}/executions/${executionId}`,
      { headers: getHeaders() }
    );

    // Extract status from response
    const execution = response.data;

    return {
      status: execution.status,
      startedAt: execution.startedAt,
      finishedAt: execution.finishedAt,
      data: execution.data
    };
  } catch (error) {
    logger.error('Get workflow status service error:', error);
    
    // If execution not found, return generic status
    if (error.response && error.response.status === 404) {
      return {
        status: 'unknown',
        error: 'Execution not found'
      };
    }
    
    throw error;
  }
};

/**
 * Get all available workflows
 */
exports.getAvailableWorkflows = async (userId) => {
  try {
    // In a real implementation, this would call the n8n API
    // or a database to get workflows available to this user
    
    // Mock implementation
    return [
      {
        id: 'resume-analyzer',
        name: 'Resume Analyzer',
        description: 'Analyzes resume content and extracts key information'
      },
      {
        id: 'resume-customizer',
        name: 'Resume Customizer',
        description: 'Customizes resume based on job description'
      },
      {
        id: 'job-matcher',
        name: 'Job Matcher',
        description: 'Matches resume with job postings'
      }
    ];
  } catch (error) {
    logger.error('Get available workflows service error:', error);
    throw error;
  }
};