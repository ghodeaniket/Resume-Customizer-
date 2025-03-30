const express = require('express');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const { testConnection } = require('./config/database');
const { connectPrometheus } = require('./monitoring/prometheus');
const services = require('./services');
const setupApp = require('./app-setup');

// Load environment variables first
dotenv.config();

// Only validate environment variables if not in development mode
// This allows for easier local testing
if (process.env.NODE_ENV !== 'development') {
  require('./config/env');
} else {
  // eslint-disable-next-line no-console
  console.log('Running in development mode, skipping environment validation');
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database 
testConnection();

// Initialize services
try {
  // Initialize storage service
  const _storageService = services.storage();
  
  // Initialize AI service
  const _aiService = services.ai();
  
  // Initialize queue service
  const _queueService = services.queue();
  
  // Initialize resume customization worker
  require('./workers/resumeWorker');
} catch (error) {
  logger.error(`Service initialization error: ${error.message}`);
  if (process.env.NODE_ENV === 'production') {
    // In production, we should fail fast
    process.exit(1);
  }
}

// Connect Prometheus if in production
if (process.env.NODE_ENV === 'production') {
  connectPrometheus();
}

// Setup the app with all middleware and routes
setupApp(app);

// Start the server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

// For testing purposes
module.exports = app;
