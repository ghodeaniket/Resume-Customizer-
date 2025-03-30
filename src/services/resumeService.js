/**
 * Resume Service
 * 
 * This service handles business logic related to resumes,
 * including creation, customization, and management.
 */

const Resume = require('../models/resume');
const logger = require('../utils/logger');
const convertPdfToMarkdown = require('../utils/convertPdfToMarkdown');
const { 
  getFileTypeFromExtension, 
  generateUniqueFilename,
  getContentTypeFromFileType
} = require('../utils/fileUtils');
const {
  mapToBasicResponse,
  mapToDetailedResponse,
  mapToCustomizationStatusResponse,
  mapToUploadAndCustomizeResponse
} = require('../utils/resumeMapper');
const services = require('./index');

/**
 * Get all resumes for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of resume objects
 */
exports.getUserResumes = async (userId) => {
  try {
    const resumes = await Resume.findAll({
      where: { userId },
      order: [['updatedAt', 'DESC']]
    });

    return resumes.map(resume => mapToBasicResponse(resume));
  } catch (error) {
    logger.error('Get user resumes service error:', error);
    throw error;
  }
};

/**
 * Get resume by ID
 * @param {string} resumeId - Resume ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Resume object or null if not found
 */
exports.getResumeById = async (resumeId, userId) => {
  try {
    const resume = await Resume.findOne({
      where: { id: resumeId, userId }
    });

    if (!resume) return null;

    return mapToDetailedResponse(resume);
  } catch (error) {
    logger.error('Get resume by ID service error:', error);
    throw error;
  }
};

/**
 * Create a new resume
 * @param {Object} resumeData - Resume data
 * @param {string} resumeData.userId - User ID
 * @param {string} resumeData.name - Resume name
 * @param {string} resumeData.description - Resume description
 * @param {Object} resumeData.file - File object
 * @returns {Promise<Object>} Created resume
 */
