/**
 * Resume Repository
 * 
 * This repository handles data access operations for resumes.
 * It abstracts database operations and provides a clean interface
 * for the service layer.
 */

const Resume = require('../models/resume');
const logger = require('../utils/logger');

/**
 * Find all resumes for a specific user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of resume objects
 */
async function findByUser(userId) {
  try {
    return await Resume.findAll({
      where: { userId },
      order: [['updatedAt', 'DESC']]
    });
  } catch (error) {
    logger.error(`Repository error - findByUser: ${error.message}`, error);
    throw error;
  }
}

/**
 * Find a resume by ID and user ID
 * @param {string} resumeId - Resume ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Resume object or null if not found
 */
async function findById(resumeId, userId) {
  try {
    return await Resume.findOne({
      where: { id: resumeId, userId }
    });
  } catch (error) {
    logger.error(`Repository error - findById: ${error.message}`, error);
    throw error;
  }
}

/**
 * Create a new resume
 * @param {Object} resumeData - Resume data
 * @returns {Promise<Object>} Created resume
 */
async function create(resumeData) {
  try {
    return await Resume.create(resumeData);
  } catch (error) {
    logger.error(`Repository error - create: ${error.message}`, error);
    throw error;
  }
}

/**
 * Update a resume
 * @param {string} resumeId - Resume ID
 * @param {string} userId - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object|null>} Updated resume or null if not found
 */
async function update(resumeId, userId, updateData) {
  try {
    const resume = await Resume.findOne({
      where: { id: resumeId, userId }
    });
    
    if (!resume) return null;
    
    // Update resume properties
    Object.assign(resume, updateData);
    
    // Save changes
    await resume.save();
    
    return resume;
  } catch (error) {
    logger.error(`Repository error - update: ${error.message}`, error);
    throw error;
  }
}

/**
 * Delete a resume
 * @param {string} resumeId - Resume ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Whether the resume was deleted
 */
async function remove(resumeId, userId) {
  try {
    const resume = await Resume.findOne({
      where: { id: resumeId, userId }
    });
    
    if (!resume) return false;
    
    await resume.destroy();
    return true;
  } catch (error) {
    logger.error(`Repository error - remove: ${error.message}`, error);
    throw error;
  }
}

/**
 * Find resumes with a specific status
 * @param {string} status - Status to filter by
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} Array of resume objects
 */
async function findByStatus(status, limit = 10) {
  try {
    return await Resume.findAll({
      where: { customizationStatus: status },
      limit,
      order: [['createdAt', 'ASC']]
    });
  } catch (error) {
    logger.error(`Repository error - findByStatus: ${error.message}`, error);
    throw error;
  }
}

/**
 * Update resume status (for background processing, no ownership check)
 * @param {string} resumeId - Resume ID
 * @param {string} status - New status
 * @param {Object} additionalData - Additional data to update
 * @returns {Promise<Object|null>} Updated resume or null if not found
 */
async function updateStatus(resumeId, status, additionalData = {}) {
  try {
    // For status updates via background jobs, we use findByPk to avoid userId requirement
    const resume = await Resume.findByPk(resumeId);
    
    if (!resume) return null;
    
    // Update status and additional data
    resume.customizationStatus = status;
    Object.assign(resume, additionalData);
    
    // Save changes
    await resume.save();
    
    return resume;
  } catch (error) {
    logger.error(`Repository error - updateStatus: ${error.message}`, error);
    throw error;
  }
}

/**
 * Find a resume by ID only for background processing (no userId check)
 * @param {string} resumeId - Resume ID
 * @returns {Promise<Object|null>} Resume object or null if not found
 */
async function findByIdForProcessing(resumeId) {
  try {
    return await Resume.findByPk(resumeId);
  } catch (error) {
    logger.error(`Repository error - findByIdForProcessing: ${error.message}`, error);
    throw error;
  }
}

module.exports = {
  findByUser,
  findById,
  findByIdForProcessing,
  create,
  update,
  remove,
  findByStatus,
  updateStatus
};
