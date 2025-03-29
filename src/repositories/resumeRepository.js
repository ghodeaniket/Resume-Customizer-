/**
 * Resume Repository
 * 
 * This repository provides an abstraction layer over the Resume model,
 * handling all database interactions related to resumes.
 */

const Resume = require('../models/resume');
const logger = require('../utils/logger');

/**
 * Find all resumes for a specific user
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} - Array of resume objects
 */
async function findByUser(userId) {
  try {
    const resumes = await Resume.findAll({
      where: { userId },
      order: [['updatedAt', 'DESC']]
    });
    return resumes;
  } catch (error) {
    logger.error(`Error finding resumes for user ${userId}: ${error.message}`);
    throw error;
  }
}

/**
 * Find a resume by ID and user ID
 * @param {string} id - The resume ID
 * @param {string} userId - The user ID (for authorization)
 * @returns {Promise<Object|null>} - Resume object or null if not found
 */
async function findById(id, userId) {
  try {
    const resume = await Resume.findOne({
      where: { id, userId }
    });
    return resume;
  } catch (error) {
    logger.error(`Error finding resume ${id}: ${error.message}`);
    throw error;
  }
}

/**
 * Create a new resume
 * @param {Object} resumeData - The resume data
 * @returns {Promise<Object>} - The created resume
 */
async function create(resumeData) {
  try {
    const resume = await Resume.create(resumeData);
    return resume;
  } catch (error) {
    logger.error(`Error creating resume: ${error.message}`);
    throw error;
  }
}

/**
 * Update a resume
 * @param {string} id - The resume ID
 * @param {string} userId - The user ID (for authorization)
 * @param {Object} updateData - The data to update
 * @returns {Promise<Object|null>} - Updated resume or null if not found
 */
async function update(id, userId, updateData) {
  try {
    const resume = await Resume.findOne({
      where: { id, userId }
    });
    
    if (!resume) return null;
    
    // Update fields
    Object.assign(resume, updateData);
    
    // Save changes
    await resume.save();
    
    return resume;
  } catch (error) {
    logger.error(`Error updating resume ${id}: ${error.message}`);
    throw error;
  }
}

/**
 * Delete a resume
 * @param {string} id - The resume ID
 * @param {string} userId - The user ID (for authorization)
 * @returns {Promise<boolean>} - Whether the resume was deleted
 */
async function remove(id, userId) {
  try {
    const resume = await Resume.findOne({
      where: { id, userId }
    });
    
    if (!resume) return false;
    
    await resume.destroy();
    return true;
  } catch (error) {
    logger.error(`Error deleting resume ${id}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  findByUser,
  findById,
  create,
  update,
  remove
};
