/**
 * Mock Resume Worker for testing
 */

const logger = require('../../../src/utils/logger');
const queueService = require('../services/queueService');

// Job type constants
const JOB_TYPE_RESUME_CUSTOMIZATION = 'resume-customization';

/**
 * Queue a resume customization job
 * @param {string} resumeId - Resume ID to customize
 */
async function queueResumeCustomization(resumeId) {
  const jobData = {
    resumeId,
    timestamp: new Date().toISOString()
  };
  
  const job = await queueService.addJob(JOB_TYPE_RESUME_CUSTOMIZATION, jobData, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 }
  });
  
  return job.id;
}

/**
 * Initialize resume worker
 */
function init() {
  // Process resume customization jobs
  queueService.registerProcessor(JOB_TYPE_RESUME_CUSTOMIZATION, processResumeCustomizationJob);
  
  logger.info('[MOCK] Resume customization worker initialized successfully');
}

/**
 * Process resume customization job
 * @param {Object} job - Bull job
 */
async function processResumeCustomizationJob(job) {
  logger.info(`[MOCK] Processing resume customization job ${job.id}`);
  
  const { resumeId } = job.data;
  
  // Mock customization process
  await new Promise(resolve => setTimeout(resolve, 10));
  
  return {
    customized: true,
    resumeId,
    message: 'Resume customization completed successfully'
  };
}

// Initialize worker
init();

module.exports = {
  queueResumeCustomization
};