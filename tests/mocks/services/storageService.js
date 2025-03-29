/**
 * Mock Storage Service for Testing
 * In-memory implementation of storage service for tests
 */

const logger = require('../../../src/utils/logger');

// Private in-memory storage (module-scoped)
let mockStorage = new Map();

/**
 * Initialize the service
 */
function init() {
  // Clear any existing mock storage on initialization
  mockStorage = new Map();
  logger.info('Test Mock Storage Service initialized');
}

/**
 * Test mock connection
 */
async function testConnection() {
  return { Buckets: [{ Name: 'test-mock-bucket' }] };
}

/**
 * Upload file to mock storage
 * @param {Buffer} fileBuffer - File contents
 * @param {string} fileName - Key to store the file under
 * @param {string} mimeType - MIME type of the file
 */
async function uploadFile(fileBuffer, fileName, mimeType) {
  // Store the file in memory
  mockStorage.set(fileName, {
    buffer: fileBuffer,
    mimeType,
    uploadedAt: new Date()
  });
  
  const mockUrl = `https://test-storage.example.com/${fileName}`;
  return mockUrl;
}

/**
 * Get file from mock storage
 * @param {string} fileName - Key of the file to retrieve
 */
async function getFile(fileName) {
  const file = mockStorage.get(fileName);
  if (!file) {
    throw new Error(`Test mock file not found: ${fileName}`);
  }
  
  return file.buffer;
}

/**
 * Delete file from mock storage
 * @param {string} fileName - Key of the file to delete
 */
async function deleteFile(fileName) {
  const deleted = mockStorage.delete(fileName);
  return deleted;
}

/**
 * Clean up resources when service is destroyed
 */
function destroy() {
  mockStorage.clear();
}

module.exports = {
  init,
  testConnection,
  uploadFile,
  getFile,
  deleteFile,
  destroy
};