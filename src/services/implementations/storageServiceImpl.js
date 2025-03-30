/**
 * Storage Service Implementation
 * 
 * This service provides file storage functionality using AWS S3 or compatible services
 */

const AWS = require('aws-sdk');
const logger = require('../../utils/logger');
const { FileError } = require('../../utils/errors');

/**
 * Storage Service with dependency injection
 */
class StorageService {
  /**
   * Create a new StorageService instance
   * @param {Object} config - Configuration object
   * @param {string} config.accessKeyId - AWS access key ID
   * @param {string} config.secretAccessKey - AWS secret access key
   * @param {string} config.region - AWS region
   * @param {string} config.bucketName - S3 bucket name
   * @param {string} config.endpoint - Custom endpoint (optional, for MinIO)
   * @param {boolean} config.forcePathStyle - Use path style URLs (optional, for MinIO)
   */
  constructor(config) {
    this.config = config;
    this.s3 = null;
    
    // Initialize the S3 client
    this.initialize();
    
    logger.info('StorageService initialized with dependencies');
  }

  /**
   * Initialize the S3 client
   * @private
   */
  initialize() {
    const awsConfig = {
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      region: this.config.region
    };
    
    // Check for custom endpoint (MinIO)
    if (this.config.endpoint) {
      awsConfig.endpoint = this.config.endpoint;
      awsConfig.s3ForcePathStyle = true;
      awsConfig.signatureVersion = 'v4';
      
      logger.info(`Using custom S3 endpoint: ${this.config.endpoint}`);
    }
    
    // Update AWS config
    AWS.config.update(awsConfig);

    // Create S3 service object
    this.s3 = new AWS.S3();
  }

  /**
   * Test connection to S3
   * @returns {Promise<Object>} S3 bucket list
   */
  async testConnection() {
    try {
      const result = await this.s3.listBuckets().promise();
      logger.info('S3 connection has been established successfully.');
      return result;
    } catch (error) {
      logger.error('Unable to connect to S3:', error);
      throw new FileError('Failed to connect to storage service', 'connection');
    }
  }

  /**
   * Upload file to S3
   * @param {Buffer} fileBuffer - File contents
   * @param {string} fileName - Key to store the file under
   * @param {string} mimeType - MIME type of the file
   * @returns {Promise<string>} URL of the uploaded file
   */
  async uploadFile(fileBuffer, fileName, mimeType) {
    const params = {
      Bucket: this.config.bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType
    };

    try {
      const data = await this.s3.upload(params).promise();
      return data.Location;
    } catch (error) {
      logger.error('Error uploading file to S3:', error);
      throw new FileError('Failed to upload file to storage', 'upload');
    }
  }

  /**
   * Get file from S3
   * @param {string} fileName - Key of the file to retrieve
   * @returns {Promise<Buffer>} File contents
   */
  async getFile(fileName) {
    const params = {
      Bucket: this.config.bucketName,
      Key: fileName
    };

    try {
      const data = await this.s3.getObject(params).promise();
      return data.Body;
    } catch (error) {
      logger.error('Error getting file from S3:', error);
      throw new FileError('Failed to retrieve file from storage', 'retrieval');
    }
  }

  /**
   * Delete file from S3
   * @param {string} fileName - Key of the file to delete
   * @returns {Promise<boolean>} Success indicator
   */
  async deleteFile(fileName) {
    const params = {
      Bucket: this.config.bucketName,
      Key: fileName
    };

    try {
      await this.s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      logger.error('Error deleting file from S3:', error);
      throw new FileError('Failed to delete file from storage', 'deletion');
    }
  }

  /**
   * Generate a presigned URL for direct upload
   * @param {string} fileName - Key for the file
   * @param {string} mimeType - MIME type of the file
   * @param {number} expiresIn - Expiry time in seconds (default: 300)
   * @returns {Promise<string>} Presigned URL
   */
  async getPresignedUploadUrl(fileName, mimeType, expiresIn = 300) {
    const params = {
      Bucket: this.config.bucketName,
      Key: fileName,
      ContentType: mimeType,
      Expires: expiresIn
    };

    try {
      const url = await this.s3.getSignedUrlPromise('putObject', params);
      return url;
    } catch (error) {
      logger.error('Error generating presigned URL:', error);
      throw new FileError('Failed to generate upload URL', 'presigned-url');
    }
  }

  /**
   * Generate a presigned URL for viewing/downloading
   * @param {string} fileName - Key for the file
   * @param {number} expiresIn - Expiry time in seconds (default: 3600)
   * @returns {Promise<string>} Presigned URL
   */
  async getPresignedDownloadUrl(fileName, expiresIn = 3600) {
    const params = {
      Bucket: this.config.bucketName,
      Key: fileName,
      Expires: expiresIn
    };

    try {
      const url = await this.s3.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      logger.error('Error generating presigned download URL:', error);
      throw new FileError('Failed to generate download URL', 'presigned-url');
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    logger.info('StorageService destroyed');
    // No explicit cleanup needed for S3 client
  }
}

module.exports = StorageService;
