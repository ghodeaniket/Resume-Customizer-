/**
 * Queue Service Implementation
 * 
 * This service provides background job processing functionality using Bull/Redis
 */

const Queue = require('bull');
const logger = require('../../utils/logger');
const { ServiceError } = require('../../utils/errors');

/**
 * Queue Service with dependency injection
 */
class QueueService {
  /**
   * Create a new QueueService instance
   * @param {Object} config - Configuration object
   * @param {string} config.queueName - Name of the queue
   * @param {Object} config.redis - Redis configuration
   * @param {string} config.redis.host - Redis host
   * @param {number} config.redis.port - Redis port
   * @param {string} config.redis.password - Redis password (optional)
   * @param {Object} config.defaultJobOptions - Default job options
   */
  constructor(config) {
    this.config = config;
    this.queue = null;
    
    // Initialize the queue
    this.initialize();
    
    logger.info(`QueueService initialized with queue name: ${config.queueName}`);
  }

  /**
   * Default job options - centralized to avoid duplication
   * @readonly
   * @static
   */
  static get DEFAULT_JOB_OPTIONS() {
    return {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true,
      removeOnFail: false
    };
  }

  /**
   * Initialize the queue
   * @private
   */
  initialize() {
    const redisConfig = {
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password || undefined
    };
    
    // Create queue
    this.queue = new Queue(this.config.queueName, {
      redis: redisConfig,
      defaultJobOptions: this.config.defaultJobOptions || QueueService.DEFAULT_JOB_OPTIONS
    });
    
    // Log queue events
    this.queue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed with result: ${JSON.stringify(result)}`);
    });
    
    this.queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed with error: ${err.message}`);
    });
    
    this.queue.on('error', (error) => {
      logger.error(`Queue error: ${error.message}`);
    });
    
    // Clean old jobs on startup
    this.queue.clean(24 * 60 * 60 * 1000, 'failed');
  }

  /**
   * Add a job to the queue
   * @param {string} jobType - Type of job 
   * @param {Object} data - Job data
   * @param {Object} options - Job options
   * @returns {Promise<Object>} Job object
   */
  async addJob(jobType, data, options = {}) {
    if (!this.queue) {
      throw new ServiceError('Queue not initialized', 'queue');
    }
    
    try {
      // Merge with default options
      const jobOptions = { 
        ...QueueService.DEFAULT_JOB_OPTIONS, 
        ...this.config.defaultJobOptions, 
        ...options 
      };
      
      const job = await this.queue.add(jobType, data, jobOptions);
      logger.info(`Added job ${job.id} of type ${jobType} to queue`);
      
      return job;
    } catch (error) {
      logger.error(`Failed to add job to queue: ${error.message}`);
      throw new ServiceError(`Failed to add job to queue: ${error.message}`, 'queue');
    }
  }

  /**
   * Register a processor for a job type
   * @param {string} jobType - Type of job to process
   * @param {Function} processor - Processing function
   */
  registerProcessor(jobType, processor) {
    if (!this.queue) {
      throw new ServiceError('Queue not initialized', 'queue');
    }
    
    this.queue.process(jobType, processor);
    logger.info(`Registered processor for job type: ${jobType}`);
  }

  /**
   * Get a job by ID
   * @param {string} jobId - ID of the job
   * @returns {Promise<Object>} Job object
   */
  async getJob(jobId) {
    if (!this.queue) {
      throw new ServiceError('Queue not initialized', 'queue');
    }
    
    try {
      const job = await this.queue.getJob(jobId);
      
      if (!job) {
        throw new ServiceError(`Job ${jobId} not found`, 'not-found');
      }
      
      return job;
    } catch (error) {
      logger.error(`Failed to get job ${jobId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get job status
   * @param {string} jobId - ID of the job
   * @returns {Promise<Object>} Job status
   */
  async getJobStatus(jobId) {
    const job = await this.getJob(jobId);
    
    // Get job state
    const state = await job.getState();
    
    // Get job progress
    const progress = await job.progress();
    
    return {
      id: job.id,
      state,
      progress,
      data: job.data,
      opts: job.opts,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      attemptsMade: job.attemptsMade
    };
  }

  /**
   * Clean up resources
   */
  async destroy() {
    if (this.queue) {
      logger.info('Closing Queue Service');
      await this.queue.close();
      this.queue = null;
    }
  }
}

module.exports = QueueService;
