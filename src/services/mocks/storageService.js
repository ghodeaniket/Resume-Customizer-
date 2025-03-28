/**
 * Mock Storage Service
 * In-memory implementation of storage service for development
 */

const logger = require('../../utils/logger');

// Private in-memory storage (module-scoped, not global)
let mockStorage = new Map();

/**
 * Initialize the service
 */
function init() {
  // Clear any existing mock storage on initialization
  mockStorage = new Map();
  logger.info('Mock Storage Service initialized');
  
  // Add a warning banner to logs
  const warning = [
    '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    '!!                   MOCK MODE ACTIVE                      !!',
    '!!                                                         !!',
    '!! Storage Service is using IN-MEMORY MOCK IMPLEMENTATION  !!',
    '!! All files are stored in memory and will be lost on      !!',
    '!! server restart. This mode is for development only.      !!',
    '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
  ];
  
  warning.forEach(line => logger.warn(line));
}

/**
 * Test mock connection
 */
async function testConnection() {
  logger.info('Mock Storage Service connection test (always succeeds)');
  return { Buckets: [{ Name: 'mock-bucket' }] };
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
  
  const mockUrl = `https://mock-storage.example.com/${fileName}`;
  logger.info(`[MOCK] Upload: ${fileName} -> ${mockUrl}`);
  return mockUrl;
}

/**
 * Get file from mock storage
 * @param {string} fileName - Key of the file to retrieve
 */
async function getFile(fileName) {
  const file = mockStorage.get(fileName);
  if (!file) {
    const error = new Error(`[MOCK] File not found: ${fileName}`);
    logger.error(error);
    throw error;
  }
  
  logger.info(`[MOCK] Retrieved: ${fileName}`);
  return file.buffer;
}

/**
 * Delete file from mock storage
 * @param {string} fileName - Key of the file to delete
 */
async function deleteFile(fileName) {
  const deleted = mockStorage.delete(fileName);
  
  if (!deleted) {
    logger.warn(`[MOCK] File not found for deletion: ${fileName}`);
  } else {
    logger.info(`[MOCK] Deleted: ${fileName}`);
  }
  
  return deleted;
}

/**
 * Get statistics about mock storage
 */
function getStats() {
  return {
    fileCount: mockStorage.size,
    totalSize: Array.from(mockStorage.values())
      .reduce((sum, file) => sum + file.buffer.length, 0)
  };
}

/**
 * Clean up resources when service is destroyed
 */
function destroy() {
  const stats = getStats();
  logger.info(`Mock Storage Service destroyed. Cleared ${stats.fileCount} files (${stats.totalSize} bytes)`);
  mockStorage.clear();
}

module.exports = {
  init,
  testConnection,
  uploadFile,
  getFile,
  deleteFile,
  getStats,
  destroy
};
