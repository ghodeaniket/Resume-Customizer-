const express = require('express');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./config/swagger');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { prometheusMiddleware } = require('./monitoring/prometheus');

// Routes
const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const n8nRoutes = require('./routes/n8n');
const testRoutes = require('./routes/test');

// Load environment variables first
dotenv.config();

/**
 * Sets up an Express app with all middleware and routes
 * This is separated from server startup for testing purposes
 * 
 * @param {Object} app - Express app instance
 */
function setupApp(app) {
  // Debug endpoint that doesn't require database or service initialization
  // This endpoint should be accessible even if other parts of the application fail
  app.get('/debug', (req, res) => {
    // Determine if we're in serverless mode (AWS Lambda)
    const isServerless = process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined;
    
    // Check for essential environment variables
    const requiredEnvVars = [
      'JWT_SECRET', 
      'DATABASE_URL',
      'AWS_BUCKET_NAME', 
      'AWS_REGION',
      'N8N_WEBHOOK_URL',
      'REDIS_HOST'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    const debugInfo = {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      isServerless: isServerless,
      missingRequiredEnvVars: missingEnvVars,
      env: {
        // List all non-sensitive environment variables (without sensitive values)
        NODE_ENV: process.env.NODE_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? 'set (hidden)' : 'not set',
        DB_HOST: process.env.DB_HOST ? 'set' : 'not set',
        DB_NAME: process.env.DB_NAME ? 'set' : 'not set',
        DB_USER: process.env.DB_USER ? 'set' : 'not set',
        DB_PASSWORD: process.env.DB_PASSWORD ? 'set (hidden)' : 'not set',
        JWT_SECRET: process.env.JWT_SECRET ? 'set (hidden)' : 'not set',
        AWS_REGION: process.env.AWS_REGION ? 'set' : 'not set',
        AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME ? 'set' : 'not set',
        N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL ? 'set' : 'not set',
        N8N_WEBHOOK_PATH: process.env.N8N_WEBHOOK_PATH ? 'set' : 'not set',
        REDIS_HOST: process.env.REDIS_HOST ? 'set' : 'not set',
        REDIS_PORT: process.env.REDIS_PORT ? 'set' : 'not set',
        FALLBACK_TO_MOCK: process.env.FALLBACK_TO_MOCK,
        MOCK_SERVICES: process.env.MOCK_SERVICES,
        PORT: process.env.PORT,
        PUBLIC_URL: process.env.PUBLIC_URL
      }
    };
    
    res.status(200).json(debugInfo);
  });

  // Security middleware
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    // Relaxed security settings for development and testing
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ['\'self\'', 'http://localhost:*'],
          scriptSrc: ['\'self\'', '\'unsafe-inline\'', '\'unsafe-eval\'', 'http://localhost:*'],
          connectSrc: ['\'self\'', 'http://localhost:*'],
          imgSrc: ['\'self\'', 'data:', 'http://localhost:*'],
          styleSrc: ['\'self\'', '\'unsafe-inline\'', 'http://localhost:*'],
          fontSrc: ['\'self\'', 'data:', 'http://localhost:*']
        }
      }
    }));
  } else {
    // Strict security settings for production
    app.use(helmet());
  }
  app.use(cors());

  // Rate limiting (less strict for testing)
  const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: process.env.NODE_ENV === 'test' ? 1000 : 100, // Higher limit for tests
    message: 'Too many requests from this IP, please try again later'
  });
  app.use('/api/', limiter);

  // Request logging (silent in test)
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', { stream: logger.stream }));
  }

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Prometheus monitoring in non-test environments
  if (process.env.NODE_ENV !== 'test') {
    app.use(prometheusMiddleware);
  }

  // API Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

  // API Routes (v1)
  app.use('/api/v1/test', testRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/resumes', resumeRoutes);
  app.use('/api/v1/n8n', n8nRoutes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'success',
      message: 'Server is running',
      timestamp: new Date().toISOString()
    });
  });

  // Error handling middleware
  app.use(errorHandler);

  return app;
}

module.exports = setupApp;
