const Resume = require('../models/resume');
const { uploadFile, getFile, deleteFile } = require('../config/s3');
const convertPdfToMarkdown = require('../utils/convertPdfToMarkdown');
const logger = require('../utils/logger');
const path = require('path');
const crypto = require('crypto');

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
    
    // Upload file to S3
    const s3Url = await uploadFile(
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
    
    // Delete file from S3
    await deleteFile(resume.s3Key);
    
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
    
    // Get file from S3
    const fileBuffer = await getFile(resume.s3Key);
    
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