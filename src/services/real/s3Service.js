/**
 * Real S3 Service Implementation
 */
const AWS = require('aws-sdk');
const logger = require('../../utils/logger');

class S3Service {
  constructor() {
    // Configure AWS SDK
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    // Create S3 service object
    this.s3 = new AWS.S3();
    this.bucketName = process.env.AWS_BUCKET_NAME;
    
    logger.info('Initialized Real S3 Service');
  }

  async testConnection() {
    try {
      const data = await this.s3.listBuckets().promise();
      logger.info('S3 connection has been established successfully.');
      return data;
    } catch (error) {
      logger.error('Unable to connect to S3:', error);
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
      return null;
    }
  }

  async uploadFile(fileBuffer, fileName, mimeType) {
    const params = {
      Bucket: this.bucketName,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType
    };

    try {
      const data = await this.s3.upload(params).promise();
      return data.Location;
    } catch (error) {
      logger.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  async getFile(fileName) {
    const params = {
      Bucket: this.bucketName,
      Key: fileName
    };

    try {
      const data = await this.s3.getObject(params).promise();
      return data.Body;
    } catch (error) {
      logger.error('Error getting file from S3:', error);
      throw error;
    }
  }

  async deleteFile(fileName) {
    const params = {
      Bucket: this.bucketName,
      Key: fileName
    };

    try {
      await this.s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      logger.error('Error deleting file from S3:', error);
      throw error;
    }
  }
}

// Create a singleton instance
const s3Service = new S3Service();

module.exports = s3Service;
