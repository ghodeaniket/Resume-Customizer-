const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Initialize Sequelize with database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: msg => logger.debug(msg),
  dialect: 'postgres',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Test the database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  testConnection
};