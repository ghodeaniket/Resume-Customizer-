const joi = require('joi');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

// Load environment variables from .env file
dotenv.config();

// Define validation schema
const envSchema = joi.object({
  // Server
  NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),
  PORT: joi.number().default(3000),
  
  // Database
  DATABASE_URL: joi.string().required(),
  
  // JWT
  JWT_SECRET: joi.string().required(),
  JWT_EXPIRES_IN: joi.string().default('7d'),
  
  // AWS S3
  AWS_BUCKET_NAME: joi.string().required(),
  AWS_REGION: joi.string().required(),
  AWS_ACCESS_KEY_ID: joi.string().required(),
  AWS_SECRET_ACCESS_KEY: joi.string().required(),
  
  // N8N
  N8N_WEBHOOK_URL: joi.string().required(),
  N8N_WEBHOOK_PATH: joi.string().required().default('customize-resume-ai'),
  
  // Redis (for Bull queue)
  REDIS_HOST: joi.string().required(),
  REDIS_PORT: joi.number().default(6379),
  REDIS_PASSWORD: joi.string().allow('', null),
  
  // Public URL
  PUBLIC_URL: joi.string().default('http://localhost:3000'),
  
  // Customization defaults
  CUSTOMIZATION_TIMEOUT_MS: joi.number().default(120000),
  CUSTOMIZATION_MAX_RETRIES: joi.number().default(3)
}).unknown();

// Validate environment variables
const { error, value: env } = envSchema.validate(process.env);

if (error) {
  logger.error(`Environment variable validation error: ${error.message}`);
  process.exit(1);
}

module.exports = {
  env: {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test'
  },
  db: {
    url: env.DATABASE_URL
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN
  },
  aws: {
    bucketName: env.AWS_BUCKET_NAME,
    region: env.AWS_REGION,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY
  },
  n8n: {
    webhookUrl: env.N8N_WEBHOOK_URL,
    webhookPath: env.N8N_WEBHOOK_PATH,
    fullWebhookUrl: `${env.N8N_WEBHOOK_URL}/${env.N8N_WEBHOOK_PATH}`
  },
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD
  },
  public: {
    url: env.PUBLIC_URL
  },
  customization: {
    timeoutMs: env.CUSTOMIZATION_TIMEOUT_MS,
    maxRetries: env.CUSTOMIZATION_MAX_RETRIES
  }
};