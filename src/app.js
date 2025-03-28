const express = require('express');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./config/swagger');
const { testConnection } = require('./config/database');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { connectPrometheus, prometheusMiddleware } = require('./monitoring/prometheus');
const serviceFactory = require('./utils/serviceFactory');
const services = require('./services');

// Routes
const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const n8nRoutes = require('./routes/n8n');
const testRoutes = require('./routes/test');

// Load environment variables first
dotenv.config();

// Only validate environment variables if not in development mode
// This allows for easier local testing
if (process.env.NODE_ENV !== 'development') {
  require('./config/env');
} else {
  console.log('Running in development mode, skipping environment validation');
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Check if we're using mock services
const { useMockServices } = services.serviceFactory;
const isMockMode = useMockServices();

if (isMockMode) {
  logger.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  logger.warn('!!                MOCK MODE ACTIVE                  !!');
  logger.warn('!! Application is running with mock service         !!');
  logger.warn('!! implementations. Data will not persist beyond    !!');
  logger.warn('!! server restart. This mode is for development.    !!');
  logger.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
}

// Connect to database 
testConnection();

// Initialize services
try {
  // Initialize storage service
  const storageService = services.storage();
  storageService.init();
  try {
    storageService.testConnection();
  } catch (error) {
    logger.warn(`Storage service connection test error: ${error.message}`);
  }
  
  // Initialize AI service
  const aiService = services.ai();
  aiService.init();
  
  // Initialize queue service
  const queueService = services.queue();
  queueService.init();
  
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
  app.use(prometheusMiddleware);
}

// Security middleware
if (process.env.NODE_ENV === 'development') {
  // Relaxed security settings for development
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", "http://localhost:*"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http://localhost:*"],
        connectSrc: ["'self'", "http://localhost:*"],
        imgSrc: ["'self'", "data:", "http://localhost:*"],
        styleSrc: ["'self'", "'unsafe-inline'", "http://localhost:*"],
        fontSrc: ["'self'", "data:", "http://localhost:*"]
      }
    }
  }));
} else {
  // Strict security settings for production
  app.use(helmet());
}
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Request logging
app.use(morgan('combined', { stream: logger.stream }));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// For testing purposes
module.exports = app;