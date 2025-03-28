const Queue = require('bull');
const { redis } = require('./env');
const logger = require('../utils/logger');

// Create queues
const resumeQueue = new Queue('resume-customization', {
  redis: {
    host: redis.host,
    port: redis.port,
    password: redis.password
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true, // Remove jobs from queue after completion
    removeOnFail: false     // Keep failed jobs for inspection
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
resumeQueue.clean(24 * 60 * 60 * 1000, 'failed'); // Clean failed jobs older than 24 hours

module.exports = {
  resumeQueue
};