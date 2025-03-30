/**
 * Integration tests for StorageService
 */

const StorageService = require('../../../src/services/implementations/storageServiceImpl');
const { FileError } = require('../../../src/utils/errors');
const AWS = require('aws-sdk');

// Mock the AWS S3 service
jest.mock('aws-sdk', () => {
  // Create a mock implementation of S3
  const mockS3 = {
    upload: jest.fn().mockReturnThis(),
    getObject: jest.fn().mockReturnThis(),
    deleteObject: jest.fn().mockReturnThis(),
    listBuckets: jest.fn().mockReturnThis(),
    getSignedUrlPromise: jest.fn(),
    promise: jest.fn()
  };
  
  return {
    S3: jest.fn(() => mockS3),
    config: {
      update: jest.fn()
    }
  };
});

describe('StorageService Integration Tests', () => {
  let storageService;
  let mockS3;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a new instance of StorageService with test configuration
    storageService = new StorageService({
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      region: 'us-east-1',
      bucketName: 'test-bucket'
    });
    
    // Get the mock S3 instance
    mockS3 = new AWS.S3();
  });
  
  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      // Setup mock
      mockS3.promise.mockResolvedValue({
        Buckets: [{ Name: 'test-bucket' }]
      });
      
      // Call the service
      const result = await storageService.testConnection();
      
      // Assertions
      expect(mockS3.listBuckets).toHaveBeenCalled();
      expect(result).toHaveProperty('Buckets');
      expect(result.Buckets[0].Name).toBe('test-bucket');
    });
    
    it('should throw FileError if connection fails', async () => {
      // Setup mock
      mockS3.promise.mockRejectedValue(new Error('Connection failed'));
      
      // Call the service and expect exception
      await expect(storageService.testConnection())
        .rejects.toThrow(FileError);
    });
  });
  
  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      // Setup mock
      mockS3.promise.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-file.pdf'
      });
      
      // Create test data
      const fileBuffer = Buffer.from('test file content');
      const fileName = 'test-file.pdf';
      const mimeType = 'application/pdf';
      
      // Call the service
      const result = await storageService.uploadFile(fileBuffer, fileName, mimeType);
      
      // Assertions
      expect(mockS3.upload).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: fileName,
        Body: fileBuffer,
        ContentType: mimeType
      });
      expect(result).toBe('https://test-bucket.s3.amazonaws.com/test-file.pdf');
    });
    
    it('should throw FileError if upload fails', async () => {
      // Setup mock
      mockS3.promise.mockRejectedValue(new Error('Upload failed'));
      
      // Create test data
      const fileBuffer = Buffer.from('test file content');
      const fileName = 'test-file.pdf';
      const mimeType = 'application/pdf';
      
      // Call the service and expect exception
      await expect(storageService.uploadFile(fileBuffer, fileName, mimeType))
        .rejects.toThrow(FileError);
    });
  });
  
  describe('getFile', () => {
    it('should get file successfully', async () => {
      // Setup mock
      const fileContent = Buffer.from('test file content');
      mockS3.promise.mockResolvedValue({
        Body: fileContent
      });
      
      // Call the service
      const result = await storageService.getFile('test-file.pdf');
      
      // Assertions
      expect(mockS3.getObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-file.pdf'
      });
      expect(result).toEqual(fileContent);
    });
    
    it('should throw FileError if getFile fails', async () => {
      // Setup mock
      mockS3.promise.mockRejectedValue(new Error('File not found'));
      
      // Call the service and expect exception
      await expect(storageService.getFile('nonexistent-file.pdf'))
        .rejects.toThrow(FileError);
    });
  });
  
  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      // Setup mock
      mockS3.promise.mockResolvedValue({});
      
      // Call the service
      const result = await storageService.deleteFile('test-file.pdf');
      
      // Assertions
      expect(mockS3.deleteObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-file.pdf'
      });
      expect(result).toBe(true);
    });
    
    it('should throw FileError if deleteFile fails', async () => {
      // Setup mock
      mockS3.promise.mockRejectedValue(new Error('Delete failed'));
      
      // Call the service and expect exception
      await expect(storageService.deleteFile('test-file.pdf'))
        .rejects.toThrow(FileError);
    });
  });
  
  describe('getPresignedUploadUrl', () => {
    it('should generate presigned upload URL', async () => {
      // Setup mock
      mockS3.getSignedUrlPromise.mockResolvedValue('https://test-bucket.s3.amazonaws.com/test-file.pdf?signed=123');
      
      // Call the service
      const result = await storageService.getPresignedUploadUrl('test-file.pdf', 'application/pdf');
      
      // Assertions
      expect(mockS3.getSignedUrlPromise).toHaveBeenCalledWith('putObject', {
        Bucket: 'test-bucket',
        Key: 'test-file.pdf',
        ContentType: 'application/pdf',
        Expires: 300 // default expiry
      });
      expect(result).toBe('https://test-bucket.s3.amazonaws.com/test-file.pdf?signed=123');
    });
    
    it('should throw FileError if URL generation fails', async () => {
      // Setup mock
      mockS3.getSignedUrlPromise.mockRejectedValue(new Error('Generation failed'));
      
      // Call the service and expect exception
      await expect(storageService.getPresignedUploadUrl('test-file.pdf', 'application/pdf'))
        .rejects.toThrow(FileError);
    });
  });
});
