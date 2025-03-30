/**
 * Resume Customization Worker
 * 
 * This module manages the background processing of resume customization jobs.
 * It uses the queue service to handle job processing and coordinates between
 * different services (storage, AI) to perform the customization workflow.
 */

const logger = require('../utils/logger');
const { ServiceType, getService } = require('../services/serviceRegistry');

// Get required services
const queueService = getService(ServiceType.QUEUE);
const resumeService = getService(ServiceType.RESUME);

// Initialize worker
try {
  /**
   * Process resume customization job
   * Delegates processing to the resumeService
   */
  queueService.registerProcessor('resume-customization', async (job) => {
    return await resumeService.processCustomizationJob(job);
  });

  logger.info('Resume customization worker initialized successfully');
} catch (error) {
  logger.error(`Failed to initialize resume customization worker: ${error.message}`);
}

/**
 * Add resume customization job to queue
 * @param {string} resumeId - Resume ID
 * @returns {Promise<string>} Job ID
 */
const queueResumeCustomization = async (resumeId) => {
  return await resumeService.queueResumeCustomization(resumeId);
};

module.exports = {
  queueResumeCustomization
};
