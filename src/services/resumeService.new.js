/**
 * Resume Service
 * 
 * This service handles business logic related to resumes,
 * including creation, customization, and management.
 */

const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');
const convertPdfToMarkdown = require('../utils/convertPdfToMarkdown');

/**
 * Resume Service with dependency injection
 */
class ResumeService {
  /**
   * Create a new ResumeService instance
   * @param {Object} deps - Dependencies
   * @param {Object} deps.resumeRepository - Resume repository
   * @param {Object} deps.storageService - Storage service
   * @param {Object} deps.aiService - AI service
   * @param {Object} deps.queueService - Queue service
   */
  constructor({ resumeRepository, storageService, aiService, queueService }) {
    this.resumeRepository = resumeRepository;
    this.storageService = storageService;
    this.aiService = aiService;
    this.queueService = queueService;
    
    logger.info('ResumeService initialized with dependencies');
  }

  /**
   * Get all resumes for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - Array of resume objects
   */
  async getUserResumes(userId) {
    try {
      const resumes = await this.resumeRepository.findByUser(userId);
      
      return resumes.map(resume => ({
        id: resume.id,
        name: resume.name,
        description: resume.description,
        fileType: resume.fileType,
        fileSize: resume.fileSize,
        lastModified: resume.lastModified,
        isPublic: resume.isPublic,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt
      }));
    } catch (error) {
      logger.error('Get user resumes service error:', error);
      throw error;
    }
  }

  /**
   * Get resume by ID
   * @param {string} resumeId - The resume ID
   * @param {string} userId - The user ID
   * @returns {Promise<Object|null>} - Resume object or null if not found
   */
  async getResumeById(resumeId, userId) {
    try {
      const resume = await this.resumeRepository.findById(resumeId, userId);
      
      if (!resume) return null;
      
      return {
        id: resume.id,
        name: resume.name,
        description: resume.description,
        originalFileName: resume.originalFileName,
        s3Url: resume.s3Url,
        fileType: resume.fileType,
        fileSize: resume.fileSize,
        markdownContent: resume.markdownContent,
        isPublic: resume.isPublic,
        lastModified: resume.lastModified,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt
      };
    } catch (error) {
      logger.error('Get resume by ID service error:', error);
      throw error;
    }
  }

