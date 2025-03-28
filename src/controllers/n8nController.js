const n8nService = require('../services/n8nService');
const logger = require('../utils/logger');

/**
 * Handle webhook requests from n8n
 */
exports.handleWebhook = async (req, res, next) => {
  try {
    // Extract webhook data
    const webhookData = req.body;
    
    // Process webhook data
    const result = await n8nService.processWebhook(webhookData);
    
    return res.status(200).json({
      status: 'success',
      message: 'Webhook processed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    next(error);
  }
};

/**
 * Trigger an n8n workflow
 */
exports.triggerWorkflow = async (req, res, next) => {
  try {
    const { workflowId } = req.params;
    const data = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!workflowId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide workflow ID'
      });
    }
    
    // Trigger workflow
    const result = await n8nService.triggerWorkflow(workflowId, data, userId);
    
    return res.status(200).json({
      status: 'success',
      message: 'Workflow triggered successfully',
      data: {
        executionId: result.executionId,
        status: result.status
      }
    });
  } catch (error) {
    logger.error('Trigger workflow error:', error);
    next(error);
  }
};

/**
 * Get workflow execution status
 */
exports.getWorkflowStatus = async (req, res, next) => {
  try {
    const { executionId } = req.params;
    const userId = req.user.id;
    
    // Validate input
    if (!executionId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide execution ID'
      });
    }
    
    // Get workflow status
    const status = await n8nService.getWorkflowStatus(executionId, userId);
    
    return res.status(200).json({
      status: 'success',
      data: {
        executionId,
        ...status
      }
    });
  } catch (error) {
    logger.error('Get workflow status error:', error);
    next(error);
  }
};

/**
 * Get all available workflows
 */
exports.getWorkflows = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get workflows
    const workflows = await n8nService.getAvailableWorkflows(userId);
    
    return res.status(200).json({
      status: 'success',
      results: workflows.length,
      data: {
        workflows
      }
    });
  } catch (error) {
    logger.error('Get workflows error:', error);
    next(error);
  }
};