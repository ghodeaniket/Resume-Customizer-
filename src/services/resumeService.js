const Resume = require('../models/resume');
const logger = require('../utils/logger');
const convertPdfToMarkdown = require('../utils/convertPdfToMarkdown');
const path = require('path');
const crypto = require('crypto');
const services = require('./index');

/**
 * Get all resumes for a user
 */
exports.getUserResumes = async (userId) => {
  try {
    const resumes = await Resume.findAll({
      where: { userId },
      order: [['updatedAt', 'DESC']]
    });

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
};

/**
 * Get resume by ID
 */
exports.getResumeById = async (resumeId, userId) => {
  try {
    const resume = await Resume.findOne({
      where: { id: resumeId, userId }
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
};

/**
 * Create a new resume
 */
exports.createResume = async (resumeData) => {
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
};

/**
 * Update resume details
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
};

/**
 * Delete a resume
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
 */
exports.customizeResume = async (resumeId, userId, customizationData) => {
  try {
    const { _jobDescription, jobTitle, companyName } = customizationData;
    
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
    
    // TODO: Implement the actual customization logic
    // This would typically use an AI service or other algorithm
    // For now, just return the original resume
    
    return {
      id: resume.id,
      name: resume.name,
      description: resume.description,
      jobTitle,
      companyName,
      customized: true,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt
    };
  } catch (error) {
    logger.error('Customize resume service error:', error);
    throw error;
  }
};

/**
 * Update resume sharing settings
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
 * Customize an existing resume with a new job description
 */
exports.customizeExistingResume = async (resumeId, userId, customizationData) => {
  try {
    const { jobDescription, jobTitle, companyName } = customizationData;
    
    // Find resume
    const resume = await Resume.findOne({
      where: { id: resumeId, userId }
    });
    
    if (!resume) {
      const error = new Error('Resume not found');
      error.statusCode = 404;
      throw error;
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
    
    // Import worker module and add job to queue
    const { queueResumeCustomization } = require('../workers/resumeWorker');
    const jobId = await queueResumeCustomization(resume.id);
    
    logger.info(`Existing resume ${resume.id} added to customization queue with job ID ${jobId}`);
    
    return {
      id: resume.id,
      name: resume.name,
      customizationStatus: resume.customizationStatus,
      jobId
    };
  } catch (error) {
    logger.error(`Customize existing resume service error: ${error.message}`);
    
    // Add status code if not present
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    
    throw error;
  }
};

/**
 * Upload and customize resume in one step
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
    
    // Get the storage service
    const storageService = services.storage();
    
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
      
      // Import worker module and add job to queue
      const { queueResumeCustomization } = require('../workers/resumeWorker');
      const jobId = await queueResumeCustomization(resume.id);
      
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
};

/**
 * Get customization status
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
    
    // Calculate progress percentage based on status
    let progress = 0;
    switch (resume.customizationStatus) {
    case 'pending':
      progress = 10;
      break;
    case 'processing':
      progress = 50;
      break;
    case 'completed':
      progress = 100;
      break;
    case 'failed':
      progress = 0;
      break;
    }
    
    return {
      id: resume.id,
      name: resume.name,
      status: resume.customizationStatus,
      progress,
      error: resume.customizationError,
      completedAt: resume.customizationCompletedAt,
      jobTitle: resume.jobTitle,
      companyName: resume.companyName,
      canDownload: resume.customizationStatus === 'completed',
      downloadUrl: resume.customizationStatus === 'completed' ? 
        `/api/v1/resumes/${resume.id}/download?version=customized` : null
    };
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
    
    // Determine which version to download
    if (version === 'customized') {
      // Check if customized version is available
      if (resume.customizationStatus !== 'completed') {
        const error = new Error(`Cannot download customized resume: Status is ${resume.customizationStatus}`);
        error.statusCode = 400;
        error.resumeStatus = resume.customizationStatus;
        error.resumeError = resume.customizationError;
        throw error;
      }
      
      // Get file from S3 (standardized for both original and customized)
      try {
        // Get storage service
        const storageService = services.storage();
        
        // Get file from storage
        const fileBuffer = await storageService.getFile(resume.customizedS3Key);
        
        return {
          resume,
          fileBuffer,
          contentType: 'application/pdf',
          fileName: `${resume.name}_customized.pdf`
        };
      } catch (s3Error) {
        logger.error(`S3 download error for customized resume: ${s3Error.message}`);
        const error = new Error(`Failed to download customized resume: ${s3Error.message}`);
        error.statusCode = 500;
        error.originalError = s3Error;
        throw error;
      }
    } else {
      // Get original file from S3
      try {
        // Get storage service
        const storageService = services.storage();
        
        // Get file from storage
        const fileBuffer = await storageService.getFile(resume.s3Key);
        
        return {
          resume,
          fileBuffer,
          contentType: resume.fileType === 'pdf' ? 'application/pdf' : 
            resume.fileType === 'doc' ? 'application/msword' : 
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          fileName: resume.originalFileName || `${resume.name}.${resume.fileType}`
        };
      } catch (s3Error) {
        logger.error(`S3 download error for original resume: ${s3Error.message}`);
        const error = new Error(`Failed to download original resume: ${s3Error.message}`);
        error.statusCode = 500;
        error.originalError = s3Error;
        throw error;
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