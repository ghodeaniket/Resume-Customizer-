/**
 * Mock Queue Service for Testing
 * Provides in-memory job queue for testing
 */

const logger = require('../../../src/utils/logger');
const crypto = require('crypto');
const { EventEmitter } = require('events');

// Private in-memory job storage
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
  
  logger.info('Test Mock Queue Service initialized');
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
  
  // Process job immediately for tests (without delay)
  if (processors.has(jobType)) {
    processJob(jobId);
  }
  
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
    job.status = 'failed';
    job.error = 'No processor registered for this job type';
    job.updatedAt = new Date();
    jobs.set(jobId, job);
    
    // Emit event
    eventEmitter.emit('failed', job, new Error(job.error));
    return;
  }
  
  try {
    // Execute processor
    const result = await processor(job);
    
    // Update job status
    job.status = 'completed';
    job.result = result;
    job.completedAt = new Date();
    job.updatedAt = new Date();
    jobs.set(jobId, job);
    
    // Emit event
    eventEmitter.emit('completed', job, result);
  } catch (error) {
    // Update job status
    job.error = error.message;
    job.updatedAt = new Date();
    
    if (job.attempts < job.maxAttempts) {
      // Retry job immediately for tests
      job.status = 'waiting';
      jobs.set(jobId, job);
      processJob(jobId);
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
  
  // Process any waiting jobs of this type
  for (const [jobId, job] of jobs.entries()) {
    if (job.type === jobType && job.status === 'waiting') {
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
    remove: async () => {
      jobs.delete(jobId);
      return true;
    }
  };
}

/**
 * Clean up resources when service is destroyed
 */
function destroy() {
  jobs.clear();
  processors.clear();
  eventEmitter.removeAllListeners();
}

module.exports = {
  init,
  addJob,
  registerProcessor,
  getJob,
  on: (event, callback) => eventEmitter.on(event, callback),
  destroy
};