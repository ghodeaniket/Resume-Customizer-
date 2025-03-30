/**
 * Logger Utility
 * 
 * This module provides a centralized logging mechanism for the application
 * with structured logging support, log rotation, and different levels.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config/configManager');
require('winston-daily-rotate-file');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Define log level colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'white'
};

// Add colors to Winston
winston.addColors(logColors);

// Define log format for console
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    // Format metadata as string if present
    const metaString = Object.keys(meta).length 
      ? '\n' + JSON.stringify(meta, null, 2) 
      : '';
      
    return `${timestamp} ${level}: ${message}${metaString}`;
  })
);

// Define log format for files (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create file transport with rotation
const fileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, '%DATE%-app.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat
});

// Create error file transport with rotation
const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logsDir, '%DATE%-error.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error',
  format: fileFormat
});

// Get log level from config
const logLevel = config.logging?.level || process.env.LOG_LEVEL || 'info';

// Create transports array
const transports = [
  new winston.transports.Console({ format: consoleFormat })
];

// Add file transports if enabled
if (config.logging?.logToFile || process.env.LOG_TO_FILE === 'true') {
  transports.push(fileTransport, errorFileTransport);
}

// Create logger
const logger = winston.createLogger({
  level: logLevel,
  levels: logLevels,
  defaultMeta: { service: 'resume-customizer-backend' },
  transports
});

// Add environment to metadata
logger.defaultMeta.environment = process.env.NODE_ENV || 'development';

// Log message with context
logger.logWithContext = (level, message, context = {}) => {
  if (!logger[level]) {
    logger.warn(`Invalid log level: ${level}, defaulting to 'info'`);
    level = 'info';
  }
  
  logger[level](message, context);
};

// Create a stream object for HTTP request logging (Morgan)
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

module.exports = logger;
