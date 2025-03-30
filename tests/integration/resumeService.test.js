/**
 * Integration Tests for Resume Service
 * 
 * These tests verify that the resume service works correctly
 * with its dependencies (repositories and other services).
 */

const { 
  setupBeforeAll, 
  setupBeforeEach, 
  teardownAfterAll,
  mockStorageService,
  mockQueueService
} = require('./setup');
const { getService, ServiceType } = require('../../src/services/serviceRegistry');
const User = require('../../src/models/user');
const Resume = require('../../src/models/resume');
const { NotFoundError, ValidationError } = require('../../src/utils/errors');

// Test file data
const testFile = {
  buffer: Buffer.from('test resume content'),
  originalname: 'resume.pdf',
  mimetype: 'application/pdf',
  size: 1024
};

describe('Resume Service Integration Tests', () => {
  let resumeService;
  let testUser;
  
  // Setup before all tests
  beforeAll(async () => {
    await setupBeforeAll();
    resumeService = getService(ServiceType.RESUME);
  });
  
  // Setup before each test
  beforeEach(async () => {
    await setupBeforeEach();
    
    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    });
  });
  
  // Teardown after all tests
  afterAll(async () => {
    await teardownAfterAll();
  });
  
  describe('createResume', () => {
    it('should create a resume and upload to storage', async () => {
      // Arrange
      const resumeData = {
        userId: testUser.id,
        name: 'Test Resume',
        description: 'Resume for testing',
        file: testFile
      };
      
      // Act
      const result = await resumeService.createResume(resumeData);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Resume');
      expect(result.description).toBe('Resume for testing');
      expect(result.fileType).toBe('pdf');
      
      // Verify storage service was called
      expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
        testFile.buffer,
        expect.any(String),
        testFile.mimetype
      );
      
      // Verify database has the resume
      const dbResume = await Resume.findByPk(result.id);
      expect(dbResume).not.toBeNull();
      expect(dbResume.userId).toBe(testUser.id);
    });
    
    it('should handle unsupported file types', async () => {
      // Arrange
      const resumeData = {
        userId: testUser.id,
        name: 'Invalid Resume',
        description: 'Resume with invalid format',
        file: {
          ...testFile,
          originalname: 'resume.xyz',
          mimetype: 'application/xyz'
        }
      };
      
      // Act & Assert
      await expect(resumeService.createResume(resumeData))
        .rejects.toThrow(expect.objectContaining({
          name: 'UnsupportedFileTypeError'
        }));
        
      // Verify storage service was not called
      expect(mockStorageService.uploadFile).not.toHaveBeenCalled();
    });
  });
  
  describe('getUserResumes', () => {
    it('should return user resumes', async () => {
      // Arrange
      await Resume.create({
        userId: testUser.id,
        name: 'Resume 1',
        originalFileName: 'resume1.pdf',
        s3Key: 'test-key-1',
        s3Url: 'https://test-bucket.s3.amazonaws.com/test-key-1',
        fileType: 'pdf',
        fileSize: 1024,
        isPublic: false
      });
      
      await Resume.create({
        userId: testUser.id,
        name: 'Resume 2',
        originalFileName: 'resume2.pdf',
        s3Key: 'test-key-2',
        s3Url: 'https://test-bucket.s3.amazonaws.com/test-key-2',
        fileType: 'pdf',
        fileSize: 2048,
        isPublic: true
      });
      
      // Act
      const resumes = await resumeService.getUserResumes(testUser.id);
      
      // Assert
      expect(resumes).toHaveLength(2);
      expect(resumes[0].name).toBe('Resume 2'); // Should be in reverse order by updatedAt
      expect(resumes[1].name).toBe('Resume 1');
    });
    
    it('should return empty array for user with no resumes', async () => {
      // Act
      const resumes = await resumeService.getUserResumes('non-existent-user-id');
      
      // Assert
      expect(resumes).toEqual([]);
    });
  });
  
  describe('customizeResume', () => {
    let testResume;
    
    beforeEach(async () => {
      // Create test resume
      testResume = await Resume.create({
        userId: testUser.id,
        name: 'Resume for Customization',
        originalFileName: 'resume.pdf',
        s3Key: 'test-key',
        s3Url: 'https://test-bucket.s3.amazonaws.com/test-key',
        fileType: 'pdf',
        fileSize: 1024,
        isPublic: false,
        markdownContent: '# Resume\n\nSkills: JavaScript, Node.js'
      });
    });
    
    it('should queue resume customization job', async () => {
      // Arrange
      const customizationData = {
        jobDescription: 'Looking for a Node.js developer',
        jobTitle: 'Backend Developer',
        companyName: 'Test Company'
      };
      
      // Act
      const result = await resumeService.customizeResume(
        testResume.id,
        testUser.id,
        customizationData
      );
      
      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.jobId).toBeDefined();
      
      // Verify queue service was called
      expect(mockQueueService.addJob).toHaveBeenCalledWith(
        'resume-customization',
        { resumeId: testResume.id }
      );
      
      // Verify database was updated
      const updatedResume = await Resume.findByPk(testResume.id);
      expect(updatedResume.customizationStatus).toBe('pending');
      expect(updatedResume.jobDescription).toBe(customizationData.jobDescription);
      expect(updatedResume.jobTitle).toBe(customizationData.jobTitle);
      expect(updatedResume.companyName).toBe(customizationData.companyName);
    });
    
    it('should require job description', async () => {
      // Arrange
      const customizationData = {
        jobTitle: 'Backend Developer',
        companyName: 'Test Company'
      };
      
      // Act & Assert
      await expect(resumeService.customizeResume(
        testResume.id,
        testUser.id,
        customizationData
      )).rejects.toThrow(ValidationError);
      
      // Verify queue service was not called
      expect(mockQueueService.addJob).not.toHaveBeenCalled();
    });
    
    it('should handle non-existent resume', async () => {
      // Arrange
      const customizationData = {
        jobDescription: 'Looking for a Node.js developer',
        jobTitle: 'Backend Developer',
        companyName: 'Test Company'
      };
      
      // Act & Assert
      await expect(resumeService.customizeResume(
        'non-existent-id',
        testUser.id,
        customizationData
      )).rejects.toThrow(NotFoundError);
      
      // Verify queue service was not called
      expect(mockQueueService.addJob).not.toHaveBeenCalled();
    });
  });
});
