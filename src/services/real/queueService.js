/**
 * Real Queue Service Implementation Using Bull
 */
const Queue = require('bull');
const logger = require('../../utils/logger');

class QueueService {
  constructor() {
    // Configure Redis connection
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || ''
    };
    
    // Create the Bull queue
    this.resumeQueue = new Queue('resume-customization', {
      redis: this.redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    });
    
    // Set up event handlers
    this.resumeQueue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed with result: ${JSON.stringify(result)}`);
    });
    
    this.resumeQueue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed with error: ${err.message}`);
    });
    
    this.resumeQueue.on('error', (error) => {
      logger.error(`Resume queue error: ${error.message}`);
    });
    
    // Clean old jobs on startup
    this.resumeQueue.clean(24 * 60 * 60 * 1000, 'failed');
    
    logger.info('Initialized Real Queue Service (Bull)');
  }
}

// Create a singleton instance
const queueService = new QueueService();

// Export the queue
module.exports = {
  resumeQueue: queueService.resumeQueue
};
