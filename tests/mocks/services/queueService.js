/**
 * Mock Queue Service for testing
 */

const logger = require('../../../src/utils/logger');

// Mock job
const createMockJob = (id, data) => ({
  id,
  data,
  progress: jest.fn(),
  moveToCompleted: jest.fn(),
  moveToFailed: jest.fn(),
  remove: jest.fn()
});

// In-memory queue for testing
const jobsQueue = new Map();
let processors = {};
let jobIdCounter = 1;

/**
 * Initialize the mock service
 */
function init() {
  logger.info('Test Mock Queue Service initialized');
}

/**
 * Add a job to the mock queue
 * @param {string} jobType - Type of job 
 * @param {Object} data - Job data
 * @param {Object} options - Job options
 */
async function addJob(jobType, data, options = {}) {
  const jobId = `mock-job-${jobIdCounter++}`;
  const job = createMockJob(jobId, data);
  
  jobsQueue.set(jobId, {
    job,
    type: jobType,
    options
  });
  
  logger.info(`[MOCK] Added job ${jobId} of type ${jobType} to queue`);
  
  // Process job immediately in test environment
  if (processors[jobType]) {
    try {
      const result = await processors[jobType](job);
      logger.info(`[MOCK] Job ${jobId} completed with result: ${JSON.stringify(result)}`);
    } catch (error) {
      logger.error(`[MOCK] Job ${jobId} failed with error: ${error.message}`);
    }
  }
  
  return job;
}

/**
 * Register a processor for a job type
 * @param {string} jobType - Type of job to process
 * @param {Function} processor - Processing function
 */
function registerProcessor(jobType, processor) {
  processors[jobType] = processor;
  logger.info(`[MOCK] Registered processor for job type: ${jobType}`);
}

/**
 * Get a job by ID
 * @param {string} jobId - ID of the job
 */
async function getJob(jobId) {
  const entry = jobsQueue.get(jobId);
  return entry ? entry.job : null;
}

/**
 * Clean up resources when service is destroyed
 */
async function destroy() {
  jobsQueue.clear();
  processors = {};
  logger.info('[MOCK] Queue Service destroyed');
}

module.exports = {
  init,
  addJob,
  registerProcessor,
  getJob,
  destroy
};