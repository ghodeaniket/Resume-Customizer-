const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Initialize Sequelize with database connection
const sequelize = process.env.DATABASE_URL ? new Sequelize(process.env.DATABASE_URL, {
  logging: msg => logger.debug(msg),
  dialect: 'postgres',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
}) : null;

// Test the database connection
const testConnection = async () => {
  if (!sequelize) {
    logger.warn('No DATABASE_URL provided. Database connection will not be established.');
    return;
  }
  
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      logger.warn('Running in development mode, continuing despite database connection failure');
    }
  }
};

module.exports = {
  sequelize,
  testConnection
};