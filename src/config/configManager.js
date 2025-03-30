/**
 * Configuration Manager
 * 
 * This module centralizes configuration management for the application.
 * It loads environment variables and provides a structured interface
 * to access configuration settings.
 */

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Load environment variables from .env file
dotenv.config();

/**
 * Configuration schema with defaults and validation
 */
const configSchema = {
  // Server configuration
  server: {
    port: {
      value: process.env.PORT || 3000,
      validator: (val) => !isNaN(val),
      required: true
    },
    environment: {
      value: process.env.NODE_ENV || 'development',
      validator: (val) => ['development', 'production', 'test'].includes(val),
      required: true
    },
    publicUrl: {
      value: process.env.PUBLIC_URL || 'http://localhost:3000',
      validator: (val) => val.startsWith('http'),
      required: false
    }
  },
  
  // Database configuration
  database: {
    host: {
      value: process.env.DB_HOST,
      required: process.env.NODE_ENV === 'production'
    },
    port: {
      value: process.env.DB_PORT || 5432,
      validator: (val) => !isNaN(val),
      required: false
    },
    name: {
      value: process.env.DB_NAME,
      required: process.env.NODE_ENV === 'production'
    },
    username: {
      value: process.env.DB_USERNAME,
      required: process.env.NODE_ENV === 'production'
    },
    password: {
      value: process.env.DB_PASSWORD,
      required: process.env.NODE_ENV === 'production'
    },
    dialect: {
      value: process.env.DB_DIALECT || 'postgres',
      validator: (val) => ['postgres', 'mysql', 'sqlite', 'mssql'].includes(val),
      required: false
    }
  },
  
  // Redis configuration
  redis: {
    host: {
      value: process.env.REDIS_HOST || 'localhost',
      required: process.env.NODE_ENV === 'production'
    },
    port: {
      value: process.env.REDIS_PORT || 6379,
      validator: (val) => !isNaN(val),
      required: process.env.NODE_ENV === 'production'
    },
    password: {
      value: process.env.REDIS_PASSWORD,
      required: false
    }
  },
  
  // Authentication configuration
  auth: {
    jwtSecret: {
      value: process.env.JWT_SECRET,
      required: process.env.NODE_ENV !== 'development'
    },
    jwtExpiresIn: {
      value: process.env.JWT_EXPIRES_IN || '7d',
      required: false
    },
    saltRounds: {
      value: process.env.SALT_ROUNDS || 10,
      validator: (val) => !isNaN(val),
      required: false
    }
  },
  
  // AWS configuration
  aws: {
    accessKeyId: {
      value: process.env.AWS_ACCESS_KEY_ID,
      required: process.env.NODE_ENV === 'production'
    },
    secretAccessKey: {
      value: process.env.AWS_SECRET_ACCESS_KEY,
      required: process.env.NODE_ENV === 'production'
    },
    region: {
      value: process.env.AWS_REGION || 'us-east-1',
      required: process.env.NODE_ENV === 'production'
    },
    bucket: {
      value: process.env.AWS_S3_BUCKET,
      required: process.env.NODE_ENV === 'production'
    }
  },
  
  // n8n configuration
  n8n: {
    webhookUrl: {
      value: process.env.N8N_WEBHOOK_URL,
      required: process.env.NODE_ENV === 'production'
    },
    webhookPath: {
      value: process.env.N8N_WEBHOOK_PATH || '',
      required: false
    },
    fullWebhookUrl: {
      value: () => {
        const baseUrl = process.env.N8N_WEBHOOK_URL || '';
        const path = process.env.N8N_WEBHOOK_PATH || '';
        return baseUrl + path;
      },
      required: false
    }
  },
  
  // Resume customization configuration
  customization: {
    timeoutMs: {
      value: process.env.CUSTOMIZATION_TIMEOUT_MS || 60000,
      validator: (val) => !isNaN(val),
      required: false
    },
    maxRetries: {
      value: process.env.CUSTOMIZATION_MAX_RETRIES || 3,
      validator: (val) => !isNaN(val),
      required: false
    }
  },
  
  // Logging configuration
  logging: {
    level: {
      value: process.env.LOG_LEVEL || 'info',
      validator: (val) => ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'].includes(val),
      required: false
    },
    logToFile: {
      value: process.env.LOG_TO_FILE === 'true',
      required: false
    }
  }
};

/**
 * Validate configuration against schema
 * @returns {Array} Array of validation errors
 */
function validateConfig() {
  const errors = [];
  
  function validateSection(section, path = '') {
    for (const [key, config] of Object.entries(section)) {
      const fullPath = path ? `${path}.${key}` : key;
      
      if (typeof config === 'object' && !('value' in config)) {
        // This is a nested section
        validateSection(config, fullPath);
      } else {
        // This is a configuration value
        const { value, validator, required } = config;
        
        // Check required fields
        if (required && (value === undefined || value === null || value === '')) {
          errors.push(`Missing required configuration: ${fullPath}`);
        }
        
        // Validate value if validator exists and value is present
        if (validator && value !== undefined && value !== null && value !== '') {
          const result = typeof value === 'function' ? validator(value()) : validator(value);
          if (!result) {
            errors.push(`Invalid configuration value for ${fullPath}`);
          }
        }
      }
    }
  }
  
  validateSection(configSchema);
  return errors;
}

/**
 * Build the final configuration object from schema
 * @returns {Object} Configuration object
 */
function buildConfig() {
  const config = {};
  
  function processSection(section, target = config, path = '') {
    for (const [key, configItem] of Object.entries(section)) {
      const fullPath = path ? `${path}.${key}` : key;
      
      if (typeof configItem === 'object' && !('value' in configItem)) {
        // This is a nested section
        target[key] = {};
        processSection(configItem, target[key], fullPath);
      } else {
        // This is a configuration value
        const { value } = configItem;
        target[key] = typeof value === 'function' ? value() : value;
      }
    }
  }
  
  processSection(configSchema);
  return config;
}

// Validate configuration in production environments only
// Skip validation in development and test environments
if (process.env.NODE_ENV === 'production') {
  const validationErrors = validateConfig();
  
  if (validationErrors.length > 0) {
    logger.error('Configuration validation failed:', { errors: validationErrors });
    throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
  }
}

// Build and export the configuration object
const config = buildConfig();

module.exports = config;
