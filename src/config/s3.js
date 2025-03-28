const AWS = require('aws-sdk');
const logger = require('../utils/logger');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// Create S3 service object
const s3 = new AWS.S3();

// Test S3 connection
const testConnection = async () => {
  try {
    await s3.listBuckets().promise();
    logger.info('S3 connection has been established successfully.');
  } catch (error) {
    logger.error('Unable to connect to S3:', error);
  }
};

// Upload file to S3
const uploadFile = async (fileBuffer, fileName, mimeType) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
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
const getFile = async (fileName) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
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
const deleteFile = async (fileName) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
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

module.exports = {
  s3,
  testConnection,
  uploadFile,
  getFile,
  deleteFile
};