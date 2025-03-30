const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Initialize Sequelize with database connection
// In development, we ensure the connection is created even if DATABASE_URL is not explicitly set
const dbUrl = process.env.DATABASE_URL || 
  (process.env.NODE_ENV === 'development' ? 
    'postgres://postgres:postgres@localhost:5432/resume_customizer' : 
    (process.env.NODE_ENV === 'test' ? 
      'sqlite::memory:' : null));

// Don't create a connection if in test mode and being required by a test file
const isInTestFile = process.env.NODE_ENV === 'test' && 
  (new Error().stack.includes('test.js') || new Error().stack.includes('jest'));

const sequelizeInstance = !isInTestFile && dbUrl ? new Sequelize(dbUrl, {
  logging: msg => logger.debug(msg),
  dialect: dbUrl.startsWith('sqlite') ? 'sqlite' : 'postgres',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
}) : null;

// Test the database connection
const testConnection = async () => {
  if (!sequelizeInstance) {
    logger.warn('No DATABASE_URL provided. Database connection will not be established.');
    return;
  }
  
  try {
    await sequelizeInstance.authenticate();
    logger.info('Database connection has been established successfully.');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      logger.warn('Running in development/test mode, continuing despite database connection failure');
    }
  }
};

module.exports = {
  sequelize: sequelizeInstance,
  testConnection
};