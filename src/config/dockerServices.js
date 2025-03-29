/**
 * Docker Services Configuration
 * 
 * This module provides configuration for Docker-based development services.
 * It's used to override environment-based configuration when running with Docker.
 */

const logger = require('../utils/logger');

/**
 * Configure S3 service for MinIO
 * @param {Object} config - AWS S3 configuration
 * @returns {Object} - Updated configuration
 */
function configureMinioForS3(config = {}) {
  // Check if using MinIO (via AWS_ENDPOINT or AWS_FORCE_PATH_STYLE)
  const usingMinio = process.env.AWS_ENDPOINT || process.env.AWS_FORCE_PATH_STYLE === 'true';
  
  if (usingMinio) {
    logger.info('Using MinIO as S3 storage service');
    
    // Configure AWS SDK for MinIO
    return {
      ...config,
      endpoint: process.env.AWS_ENDPOINT || 'http://localhost:9000',
      s3ForcePathStyle: true, // Needed for MinIO
      signatureVersion: 'v4'
    };
  }
  
  return config;
}

/**
 * Configure Redis for Bull queue
 * @param {Object} config - Redis configuration 
 * @returns {Object} - Updated configuration
 */
function configureRedisForBull(config = {}) {
  // Nothing special to configure for Redis in Docker
  // This function exists for potential future customization
  return config;
}

/**
 * Configure n8n webhook
 * @param {Object} config - n8n configuration
 * @returns {Object} - Updated configuration
 */
function configureN8nWebhook(config = {}) {
  // Check if using mock N8N
  const usingMockN8n = process.env.N8N_WEBHOOK_URL && 
                      process.env.N8N_WEBHOOK_URL.includes('localhost');
  
  if (usingMockN8n) {
    logger.info('Using mock N8N webhook service');
  }
  
  return config;
}

module.exports = {
  configureMinioForS3,
  configureRedisForBull,
  configureN8nWebhook
};
