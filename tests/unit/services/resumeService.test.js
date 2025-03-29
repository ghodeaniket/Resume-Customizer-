/**
 * Unit Tests for Resume Service
 */

const ResumeService = require('../../../src/services/resumeService.js.new');
// path is not used in this file

// Mock dependencies
const mockResumeRepository = {
  findByUser: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn()
};

const mockStorageService = {
  uploadFile: jest.fn(),
  getFile: jest.fn(),
  deleteFile: jest.fn()
};

const mockAiService = {
  customizeResume: jest.fn()
};

const mockQueueService = {
  addJob: jest.fn()
};

// Sample test data
const sampleUserId = '123e4567-e89b-12d3-a456-426614174000';
const sampleResumeId = '123e4567-e89b-12d3-a456-426614174001';
const sampleResume = {
  id: sampleResumeId,
  userId: sampleUserId,
  name: 'Sample Resume',
  description: 'Sample Description',
  originalFileName: 'sample.pdf',
  s3Key: `${sampleUserId}/sample.pdf`,
  s3Url: 'https://example.com/sample.pdf',
  fileType: 'pdf',
  fileSize: 1024,
  isPublic: false,
  lastModified: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
};

// Create an instance of ResumeService with mocked dependencies
const resumeService = new ResumeService({
  resumeRepository: mockResumeRepository,
  storageService: mockStorageService,
  aiService: mockAiService,
  queueService: mockQueueService
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

describe('ResumeService', () => {
  describe('getUserResumes', () => {
    it('should return all resumes for a user', async () => {
      // Arrange
      mockResumeRepository.findByUser.mockResolvedValue([sampleResume]);
      
      // Act
      const result = await resumeService.getUserResumes(sampleUserId);
      
      // Assert
      expect(mockResumeRepository.findByUser).toHaveBeenCalledWith(sampleUserId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(sampleResumeId);
      expect(result[0].name).toBe('Sample Resume');
    });
    
    it('should handle errors when fetching resumes', async () => {
      // Arrange
      const error = new Error('Database error');
      mockResumeRepository.findByUser.mockRejectedValue(error);
      
      // Act & Assert
      await expect(resumeService.getUserResumes(sampleUserId)).rejects.toThrow(error);
      expect(mockResumeRepository.findByUser).toHaveBeenCalledWith(sampleUserId);
    });
  });
  
  describe('getResumeById', () => {
    it('should return a resume by ID', async () => {
      // Arrange
      mockResumeRepository.findById.mockResolvedValue(sampleResume);
      
      // Act
      const result = await resumeService.getResumeById(sampleResumeId, sampleUserId);
      
      // Assert
      expect(mockResumeRepository.findById).toHaveBeenCalledWith(sampleResumeId, sampleUserId);
      expect(result).toBeDefined();
      expect(result.id).toBe(sampleResumeId);
      expect(result.name).toBe('Sample Resume');
    });
    
    it('should return null if resume not found', async () => {
      // Arrange
      mockResumeRepository.findById.mockResolvedValue(null);
      
      // Act
      const result = await resumeService.getResumeById(sampleResumeId, sampleUserId);
      
      // Assert
      expect(mockResumeRepository.findById).toHaveBeenCalledWith(sampleResumeId, sampleUserId);
      expect(result).toBeNull();
    });
  });
  
  describe('createResume', () => {
    it('should create a new resume', async () => {
      // Arrange
      const file = {
        originalname: 'sample.pdf',
        buffer: Buffer.from('sample'),
        mimetype: 'application/pdf',
        size: 1024
      };
      
      mockStorageService.uploadFile.mockResolvedValue('https://example.com/sample.pdf');
      mockResumeRepository.create.mockResolvedValue(sampleResume);
      
      // Act
      const result = await resumeService.createResume({
        userId: sampleUserId,
        name: 'Sample Resume',
        description: 'Sample Description',
        file
      });
      
      // Assert
      expect(mockStorageService.uploadFile).toHaveBeenCalled();
      expect(mockResumeRepository.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe(sampleResumeId);
      expect(result.name).toBe('Sample Resume');
    });
    
    it('should handle unsupported file types', async () => {
      // Arrange
      const file = {
        originalname: 'sample.txt',
        buffer: Buffer.from('sample'),
        mimetype: 'text/plain',
        size: 1024
      };
      
      // Act & Assert
      await expect(resumeService.createResume({
        userId: sampleUserId,
        name: 'Sample Resume',
        description: 'Sample Description',
        file
      })).rejects.toThrow('Unsupported file type');
      
      expect(mockStorageService.uploadFile).not.toHaveBeenCalled();
      expect(mockResumeRepository.create).not.toHaveBeenCalled();
    });
  });
  
  // Additional tests for other methods...
});
