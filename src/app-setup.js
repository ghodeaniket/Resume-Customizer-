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
