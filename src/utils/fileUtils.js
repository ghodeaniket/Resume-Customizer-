/**
 * File Utilities
 * 
 * This module provides utilities for working with files.
 */

const path = require('path');
const crypto = require('crypto');

/**
 * Determine file type from filename extension
 * @param {string} filename - Original filename
 * @returns {Object} Object containing file type info
 * @throws {Error} Error with statusCode 400 if file type is unsupported
 */
const getFileTypeFromExtension = (filename) => {
  const fileExtension = path.extname(filename).toLowerCase();
  
  if (fileExtension === '.pdf') {
    return { fileType: 'pdf', mimeType: 'application/pdf' };
  } else if (fileExtension === '.doc') {
    return { fileType: 'doc', mimeType: 'application/msword' };
  } else if (fileExtension === '.docx') {
    return { fileType: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }
  
  const error = new Error('Unsupported file type. Only PDF, DOC, and DOCX files are allowed.');
  error.statusCode = 400;
  throw error;
};

/**
 * Generate a unique filename for storage
 * @param {string} userId - User ID
 * @param {string} originalFilename - Original filename
 * @returns {string} Unique filename with path
 */
const generateUniqueFilename = (userId, originalFilename) => {
  const fileExtension = path.extname(originalFilename).toLowerCase();
  return `${userId}/${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
};

/**
 * Get content type from file type
 * @param {string} fileType - File type (pdf, doc, docx)
 * @returns {string} Content type
 */
const getContentTypeFromFileType = (fileType) => {
  switch (fileType) {
  case 'pdf':
    return 'application/pdf';
  case 'doc':
    return 'application/msword';
  case 'docx':
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  default:
    return 'application/octet-stream';
  }
};

module.exports = {
  getFileTypeFromExtension,
  generateUniqueFilename,
  getContentTypeFromFileType
};
