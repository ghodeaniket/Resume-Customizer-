const AWS = require('aws-sdk');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Check if we're in mock mode for development
const useMockS3 = process.env.NODE_ENV === 'development' && process.env.MOCK_SERVICES === 'true';

// Create mock S3 service for development
const createMockS3 = () => {
  const mockStorage = new Map();
  
  return {
    mockStorage,
    testConnection: async () => {
      logger.info('Mock S3 connection established successfully.');
      return { Buckets: [{ Name: 'mock-bucket' }] };
    },
    uploadFile: async (fileBuffer, fileName, mimeType) => {
      // Store the file in memory
      mockStorage.set(fileName, {
        buffer: fileBuffer,
        mimeType,
        uploadedAt: new Date()
      });
      
      const mockUrl = `https://mock-s3-bucket.example.com/${fileName}`;
      logger.info(`Mock S3 upload: ${fileName} -> ${mockUrl}`);
      return mockUrl;
    },
    getFile: async (fileName) => {
      const file = mockStorage.get(fileName);
      if (!file) {
        throw new Error(`Mock S3: File not found: ${fileName}`);
      }
      return file.buffer;
    },
    deleteFile: async (fileName) => {
      const deleted = mockStorage.delete(fileName);
      if (!deleted) {
        logger.warn(`Mock S3: File not found for deletion: ${fileName}`);
      }
      return deleted;
    }
  };
};

// Initialize real or mock S3 based on environment
let s3, uploadFile, getFile, deleteFile, testConnection;

if (useMockS3) {
  logger.info('Using mock S3 service');
  const mockS3 = createMockS3();
  s3 = null;
  testConnection = mockS3.testConnection;
  uploadFile = mockS3.uploadFile;
  getFile = mockS3.getFile;
  deleteFile = mockS3.deleteFile;
} else {
  // Configure AWS SDK
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1'
  });

  // Create S3 service object
  s3 = new AWS.S3();

  // Test S3 connection
  testConnection = async () => {
    try {
      await s3.listBuckets().promise();
      logger.info('S3 connection has been established successfully.');
    } catch (error) {
      logger.error('Unable to connect to S3:', error);
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  };

  // Upload file to S3
  uploadFile = async (fileBuffer, fileName, mimeType) => {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType
    };

    try {
      const data = await s3.upload(params).promise();
      return data.Location;
    } catch (error) {
      logger.error('Error uploading file to S3:', error);
      throw error;
    }
  };

  // Get file from S3
  getFile = async (fileName) => {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName
    };

    try {
      const data = await s3.getObject(params).promise();
      return data.Body;
    } catch (error) {
      logger.error('Error getting file from S3:', error);
      throw error;
    }
  };

  // Delete file from S3
  deleteFile = async (fileName) => {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName
    };

    try {
      await s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      logger.error('Error deleting file from S3:', error);
      throw error;
    }
  };
}

module.exports = {
  s3,
  testConnection,
  uploadFile,
  getFile,
  deleteFile
};