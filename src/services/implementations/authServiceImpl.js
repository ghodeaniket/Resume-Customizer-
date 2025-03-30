/**
 * Auth Service Implementation
 * 
 * This service handles user authentication operations
 * including registration, login, password management, etc.
 */

const logger = require('../../utils/logger');
const crypto = require('crypto');
const { generateToken } = require('../../config/auth');
const { ValidationError, AuthenticationError, NotFoundError } = require('../../utils/errors');

/**
 * Auth Service with dependency injection
 */
class AuthService {
  /**
   * Create a new AuthService instance
   * @param {Object} deps - Dependencies
   * @param {Object} deps.userModel - User model/repository
   * @param {Object} deps.emailService - Email service (optional)
   */
  constructor({ userModel, emailService = null }) {
    this.userModel = userModel;
    this.emailService = emailService;
    
    logger.info('AuthService initialized with dependencies');
  }

  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Object with user and token
   */
  async registerUser(userData) {
    try {
      // Check if user with this email already exists
      const existingUser = await this.userModel.findByEmail(userData.email);
      if (existingUser) {
        throw new ValidationError('User with this email already exists');
      }

      // Create new user
      const user = await this.userModel.create(userData);

      // Generate JWT token
      const token = generateToken(user.id);

      return { user, token };
    } catch (error) {
      logger.error('Register user service error:', error);
      throw error;
    }
  }

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Object with user and token
   */
  async loginUser(email, password) {
    try {
      // Find user by email
      const user = await this.userModel.findByEmail(email);
      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Check if password is correct
      const isPasswordValid = await user.isPasswordValid(password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
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
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} userData - Profile update data
   * @returns {Promise<Object>} Updated user
   */
  async updateUserProfile(userId, userData) {
    try {
      // Find user by ID
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found', 'user');
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
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success indicator
   */
  async changeUserPassword(userId, currentPassword, newPassword) {
    try {
      // Find user by ID
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found', 'user');
      }

      // Check if current password is correct
      const isPasswordValid = await user.isPasswordValid(currentPassword);
      if (!isPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return true;
    } catch (error) {
      logger.error('Change user password service error:', error);
      throw error;
    }
  }

  /**
   * Generate password reset token
   * @param {string} email - User email
   * @returns {Promise<boolean>} Success indicator
   */
  async forgotPassword(email) {
    try {
      // Find user by email
      const user = await this.userModel.findByEmail(email);
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

      // Send email with reset token if email service is available
      if (this.emailService) {
        await this.emailService.sendPasswordResetEmail(email, resetToken);
      } else {
        // Log token in non-production environments
        if (process.env.NODE_ENV !== 'production') {
          logger.info(`Reset token for ${email}: ${resetToken}`);
        }
      }

      return true;
    } catch (error) {
      logger.error('Forgot password service error:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success indicator
   */
  async resetPassword(token, newPassword) {
    try {
      // Hash token to compare with hashed token in database
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Find user by reset token and check if token is valid
      const user = await this.userModel.findOne({
        where: {
          passwordResetToken: hashedToken,
          passwordResetExpires: { $gt: Date.now() }
        }
      });

      if (!user) {
        throw new ValidationError('Invalid or expired token');
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
  }
}

module.exports = AuthService;
