/**
 * Resume Service Implementation
 * 
 * This service handles business logic related to resumes,
 * including creation, customization, and management.
 */

const logger = require('../../utils/logger');
const convertPdfToMarkdown = require('../../utils/convertPdfToMarkdown');
const { generatePdfFromMarkdown } = require('../../utils/pdfGenerator');
const { 
  getFileTypeFromExtension, 
  generateUniqueFilename,
  getContentTypeFromFileType
} = require('../../utils/fileUtils');
const {
  mapToBasicResponse,
  mapToDetailedResponse,
  mapToCustomizationStatusResponse,
  mapToUploadAndCustomizeResponse
} = require('../../utils/resumeMapper');
const {
  NotFoundError,
  ValidationError,
  FileError,
  UnsupportedFileTypeError
} = require('../../utils/errors');

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
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of resume objects
   */
  async getUserResumes(userId) {
    try {
      const resumes = await this.resumeRepository.findByUser(userId);
      return resumes.map(resume => mapToBasicResponse(resume));
    } catch (error) {
      logger.error('Get user resumes service error:', error);
      throw error;
    }
  }

  /**
   * Get resume by ID
   * @param {string} resumeId - Resume ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Resume object or null if not found
   */
  async getResumeById(resumeId, userId) {
    try {
      const resume = await this.resumeRepository.findById(resumeId, userId);
      
      if (!resume) {
        return null;
      }
      
      return mapToDetailedResponse(resume);
    } catch (error) {
      logger.error('Get resume by ID service error:', error);
      throw error;
    }
  }

  /**
   * Create a new resume
   * @param {Object} resumeData - Resume data
   * @param {string} resumeData.userId - User ID
   * @param {string} resumeData.name - Resume name
   * @param {string} resumeData.description - Resume description
   * @param {Object} resumeData.file - File object
   * @returns {Promise<Object>} Created resume
   */
  async createResume(resumeData) {
    try {
      const { userId, name, description, file } = resumeData;
      
      // Validate and determine file type
      const { fileType } = getFileTypeFromExtension(file.originalname);
      
      // Generate unique filename
      const fileName = generateUniqueFilename(userId, file.originalname);
      
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
      
      return mapToDetailedResponse(resume);
    } catch (error) {
      logger.error('Create resume service error:', error);
      
      // Convert to appropriate error type
      if (error.message && error.message.includes('Unsupported file type')) {
        throw new UnsupportedFileTypeError(error.message);
      }
      
      throw error;
    }
  }

  /**
   * Update resume details
   * @param {string} resumeId - Resume ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object|null>} Updated resume or null if not found
   */
  async updateResumeDetails(resumeId, userId, updateData) {
    try {
      const resume = await this.resumeRepository.update(resumeId, userId, {
        ...updateData,
        lastModified: new Date()
      });
      
      if (!resume) {
        return null;
      }
      
      return mapToDetailedResponse(resume);
    } catch (error) {
      logger.error('Update resume details service error:', error);
      throw error;
    }
  }

  /**
   * Delete a resume
   * @param {string} resumeId - Resume ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Whether the resume was deleted
   */
  async deleteResume(resumeId, userId) {
    try {
      // Find resume
      const resume = await this.resumeRepository.findById(resumeId, userId);
      
      if (!resume) {
        return false;
      }
      
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
   * @param {string} resumeId - Resume ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Object with resume and markdown
   */
  async convertResumeToMarkdown(resumeId, userId) {
    try {
      // Find resume
      const resume = await this.resumeRepository.findById(resumeId, userId);
      
      if (!resume) {
        return { resume: null, markdown: null };
      }
      
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
        throw new UnsupportedFileTypeError('File type not supported for conversion', resume.fileType);
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

  /**
   * Customize resume based on job description
   * @param {string} resumeId - Resume ID
   * @param {string} userId - User ID
   * @param {Object} customizationData - Customization data
   * @returns {Promise<Object|null>} Customized resume or null if not found
   */
  async customizeResume(resumeId, userId, customizationData) {
    try {
      const { jobDescription, jobTitle, companyName } = customizationData;
      
      if (!jobDescription) {
        throw new ValidationError('Job description is required');
      }
      
      // Find resume
      const resume = await this.resumeRepository.findById(resumeId, userId);
      
      if (!resume) {
        throw new NotFoundError('Resume not found', 'resume');
      }
      
      // Check if markdown content exists
      if (!resume.markdownContent) {
        // Convert to markdown first
        await this.convertResumeToMarkdown(resumeId, userId);
        
        // Refresh resume data
        const updatedResume = await this.resumeRepository.findById(resumeId, userId);
        if (!updatedResume) {
          throw new NotFoundError('Resume not found after conversion', 'resume');
        }
        
        // Update local resume reference
        Object.assign(resume, updatedResume);
      }
      
      // Update resume with new customization data
      const updatedResume = await this.resumeRepository.update(resumeId, userId, {
        jobDescription,
        jobTitle,
        companyName,
        customizationStatus: 'pending',
        customizationError: null,
        customizationCompletedAt: null,
        lastModified: new Date()
      });
      
      // Queue customization job
      const jobId = await this.queueResumeCustomization(resume.id);
      
      logger.info(`Resume ${resume.id} added to customization queue with job ID ${jobId}`);
      
      return mapToUploadAndCustomizeResponse(updatedResume, jobId);
    } catch (error) {
      logger.error(`Customize resume service error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update resume sharing settings
   * @param {string} resumeId - Resume ID
   * @param {string} userId - User ID
   * @param {boolean} isPublic - Whether the resume is public
   * @returns {Promise<Object|null>} Updated resume or null if not found
   */
  async updateResumeSharing(resumeId, userId, isPublic) {
    try {
      if (isPublic === undefined) {
        throw new ValidationError('isPublic value is required');
      }
      
      const resume = await this.resumeRepository.update(resumeId, userId, {
        isPublic,
        lastModified: new Date()
      });
      
      if (!resume) {
        return null;
      }
      
      return {
        id: resume.id,
        name: resume.name,
        isPublic: resume.isPublic,
        updatedAt: resume.updatedAt
      };
    } catch (error) {
      logger.error('Update resume sharing service error:', error);
      throw error;
    }
  }

  /**
   * Get public link for a shared resume
   * @param {string} resumeId - Resume ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Object with resume and public link
   */
  async getResumePublicLink(resumeId, userId) {
    try {
      // Find resume
      const resume = await this.resumeRepository.findById(resumeId, userId);
      
      if (!resume) {
        return { resume: null, publicLink: null };
      }
      
      // Generate public link only if resume is public
      const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
      const publicLink = resume.isPublic ? `${baseUrl}/public/resumes/${resume.id}` : null;
      
      return {
        resume: {
          id: resume.id,
          name: resume.name,
          isPublic: resume.isPublic
        },
        publicLink
      };
    } catch (error) {
      logger.error('Get public link service error:', error);
      throw error;
    }
  }

  /**
   * Upload and customize resume in one step
   * @param {Object} data - Upload and customize data
   * @returns {Promise<Object>} Object with resume and job info
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
      
      if (!jobDescription) {
        throw new ValidationError('Job description is required');
      }
      
      if (!file) {
        throw new ValidationError('Resume file is required');
      }
      
      // Validate and determine file type
      const { fileType } = getFileTypeFromExtension(file.originalname);
      
      // Generate unique filename
      const fileName = generateUniqueFilename(userId, file.originalname);
      
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
        
        return mapToUploadAndCustomizeResponse(resume, jobId);
      } catch (uploadError) {
        logger.error(`Storage upload error: ${uploadError.message}`);
        
        // Create enhanced error with more context
        throw new FileError(`Failed to upload resume: ${uploadError.message}`, 'upload');
      }
    } catch (error) {
      logger.error(`Upload and customize service error: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get customization status
   * @param {string} resumeId - Resume ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Status object
   */
  async getCustomizationStatus(resumeId, userId) {
    try {
      // Find resume in database
      const resume = await this.resumeRepository.findById(resumeId, userId);
      
      if (!resume) {
        throw new NotFoundError('Resume not found', 'resume');
      }
      
      return mapToCustomizationStatusResponse(resume, { includeDownloadUrl: true });
    } catch (error) {
      logger.error(`Get customization status error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download resume (original or customized)
   * @param {string} resumeId - Resume ID
   * @param {string} userId - User ID
   * @param {string} version - Version to download (original or customized)
   * @returns {Promise<Object>} Object with file data
   */
  async downloadResume(resumeId, userId, version = 'customized') {
    try {
      // Find resume
      const resume = await this.resumeRepository.findById(resumeId, userId);
      
      if (!resume) {
        throw new NotFoundError('Resume not found', 'resume');
      }
      
      // Get storage service
      
      // Determine which version to download and handle accordingly
      if (version === 'customized') {
        // Check if customized version is available
        if (resume.customizationStatus !== 'completed') {
          const error = new ValidationError(`Cannot download customized resume: Status is ${resume.customizationStatus}`);
          error.resumeStatus = resume.customizationStatus;
          error.resumeError = resume.customizationError;
          throw error;
        }
        
        // Get file from storage
        try {
          const fileBuffer = await this.storageService.getFile(resume.customizedS3Key);
          
          return {
            resume,
            fileBuffer,
            contentType: 'application/pdf',
            fileName: `${resume.name}_customized.pdf`
          };
        } catch (storageError) {
          this.handleStorageError(storageError, 'customized');
        }
      } else {
        // Get original file from storage
        try {
          const fileBuffer = await this.storageService.getFile(resume.s3Key);
          
          return {
            resume,
            fileBuffer,
            contentType: getContentTypeFromFileType(resume.fileType),
            fileName: resume.originalFileName || `${resume.name}.${resume.fileType}`
          };
        } catch (storageError) {
          this.handleStorageError(storageError, 'original');
        }
      }
    } catch (error) {
      logger.error(`Download resume error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Helper method to handle storage errors
   * @param {Error} error - Storage error
   * @param {string} version - Version being downloaded
   */
  handleStorageError(error, version) {
    logger.error(`S3 download error for ${version} resume: ${error.message}`);
    throw new FileError(`Failed to download ${version} resume: ${error.message}`, 'download');
  }

  /**
   * Queue resume customization job
   * @param {string} resumeId - Resume ID
   * @returns {Promise<string>} Job ID
   */
  async queueResumeCustomization(resumeId) {
    try {
      const job = await this.queueService.addJob(
        'resume-customization',
        { resumeId }
      );
      
      logger.info(`Resume customization job ${job.id} added to queue for resume ${resumeId}`);
      
      return job.id;
    } catch (error) {
      logger.error(`Failed to queue resume customization for ${resumeId}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Process resume customization job (used by worker)
   * @param {Object} job - Job object
   * @returns {Promise<Object>} Result of processing
   */
  async processCustomizationJob(job) {
    const { resumeId } = job.data;
    logger.info(`Processing resume customization job ${job.id} for resume ${resumeId}`);
    
    try {
      // Find resume
      const resume = await this.resumeRepository.findById(resumeId);
      
      if (!resume) {
        throw new NotFoundError(`Resume not found: ${resumeId}`, 'resume');
      }
      
      // Update status to processing
      await this.resumeRepository.updateStatus(resumeId, 'processing');
      
      // Step 1: Convert to markdown if needed
      if (!resume.markdownContent) {
        logger.info(`Converting resume ${resumeId} to markdown`);
        
        // For PDF files
        if (resume.fileType === 'pdf') {
          // Get file from storage
          const fileBuffer = await this.storageService.getFile(resume.s3Key);
          
          // Convert to markdown
          const markdown = await convertPdfToMarkdown(fileBuffer);
          
          // Update resume with markdown content
          await this.resumeRepository.update(resumeId, resume.userId, {
            markdownContent: markdown
          });
          
          // Update local reference
          resume.markdownContent = markdown;
        } else {
          // For now, only PDF is supported for conversion
          throw new UnsupportedFileTypeError('File type not supported for conversion. Only PDF files can be customized.', resume.fileType);
        }
      }
      
      // Step 2: Call AI service for customization
      logger.info(`Sending resume ${resumeId} for AI customization`);
      const aiResponse = await this.aiService.customizeResume({
        resumeContent: resume.markdownContent,
        jobDescription: resume.jobDescription,
        jobTitle: resume.jobTitle || '',
        companyName: resume.companyName || ''
      });
      
      // Step 3: Store customized content
      logger.info(`Storing customized content for resume ${resumeId}`);
      
      // Extract resume content from AI response
      const resumeContent = aiResponse.resume;
      
      // Check if response is valid
      if (!resumeContent || resumeContent.trim() === '') {
        throw new Error('Empty content received from AI service');
      }
      
      // For debugging: Log a portion of the content
      logger.info(`Extracted resume content (first 100 chars): ${resumeContent.substring(0, 100)}...`);
      
      // Update resume with customized content
      await this.resumeRepository.update(resumeId, resume.userId, {
        customizedContent: resumeContent
      });
      
      // Step 4: Generate PDF from customized content
      logger.info(`Generating PDF for customized resume ${resumeId}`);
      const pdfBuffer = await generatePdfFromMarkdown(resumeContent);
      
      // Step 5: Upload customized PDF to storage
      logger.info(`Uploading customized PDF for resume ${resumeId}`);
      const customizedFileName = generateUniqueFilename(resume.userId, 'customized.pdf');
      const customizedS3Url = await this.storageService.uploadFile(
        pdfBuffer,
        customizedFileName,
        'application/pdf'
      );
      
      // Step 6: Update resume with customized PDF location
      await this.resumeRepository.updateStatus(resumeId, 'completed', {
        customizedS3Key: customizedFileName,
        customizedS3Url,
        customizationCompletedAt: new Date()
      });
      
      logger.info(`Resume customization job ${job.id} completed successfully`);
      
      return {
        resumeId,
        status: 'completed',
        customizedS3Url
      };
    } catch (error) {
      logger.error(`Resume customization job ${job.id} failed: ${error.message}`);
      
      try {
        // Update resume status to failed
        await this.resumeRepository.updateStatus(resumeId, 'failed', {
          customizationError: error.message
        });
      } catch (updateError) {
        logger.error(`Failed to update resume status: ${updateError.message}`);
      }
      
      // Rethrow error to mark job as failed
      throw error;
    }
  }
}

module.exports = ResumeService;
