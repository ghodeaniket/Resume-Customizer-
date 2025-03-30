/**
 * Queue Service Implementation
 * Uses Bull/Redis for background job processing
 */

const Queue = require('bull');
const logger = require('../../utils/logger');
const { redis } = require('../../config/env');

let resumeQueue;

// Default job options - centralized to avoid duplication
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  removeOnComplete: true,
  removeOnFail: false
};

/**
 * Initialize the service
 */
function init() {
  const redisConfig = {
    host: redis.host,
    port: redis.port,
    password: redis.password || undefined
  };
  
  // Create queue
  resumeQueue = new Queue('resume-customization', {
    redis: redisConfig,
    defaultJobOptions: DEFAULT_JOB_OPTIONS
  });
  
  // Log queue events
  resumeQueue.on('completed', (job, result) => {
    logger.info(`Job ${job.id} completed with result: ${JSON.stringify(result)}`);
  });
  
  resumeQueue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed with error: ${err.message}`);
  });
  
  resumeQueue.on('error', (error) => {
    logger.error(`Resume queue error: ${error.message}`);
  });
  
  // Clean old jobs on startup
  resumeQueue.clean(24 * 60 * 60 * 1000, 'failed');
  
  logger.info('Queue Service (Bull) initialized successfully');
}

/**
 * Add a job to the queue
 * @param {string} jobType - Type of job 
 * @param {Object} data - Job data
 * @param {Object} options - Job options
 * @returns {Promise<Object>} Job object
 */
async function addJob(jobType, data, options = {}) {
  if (!resumeQueue) {
    throw new Error('Queue not initialized');
  }
  
  // For specific job types, we can add preprocess logic
  let processedData = data;
  
  // Merge with default options
  const jobOptions = { ...DEFAULT_JOB_OPTIONS, ...options };
  
  const job = await resumeQueue.add(jobType, processedData, jobOptions);
  logger.info(`Added job ${job.id} of type ${jobType} to queue`);
  
  return job;
}

/**
 * Register a processor for a job type
 * @param {string} jobType - Type of job to process
 * @param {Function} processor - Processing function
 */
function registerProcessor(jobType, processor) {
  if (!resumeQueue) {
    throw new Error('Queue not initialized');
  }
  
  resumeQueue.process(jobType, processor);
  logger.info(`Registered processor for job type: ${jobType}`);
}

/**
 * Get a job by ID
 * @param {string} jobId - ID of the job
 * @returns {Promise<Object>} Job object
 */
async function getJob(jobId) {
  if (!resumeQueue) {
    throw new Error('Queue not initialized');
  }
  
  return await resumeQueue.getJob(jobId);
}

/**
 * Clean up resources when service is destroyed
 */
async function destroy() {
  if (resumeQueue) {
    logger.info('Closing Queue Service (Bull)');
    await resumeQueue.close();
    resumeQueue = null;
  }
}

module.exports = {
  init,
  addJob,
  registerProcessor,
  getJob,
  destroy,
  DEFAULT_JOB_OPTIONS
};