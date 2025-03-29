/**
 * Queue Service Mock Implementation
 */
const logger = require('../../src/utils/logger');
const { v4: uuidv4 } = require('uuid'); 

class QueueMockService {
  constructor() {
    this.jobs = new Map();
    this.eventHandlers = {
      completed: [],
      failed: [],
      error: []
    };
    logger.info('Initialized Queue Mock Service');
  }

  // Add a job to the mock queue
  async add(jobData) {
    const jobId = uuidv4();
    this.jobs.set(jobId, {
      id: jobId,
      data: jobData,
      status: 'queued',
      createdAt: new Date()
    });
    
    logger.info(`Added job ${jobId} to mock queue`);
    
    // Simulate job processing after a delay
    setTimeout(() => this._processJob(jobId), 3000);
    
    return { id: jobId };
  }
  
  // Register an event handler
  on(event, callback) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(callback);
    }
    return this;
  }
  
  // Process a job
  _processJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return;
    
    job.status = 'processing';
    
    // Simulate successful job completion after a delay
    setTimeout(() => {
      job.status = 'completed';
      job.completedAt = new Date();
      
      // Call completion handlers
      this.eventHandlers.completed.forEach(handler => {
        try {
          handler(job, { success: true, jobId });
        } catch (error) {
          logger.error(`Error in 'completed' event handler: ${error.message}`);
        }
      });
      
      logger.info(`Mock job ${jobId} completed successfully`);
    }, 2000);
  }
  
  // Simulate job processing
  process(processFunction) {
    logger.info('Registered process function with mock queue');
    // In a mock implementation, we don't actually call the process function
    // as we're simulating the processing
  }
  
  // Clean completed/failed jobs
  async clean(age, status) {
    logger.info(`Mock queue: cleaning ${status} jobs older than ${age}ms`);
    // Not implemented in mock, would remove old jobs in real implementation
    return { count: 0 };
  }
}

// Create queue instance
const resumeQueue = new QueueMockService();

// Export the queue
module.exports = {
  resumeQueue
};