/**
 * Storage Service Implementation
 * Uses AWS S3 for real storage operations
 */

const AWS = require('aws-sdk');
const logger = require('../../utils/logger');
const { aws } = require('../../config/env');

let s3;

/**
 * Initialize the service
 */
function init() {
  // Configure AWS SDK
  AWS.config.update({
    accessKeyId: aws.accessKeyId,
    secretAccessKey: aws.secretAccessKey,
    region: aws.region
  });

  // Create S3 service object
  s3 = new AWS.S3();
  logger.info('S3 Storage Service initialized');
}

/**
 * Test connection to S3
 */
async function testConnection() {
  try {
    const result = await s3.listBuckets().promise();
    logger.info('S3 connection has been established successfully.');
    return result;
  } catch (error) {
    logger.error('Unable to connect to S3:', error);
    throw error;
  }
}

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File contents
 * @param {string} fileName - Key to store the file under
 * @param {string} mimeType - MIME type of the file
 */
async function uploadFile(fileBuffer, fileName, mimeType) {
  const params = {
    Bucket: aws.bucketName,
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
}

/**
 * Get file from S3
 * @param {string} fileName - Key of the file to retrieve
 */
async function getFile(fileName) {
  const params = {
    Bucket: aws.bucketName,
    Key: fileName
  };

  try {
    const data = await s3.getObject(params).promise();
    return data.Body;
  } catch (error) {
    logger.error('Error getting file from S3:', error);
    throw error;
  }
}

/**
 * Delete file from S3
 * @param {string} fileName - Key of the file to delete
 */
async function deleteFile(fileName) {
  const params = {
    Bucket: aws.bucketName,
    Key: fileName
  };

  try {
    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    logger.error('Error deleting file from S3:', error);
    throw error;
  }
}

/**
 * Clean up resources when service is destroyed
 */
function destroy() {
  logger.info('S3 Storage Service destroyed');
  // No specific cleanup needed for S3 client
}

module.exports = {
  init,
  testConnection,
  uploadFile,
  getFile,
  deleteFile,
  destroy
};
