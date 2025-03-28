const User = require('../models/user');
const { generateToken } = require('../config/auth');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Register a new user
 */
exports.registerUser = async (userData) => {
  try {
    // Check if user with this email already exists
    const existingUser = await User.findByEmail(userData.email);
    if (existingUser) {
      const error = new Error('User with this email already exists');
      error.statusCode = 400;
      throw error;
    }

    // Create new user
    const user = await User.create(userData);

    // Generate JWT token
    const token = generateToken(user.id);

    return { user, token };
  } catch (error) {
    logger.error('Register user service error:', error);
    throw error;
  }
};

/**
 * Login user
 */
exports.loginUser = async (email, password) => {
  try {
    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Check if password is correct
    const isPasswordValid = await user.isPasswordValid(password);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user.id);

    return { user, token };
  } catch (error) {
    logger.error('Login user service error:', error);
    throw error;
  }
};

/**
 * Update user profile
 */
exports.updateUserProfile = async (userId, userData) => {
  try {
    // Find user by ID
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Update user
    if (userData.firstName) user.firstName = userData.firstName;
    if (userData.lastName) user.lastName = userData.lastName;
    
    await user.save();

    return user;
  } catch (error) {
    logger.error('Update user profile service error:', error);
    throw error;
  }
};

/**
 * Change user password
 */
exports.changeUserPassword = async (userId, currentPassword, newPassword) => {
  try {
    // Find user by ID
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    // Check if current password is correct
    const isPasswordValid = await user.isPasswordValid(currentPassword);
    if (!isPasswordValid) {
      const error = new Error('Current password is incorrect');
      error.statusCode = 401;
      throw error;
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return true;
  } catch (error) {
    logger.error('Change user password service error:', error);
    throw error;
  }
};

/**
 * Generate password reset token
 */
exports.forgotPassword = async (email) => {
  try {
    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal that the user doesn't exist
      return true;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token and store in database
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Set token expiry (1 hour)
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000;
    
    await user.save();

    // TODO: Send email with reset token
    // This would typically use a service like SendGrid, Mailgun, etc.
    logger.info(`Reset token for ${email}: ${resetToken}`);

    return true;
  } catch (error) {
    logger.error('Forgot password service error:', error);
    throw error;
  }
};

/**
 * Reset password with token
 */
exports.resetPassword = async (token, newPassword) => {
  try {
    // Hash token to compare with hashed token in database
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user by reset token and check if token is valid
    const user = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
      }
    });

    if (!user) {
      const error = new Error('Invalid or expired token');
      error.statusCode = 400;
      throw error;
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    
    await user.save();

    return true;
  } catch (error) {
    logger.error('Reset password service error:', error);
    throw error;
  }
};