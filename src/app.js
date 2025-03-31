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
  try {
    require('./config/env');
  } catch (error) {
    logger.warn(`Environment validation error: ${error.message}. Continuing...`);
  }
} else {
  // eslint-disable-next-line no-console
  console.log('Running in development mode, skipping environment validation');
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Connect to database - but don't fail if connection fails
try {
  testConnection().catch(err => {
    logger.error(`Database connection failed: ${err.message}. Application will continue, but database features may not work.`);
  });
} catch (error) {
  logger.error(`Database setup error: ${error.message}. Application will continue, but database features may not work.`);
}

// Initialize services - fail gracefully if initialization fails
const initializeServices = async () => {
  try {
    // Determine if we're in serverless mode (AWS Lambda)
    const isServerless = process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
    
    // In serverless, only initialize services that are required for the current request
    // This reduces cold start time and prevents unnecessary connections
    if (isServerless) {
      logger.info('Running in serverless mode - services will be initialized on-demand');
      // Don't initialize workers in serverless mode - they should run in a separate Lambda or ECS task
      return;
    }
    
    // Initialize storage service
    try {
      const _storageService = services.storage();
      logger.info('Storage service initialized successfully');
    } catch (error) {
      logger.error(`Storage service initialization error: ${error.message}`);
      if (process.env.FALLBACK_TO_MOCK === 'true') {
        logger.info('Falling back to mock storage service');
      }
    }
    
    // Initialize AI service
    try {
      const _aiService = services.ai();
      logger.info('AI service initialized successfully');
    } catch (error) {
      logger.error(`AI service initialization error: ${error.message}`);
      if (process.env.FALLBACK_TO_MOCK === 'true') {
        logger.info('Falling back to mock AI service');
      }
    }
    
    // Initialize queue service
    try {
      const _queueService = services.queue();
      logger.info('Queue service initialized successfully');
    } catch (error) {
      logger.error(`Queue service initialization error: ${error.message}`);
      if (process.env.FALLBACK_TO_MOCK === 'true') {
        logger.info('Falling back to mock queue service');
      }
    }
    
    // Initialize resume customization worker (only in non-serverless mode)
    try {
      require('./workers/resumeWorker');
      logger.info('Resume worker initialized successfully');
    } catch (error) {
      logger.error(`Resume worker initialization error: ${error.message}`);
    }
  } catch (error) {
    logger.error(`Service initialization error: ${error.message}`);
  }
};

// Initialize services but don't block app initialization
initializeServices().catch(err => {
  logger.error(`Failed to initialize services: ${err.message}`);
});

// Connect Prometheus if in production
if (process.env.NODE_ENV === 'production') {
  try {
    connectPrometheus();
  } catch (error) {
    logger.error(`Prometheus connection error: ${error.message}`);
  }
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