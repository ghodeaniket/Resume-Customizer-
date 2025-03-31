/**
 * Models Index
 * 
 * This file exports all models for easy import elsewhere
 */

const User = require('./user');
const Resume = require('./resume');
const { Sequelize } = require('sequelize');
const config = require('../config/database');

// Create Sequelize instance
const sequelize = config.sequelize;

// Export all models
module.exports = {
  User,
  Resume,
  sequelize,
  Sequelize
};