exports.createResume = async (resumeData) => {
  try {
    const { userId, name, description, file } = resumeData;
    
    // Validate and determine file type
    const { fileType } = getFileTypeFromExtension(file.originalname);
    
    // Generate unique filename
    const fileName = generateUniqueFilename(userId, file.originalname);
    
    // Get storage service
    const storageService = services.storage();
    
    // Upload file to storage
    const s3Url = await storageService.uploadFile(
      file.buffer,
      fileName,
      file.mimetype
    );
    
    // Create resume record
    const resume = await Resume.create({
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
    throw error;
  }
};

/**
 * Update resume details
 * @param {string} resumeId - Resume ID
 * @param {string} userId - User ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object|null>} Updated resume or null if not found
 */
exports.updateResumeDetails = async (resumeId, userId, updateData) => {
  try {
    // Find resume
    const resume = await Resume.findOne({
      where: { id: resumeId, userId }
    });
    
    if (!resume) return null;
    
    // Update resume
    if (updateData.name) resume.name = updateData.name;
    if (updateData.description !== undefined) resume.description = updateData.description;
    if (updateData.isPublic !== undefined) resume.isPublic = updateData.isPublic;
    
    resume.lastModified = new Date();
    await resume.save();
    
    return mapToDetailedResponse(resume);
  } catch (error) {
    logger.error('Update resume details service error:', error);
    throw error;
  }
};

/**
 * Delete a resume
 * @param {string} resumeId - Resume ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} Whether the resume was deleted
 */
exports.deleteResume = async (resumeId, userId) => {
  try {
    // Find resume
    const resume = await Resume.findOne({
      where: { id: resumeId, userId }
    });
    
    if (!resume) return false;
    
    // Get storage service
    const storageService = services.storage();
    
    // Delete file from storage
    await storageService.deleteFile(resume.s3Key);
    
    // Delete resume from database
    await resume.destroy();
    
    return true;
  } catch (error) {
    logger.error('Delete resume service error:', error);
    throw error;
  }
};

/**
 * Convert resume to markdown
 * @param {string} resumeId - Resume ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Object with resume and markdown
 */
exports.convertResumeToMarkdown = async (resumeId, userId) => {
  try {
    // Find resume
    const resume = await Resume.findOne({
      where: { id: resumeId, userId }
    });
    
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
    
    // Get storage service
    const storageService = services.storage();
    
    // Get file from storage
    const fileBuffer = await storageService.getFile(resume.s3Key);
    
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
    resume.markdownContent = markdown;
    await resume.save();
    
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
};

/**
 * Customize resume based on job description
 * @param {string} resumeId - Resume ID
 * @param {string} userId - User ID
 * @param {Object} customizationData - Customization data
 * @returns {Promise<Object|null>} Customized resume or null if not found
 */
exports.customizeResume = async (resumeId, userId, customizationData) => {
  try {
    const { jobDescription, jobTitle, companyName } = customizationData;
    
    // Find resume
    const resume = await Resume.findOne({
      where: { id: resumeId, userId }
    });
    
    if (!resume) return null;
    
    // Check if markdown content exists
    if (!resume.markdownContent) {
      // Convert to markdown first
      await this.convertResumeToMarkdown(resumeId, userId);
      
      // Refresh resume data
      await resume.reload();
    }
    
    // Update resume with new customization data
    resume.jobDescription = jobDescription;
    if (jobTitle) resume.jobTitle = jobTitle;
    if (companyName) resume.companyName = companyName;
    resume.customizationStatus = 'pending';
    resume.customizationError = null;
    resume.customizationCompletedAt = null;
    resume.lastModified = new Date();
    
    await resume.save();
    
    // Add job to queue
    const jobId = await this.queueResumeCustomization(resume.id);
    
    logger.info(`Resume ${resume.id} added to customization queue with job ID ${jobId}`);
    
    return mapToUploadAndCustomizeResponse(resume, jobId);
  } catch (error) {
    logger.error(`Customize resume service error: ${error.message}`);
    
    // Add status code if not present
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    
    throw error;
  }
};

/**
 * Update resume sharing settings
 * @param {string} resumeId - Resume ID
 * @param {string} userId - User ID
 * @param {boolean} isPublic - Whether the resume is public
 * @returns {Promise<Object|null>} Updated resume or null if not found
 */
exports.updateResumeSharing = async (resumeId, userId, isPublic) => {
  try {
    // Find resume
    const resume = await Resume.findOne({
      where: { id: resumeId, userId }
    });
    
    if (!resume) return null;
    
    // Update sharing status
    resume.isPublic = isPublic;
    await resume.save();
    
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
};

/**
 * Get public link for a shared resume
 * @param {string} resumeId - Resume ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Object with resume and public link
 */
exports.getResumePublicLink = async (resumeId, userId) => {
  try {
    // Find resume
    const resume = await Resume.findOne({
      where: { id: resumeId, userId }
    });
    
    if (!resume) return { resume: null, publicLink: null };
    
    // Generate public link
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
    const publicLink = `${baseUrl}/public/resumes/${resume.id}`;
    
    return {
      resume: {
        id: resume.id,
        name: resume.name,
        isPublic: resume.isPublic
      },
      publicLink: resume.isPublic ? publicLink : null
    };
  } catch (error) {
    logger.error('Get public link service error:', error);
    throw error;
  }
};

/**
 * Upload and customize resume in one step
 * @param {Object} data - Data
 * @returns {Promise<Object>} Object with resume and job info
 */
exports.uploadAndCustomize = async (data) => {
  try {
    const { 
      userId, 
      name, 
      file, 
      jobDescription, 
      jobTitle, 
      companyName 
    } = data;
    
    // Validate and determine file type
    const { fileType } = getFileTypeFromExtension(file.originalname);
    
    // Generate unique filename
    const fileName = generateUniqueFilename(userId, file.originalname);
    
    try {
      // Get the storage service
      const storageService = services.storage();
      
      // Upload file to storage service
      const s3Url = await storageService.uploadFile(
        file.buffer,
        fileName,
        file.mimetype
      );
      
      // Create resume record with pending status
      const resume = await Resume.create({
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
};

/**
 * Get customization status
 * @param {string} resumeId - Resume ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Status object
 */
exports.getCustomizationStatus = async (resumeId, userId) => {
  try {
    // Find resume in database
    const resume = await Resume.findOne({
      where: { id: resumeId, userId },
      attributes: [
        'id', 
        'name', 
        'customizationStatus', 
        'customizationError', 
        'customizationCompletedAt', 
        'customizedS3Url',
        'jobTitle',
        'companyName'
      ]
    });
    
    if (!resume) {
      const error = new Error('Resume not found');
      error.statusCode = 404;
      throw error;
    }
    
    return mapToCustomizationStatusResponse(resume, { includeDownloadUrl: true });
  } catch (error) {
    logger.error(`Get customization status error: ${error.message}`);
    
    // Add status code if not present
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    
    throw error;
  }
};

/**
 * Download resume (original or customized)
 * @param {string} resumeId - Resume ID 
 * @param {string} userId - User ID
 * @param {string} version - Version to download (original or customized)
 * @returns {Promise<Object>} Object with file data
 */
exports.downloadResume = async (resumeId, userId, version = 'customized') => {
  try {
    // Find resume
    const resume = await Resume.findOne({
      where: { id: resumeId, userId }
    });
    
    if (!resume) {
      const error = new Error('Resume not found');
      error.statusCode = 404;
      throw error;
    }
    
    // Get storage service
    const storageService = services.storage();
    
    // Determine which version to download and handle accordingly
    if (version === 'customized') {
      // Check if customized version is available
      if (resume.customizationStatus !== 'completed') {
        const error = new Error(`Cannot download customized resume: Status is ${resume.customizationStatus}`);
        error.statusCode = 400;
        error.resumeStatus = resume.customizationStatus;
        error.resumeError = resume.customizationError;
        throw error;
      }
      
      // Get file from storage
      try {
        const fileBuffer = await storageService.getFile(resume.customizedS3Key);
        
        return {
          resume,
          fileBuffer,
          contentType: 'application/pdf',
          fileName: `${resume.name}_customized.pdf`
        };
      } catch (storageError) {
        handleStorageError(storageError, 'customized');
      }
    } else {
      // Get original file from storage
      try {
        const fileBuffer = await storageService.getFile(resume.s3Key);
        
        return {
          resume,
          fileBuffer,
          contentType: getContentTypeFromFileType(resume.fileType),
          fileName: resume.originalFileName || `${resume.name}.${resume.fileType}`
        };
      } catch (storageError) {
        handleStorageError(storageError, 'original');
      }
    }
  } catch (error) {
    logger.error(`Download resume error: ${error.message}`);
    
    // Add status code if not present
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    
    throw error;
  }
};

/**
 * Helper function to handle storage errors
 * @param {Error} error - Storage error
 * @param {string} version - Version being downloaded
 */
function handleStorageError(error, version) {
  logger.error(`S3 download error for ${version} resume: ${error.message}`);
  const enhancedError = new Error(`Failed to download ${version} resume: ${error.message}`);
  enhancedError.statusCode = 500;
  enhancedError.originalError = error;
  throw enhancedError;
}

/**
 * Queue resume customization job
 * @param {string} resumeId - Resume ID
 * @returns {Promise<string>} Job ID
 */
exports.queueResumeCustomization = async (resumeId) => {
  try {
    // Get queue service
    const queueService = services.queue();
    
    // Use default job options from queueService
    const job = await queueService.addJob(
      'resume-customization',
      { resumeId }
    );
    
    logger.info(`Resume customization job ${job.id} added to queue for resume ${resumeId}`);
    
    return job.id;
  } catch (error) {
    logger.error(`Failed to queue resume customization for ${resumeId}: ${error.message}`);
    throw error;
  }
};