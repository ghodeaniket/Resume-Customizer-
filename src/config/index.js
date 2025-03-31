/**
 * Application Configuration
 * 
 * Central configuration module that loads environment variables
 * and provides configuration values for the application.
 */

require('dotenv').config();

/**
 * Application configuration
 */
const config = {
  // Server configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000'
  },
  
  // Feature flags
  features: {
    // AI service implementation type: 'n8n' or 'direct_llm'
    aiServiceImplementation: process.env.AI_SERVICE_IMPLEMENTATION || 'n8n'
  },
  
  // N8N webhook configuration
  n8n: {
    webhookUrl: process.env.N8N_WEBHOOK_URL || 'http://localhost:5678',
    webhookPath: process.env.N8N_WEBHOOK_PATH || '/webhook/customize-resume-ai',
    timeoutMs: parseInt(process.env.N8N_TIMEOUT_MS || '120000', 10),
    maxRetries: parseInt(process.env.N8N_MAX_RETRIES || '3', 10)
  },
  
  // LLM API configuration
  llm: {
    apiKey: process.env.LLM_API_KEY,
    baseUrl: process.env.LLM_API_BASE_URL || 'https://openrouter.ai/api',
    modelName: process.env.LLM_MODEL_NAME || 'deepseek/deepseek-r1-distill-llama-70b',
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '120000', 10)
  },
  
  // Storage configuration
  storage: {
    type: process.env.STORAGE_TYPE || 's3',
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },
    local: {
      storagePath: process.env.LOCAL_STORAGE_PATH || './uploads'
    }
  },
  
  // Database configuration
  database: {
    url: process.env.DATABASE_URL,
    dialect: process.env.DATABASE_DIALECT || 'postgres',
    logging: process.env.DATABASE_LOGGING === 'true'
  },
  
  // Redis configuration (for queue)
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'development-secret', // Only use default in dev!
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    directory: process.env.LOG_DIRECTORY || './logs'
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: process.env.CORS_CREDENTIALS === 'true'
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10) // 100 requests per windowMs
  }
};

// Validate critical configuration in production
if (config.server.env === 'production') {
  const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL'
  ];
  
  // Add more required vars based on implementation
  if (config.features.aiServiceImplementation === 'n8n') {
    requiredEnvVars.push('N8N_WEBHOOK_URL');
  } else if (config.features.aiServiceImplementation === 'direct_llm') {
    requiredEnvVars.push('LLM_API_KEY');
  }
  
  // Check for missing env vars
  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables in production: ${missingEnvVars.join(', ')}`);
  }
}

module.exports = config;