  /**
   * Create a new resume
   * @param {Object} resumeData - The resume data
   * @returns {Promise<Object>} - The created resume
   */
  async createResume(resumeData) {
    try {
      const { userId, name, description, file } = resumeData;
      
      // Generate unique filename
      const fileExtension = path.extname(file.originalname).toLowerCase();
      const fileName = `${userId}/${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
      
      // Determine file type
      let fileType;
      if (fileExtension === '.pdf') {
        fileType = 'pdf';
      } else if (fileExtension === '.doc') {
        fileType = 'doc';
      } else if (fileExtension === '.docx') {
        fileType = 'docx';
      } else {
        const error = new Error('Unsupported file type');
        error.statusCode = 400;
        throw error;
      }
      
      // Upload file to storage
      const s3Url = await this.storageService.uploadFile(
        file.buffer,
        fileName,
        file.mimetype
      );
      
      // Create resume record
      const resume = await this.resumeRepository.create({
        userId,
        name,
        description,
        originalFileName: file.originalname,
        s3Key: fileName,
        s3Url,
        fileType,
        fileSize: file.size,
        isPublic: false,
        lastModified: new Date()
      });
      
      return {
        id: resume.id,
        name: resume.name,
        description: resume.description,
        originalFileName: resume.originalFileName,
        s3Url: resume.s3Url,
        fileType: resume.fileType,
        fileSize: resume.fileSize,
        isPublic: resume.isPublic,
        lastModified: resume.lastModified,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt
      };
    } catch (error) {
      logger.error('Create resume service error:', error);
      throw error;
    }
  }

  /**
   * Update resume details
   * @param {string} resumeId - The resume ID
   * @param {string} userId - The user ID
   * @param {Object} updateData - The data to update
   * @returns {Promise<Object|null>} - Updated resume or null if not found
   */
  async updateResumeDetails(resumeId, userId, updateData) {
    try {
      const resume = await this.resumeRepository.update(resumeId, userId, {
        ...updateData,
        lastModified: new Date()
      });
      
      if (!resume) return null;
      
      return {
        id: resume.id,
        name: resume.name,
        description: resume.description,
        originalFileName: resume.originalFileName,
        s3Url: resume.s3Url,
        fileType: resume.fileType,
        fileSize: resume.fileSize,
        isPublic: resume.isPublic,
        lastModified: resume.lastModified,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt
      };
    } catch (error) {
      logger.error('Update resume details service error:', error);
      throw error;
    }
  }

  /**
   * Delete a resume
   * @param {string} resumeId - The resume ID
   * @param {string} userId - The user ID
   * @returns {Promise<boolean>} - Whether the resume was deleted
   */
  async deleteResume(resumeId, userId) {
    try {
      // Find resume
      const resume = await this.resumeRepository.findById(resumeId, userId);
      
      if (!resume) return false;
      
      // Delete file from storage
      await this.storageService.deleteFile(resume.s3Key);
      
      // Delete resume from database
      return await this.resumeRepository.remove(resumeId, userId);
    } catch (error) {
      logger.error('Delete resume service error:', error);
      throw error;
    }
  }

  /**
   * Convert resume to markdown
   * @param {string} resumeId - The resume ID
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} - Object with resume and markdown
   */
  async convertResumeToMarkdown(resumeId, userId) {
    try {
      // Find resume
      const resume = await this.resumeRepository.findById(resumeId, userId);
      
      if (!resume) return { resume: null, markdown: null };
      
      // Check if already converted
      if (resume.markdownContent) {
        return {
          resume: {
            id: resume.id,
            name: resume.name,
            fileType: resume.fileType
          },
          markdown: resume.markdownContent
        };
      }
      
      // Get file from storage
      const fileBuffer = await this.storageService.getFile(resume.s3Key);
      
      // Convert to markdown
      let markdown;
      if (resume.fileType === 'pdf') {
        markdown = await convertPdfToMarkdown(fileBuffer);
      } else {
        const error = new Error('File type not supported for conversion');
        error.statusCode = 400;
        throw error;
      }
      
      // Update resume with markdown content
      await this.resumeRepository.update(resumeId, userId, {
        markdownContent: markdown
      });
      
      return {
        resume: {
          id: resume.id,
          name: resume.name,
          fileType: resume.fileType
        },
        markdown
      };
    } catch (error) {
      logger.error('Convert to markdown service error:', error);
      throw error;
    }
  }

  // Rest of the methods follow the same pattern...
  // For brevity, I'm only showing a subset of the methods

  /**
   * Upload and customize resume in one step
   * @param {Object} data - The data
   * @returns {Promise<Object>} - Object with resume and job info
   */
  async uploadAndCustomize(data) {
    try {
      const { 
        userId, 
        name, 
        file, 
        jobDescription, 
        jobTitle, 
        companyName 
      } = data;
      
      // Validate file type
      const fileExtension = path.extname(file.originalname).toLowerCase();
      let fileType;
      
      if (fileExtension === '.pdf') {
        fileType = 'pdf';
      } else if (fileExtension === '.doc') {
        fileType = 'doc';
      } else if (fileExtension === '.docx') {
        fileType = 'docx';
      } else {
        const error = new Error('Unsupported file type. Only PDF, DOC, and DOCX files are allowed.');
        error.statusCode = 400;
        throw error;
      }
      
      // Generate unique filename
      const fileName = `${userId}/${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
      
      try {
        // Upload file to storage service
        const s3Url = await this.storageService.uploadFile(
          file.buffer,
          fileName,
          file.mimetype
        );
        
        // Create resume record with pending status
        const resume = await this.resumeRepository.create({
          userId,
          name: name || file.originalname,
          originalFileName: file.originalname,
          s3Key: fileName,
          s3Url,
          fileType,
          fileSize: file.size,
          isPublic: false,
          jobDescription,
          jobTitle,
          companyName,
          customizationStatus: 'pending',
          lastModified: new Date()
        });
        
        // Queue customization job
        const jobId = await this.queueResumeCustomization(resume.id);
        
        logger.info(`Resume ${resume.id} added to customization queue with job ID ${jobId}`);
        
        return {
          id: resume.id,
          name: resume.name,
          customizationStatus: resume.customizationStatus,
          jobId
        };
      } catch (uploadError) {
        logger.error(`Storage upload error: ${uploadError.message}`);
        
        // Create enhanced error with more context
        const error = new Error(`Failed to upload resume: ${uploadError.message}`);
        error.originalError = uploadError;
        error.statusCode = 500;
        throw error;
      }
    } catch (error) {
      logger.error(`Upload and customize service error: ${error.message}`, error);
      
      // Add status code if not present
      if (!error.statusCode) {
        error.statusCode = error.message.includes('Unsupported file type') ? 400 : 500;
      }
      
      throw error;
    }
  }

  /**
   * Queue resume customization job
   * @param {string} resumeId - The resume ID
   * @returns {Promise<string>} - The job ID
   */
  async queueResumeCustomization(resumeId) {
    try {
      const job = await this.queueService.addJob(
        'resume-customization',
        { resumeId },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000
          },
          removeOnComplete: true,
          removeOnFail: false
        }
      );
      
      logger.info(`Resume customization job ${job.id} added to queue for resume ${resumeId}`);
      
      return job.id;
    } catch (error) {
      logger.error(`Failed to queue resume customization for ${resumeId}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ResumeService;
