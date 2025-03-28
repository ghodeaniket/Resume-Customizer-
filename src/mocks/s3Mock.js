/**
 * S3 Service Mock Implementation
 */
const logger = require('../utils/logger');

class S3MockService {
  constructor() {
    this.storage = new Map();
    logger.info('Initialized S3 Mock Service');
  }

  async testConnection() {
    logger.info('Mock S3 connection established successfully.');
    return { Buckets: [{ Name: 'mock-bucket' }] };
  }

  async uploadFile(fileBuffer, fileName, mimeType) {
    // Store the file in memory
    this.storage.set(fileName, {
      buffer: fileBuffer,
      mimeType,
      uploadedAt: new Date()
    });
    
    const mockUrl = `https://mock-s3-bucket.example.com/${fileName}`;
    logger.info(`Mock S3 upload: ${fileName} -> ${mockUrl}`);
    return mockUrl;
  }

  async getFile(fileName) {
    const file = this.storage.get(fileName);
    if (!file) {
      throw new Error(`Mock S3: File not found: ${fileName}`);
    }
    return file.buffer;
  }

  async deleteFile(fileName) {
    const deleted = this.storage.delete(fileName);
    if (!deleted) {
      logger.warn(`Mock S3: File not found for deletion: ${fileName}`);
    }
    return deleted;
  }
}

// Create a singleton instance
const s3Service = new S3MockService();

module.exports = s3Service;
