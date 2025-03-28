const Queue = require('bull');
const logger = require('../utils/logger');

let resumeQueue = null;

// Try to initialize Bull queue if Redis is available
try {
  // In development, access environment variables directly
  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || ''
  };
  
  resumeQueue = new Queue('resume-customization', {
    redis: redisConfig,
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
  
  logger.info('Bull queue initialized successfully');
} catch (error) {
  logger.warn(`Failed to initialize Bull queue: ${error.message}`);
  
  // Create a mock queue only if MOCK_SERVICES is true in development
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_SERVICES === 'true') {
    logger.info('Creating mock queue for development (MOCK_SERVICES=true)');
    resumeQueue = {
      add: async () => ({ id: 'mock-job-id' }),
      process: () => {},
      on: () => {},
      clean: () => {}
    };
  } else if (process.env.NODE_ENV === 'development') {
    logger.error('Failed to initialize Bull queue and MOCK_SERVICES is false. Please ensure Redis is running properly.');
    throw new Error('Redis connection failed and mock services are disabled.');
  }
}

module.exports = {
  resumeQueue
};