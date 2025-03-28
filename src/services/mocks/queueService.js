/**
 * Mock Queue Service
 * Provides in-memory job queue for development
 */

const logger = require('../../utils/logger');
const crypto = require('crypto');
const { EventEmitter } = require('events');

// Private in-memory job storage (module-scoped, not global)
let jobs = new Map();
let processors = new Map();
const eventEmitter = new EventEmitter();

/**
 * Initialize the service
 */
function init() {
  // Clear existing jobs and processors on initialization
  jobs = new Map();
  processors = new Map();
  
  logger.info('Mock Queue Service initialized');
  
  // Add a warning banner to logs
  const warning = [
    '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    '!!                   MOCK MODE ACTIVE                      !!',
    '!!                                                         !!',
    '!! Queue Service is using IN-MEMORY MOCK IMPLEMENTATION    !!',
    '!! Jobs will be processed in the same process and will be  !!',
    '!! lost on server restart. This mode is for development.   !!',
    '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
  ];
  
  warning.forEach(line => logger.warn(line));
}

/**
 * Add a job to the mock queue
 * @param {string} jobType - Type of job
 * @param {Object} data - Job data
 * @param {Object} options - Job options
 */
async function addJob(jobType, data, options = {}) {
  // Generate a unique job ID
  const jobId = crypto.randomUUID();
  
  // Create job
  const job = {
    id: jobId,
    type: jobType,
    data,
    options,
    status: 'waiting',
    createdAt: new Date(),
    updatedAt: new Date(),
    attempts: 0,
    maxAttempts: options.attempts || 3
  };
  
  // Store job
  jobs.set(jobId, job);
  logger.info(`[MOCK] Added job ${jobId} of type ${jobType} to queue`);
  
  // Schedule job processing with a small random delay
  const delay = 100 + Math.random() * 500;
  setTimeout(() => processJob(jobId), delay);
  
  // Return mock job
  return {
    id: jobId,
    ...job
  };
}

/**
 * Process a job
 * @param {string} jobId - ID of the job to process
 */
async function processJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) {
    logger.warn(`[MOCK] Job ${jobId} not found`);
    return;
  }
  
  // Update job status
  job.status = 'processing';
  job.attempts += 1;
  job.updatedAt = new Date();
  jobs.set(jobId, job);
  
  // Get processor for job type
  const processor = processors.get(job.type);
  if (!processor) {
    logger.warn(`[MOCK] No processor found for job type ${job.type}`);
    job.status = 'failed';
    job.error = 'No processor registered for this job type';
    job.updatedAt = new Date();
    jobs.set(jobId, job);
    
    // Emit event
    eventEmitter.emit('failed', job, new Error(job.error));
    return;
  }
  
  try {
    logger.info(`[MOCK] Processing job ${jobId} of type ${job.type} (attempt ${job.attempts}/${job.maxAttempts})`);
    
    // Execute processor
    const result = await processor(job);
    
    // Update job status
    job.status = 'completed';
    job.result = result;
    job.completedAt = new Date();
    job.updatedAt = new Date();
    jobs.set(jobId, job);
    
    logger.info(`[MOCK] Job ${jobId} completed successfully`);
    
    // Emit event
    eventEmitter.emit('completed', job, result);
  } catch (error) {
    logger.error(`[MOCK] Job ${jobId} failed with error: ${error.message}`);
    
    // Update job status
    job.error = error.message;
    job.updatedAt = new Date();
    
    if (job.attempts < job.maxAttempts) {
      // Retry job after delay
      job.status = 'waiting';
      jobs.set(jobId, job);
      
      // Schedule retry with exponential backoff
      const delay = Math.pow(2, job.attempts) * 1000;
      logger.info(`[MOCK] Retrying job ${jobId} in ${delay}ms`);
      setTimeout(() => processJob(jobId), delay);
    } else {
      // Max attempts reached, mark as failed
      job.status = 'failed';
      jobs.set(jobId, job);
      
      // Emit event
      eventEmitter.emit('failed', job, error);
    }
  }
}

/**
 * Register a processor for a job type
 * @param {string} jobType - Type of job to process
 * @param {Function} processor - Processing function
 */
function registerProcessor(jobType, processor) {
  processors.set(jobType, processor);
  logger.info(`[MOCK] Registered processor for job type: ${jobType}`);
  
  // Check for existing jobs of this type
  for (const [jobId, job] of jobs.entries()) {
    if (job.type === jobType && job.status === 'waiting') {
      logger.info(`[MOCK] Found waiting job ${jobId} of type ${jobType}, scheduling processing`);
      processJob(jobId);
    }
  }
}

/**
 * Get a job by ID
 * @param {string} jobId - ID of the job
 */
async function getJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) {
    return null;
  }
  
  return {
    ...job,
    // Add Bull-like methods
    moveToCompleted: async () => {},
    moveToFailed: async () => {},
    remove: async () => {
      jobs.delete(jobId);
      return true;
    }
  };
}

/**
 * Listen for queue events (similar to Bull's event system)
 * @param {string} event - Event name 
 * @param {Function} callback - Event handler
 */
function on(event, callback) {
  eventEmitter.on(event, callback);
}

/**
 * Get statistics about mock queue
 */
function getStats() {
  const stats = {
    total: jobs.size,
    waiting: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };
  
  for (const job of jobs.values()) {
    stats[job.status] = (stats[job.status] || 0) + 1;
  }
  
  return stats;
}

/**
 * Clean up resources when service is destroyed
 */
function destroy() {
  const stats = getStats();
  logger.info(`Mock Queue Service destroyed. Cleared ${stats.total} jobs`);
  jobs.clear();
  processors.clear();
  eventEmitter.removeAllListeners();
}

module.exports = {
  init,
  addJob,
  registerProcessor,
  getJob,
  on,
  getStats,
  destroy
};
