/**
 * User Repository
 * 
 * This repository provides an abstraction layer over the User model,
 * handling all database interactions related to users.
 */

const User = require('../models/user');
const logger = require('../utils/logger');

/**
 * Find a user by ID
 * @param {string} id - The user ID
 * @returns {Promise<Object|null>} - User object or null if not found
 */
async function findById(id) {
  try {
    return await User.findByPk(id);
  } catch (error) {
    logger.error(`Error finding user ${id}: ${error.message}`);
    throw error;
  }
}

/**
 * Find a user by email
 * @param {string} email - The user's email
 * @returns {Promise<Object|null>} - User object or null if not found
 */
async function findByEmail(email) {
  try {
    return await User.findByEmail(email);
  } catch (error) {
    logger.error(`Error finding user by email: ${error.message}`);
    throw error;
  }
}

/**
 * Create a new user
 * @param {Object} userData - The user data
 * @returns {Promise<Object>} - The created user
 */
async function create(userData) {
  try {
    return await User.create(userData);
  } catch (error) {
    logger.error(`Error creating user: ${error.message}`);
    throw error;
  }
}

/**
 * Update a user
 * @param {string} id - The user ID
 * @param {Object} updateData - The data to update
 * @returns {Promise<Object|null>} - Updated user or null if not found
 */
async function update(id, updateData) {
  try {
    const user = await User.findByPk(id);
    
    if (!user) return null;
    
    // Update fields
    Object.assign(user, updateData);
    
    // Save changes
    await user.save();
    
    return user;
  } catch (error) {
    logger.error(`Error updating user ${id}: ${error.message}`);
    throw error;
  }
}

/**
 * Validate user's password
 * @param {Object} user - The user object
 * @param {string} password - The password to validate
 * @returns {Promise<boolean>} - Whether the password is valid
 */
async function validatePassword(user, password) {
  try {
    return await user.isPasswordValid(password);
  } catch (error) {
    logger.error(`Error validating password: ${error.message}`);
    throw error;
  }
}

module.exports = {
  findById,
  findByEmail,
  create,
  update,
  validatePassword
};
