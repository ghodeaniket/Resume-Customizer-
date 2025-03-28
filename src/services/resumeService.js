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
      throw new Error('Unsupported file type. Only PDF, DOC, and DOCX files are allowed.');
    }
    
    // Upload file to S3
    const s3Url = await uploadFile(
      file.buffer,
      fileName,
      file.mimetype
    );
    
    // Create resume record with processing status
    const resume = await Resume.create({
      userId,
      name,
      originalFileName: file.originalname,
      s3Key: fileName,
      s3Url,
      fileType,
      fileSize: file.size,
      isPublic: false,
      jobDescription,
      jobTitle,
      companyName,
      customizationStatus: 'processing',
      lastModified: new Date()
    });
    
    // Start asynchronous processing (using a queue system would be better)
    this.processResumeCustomization(resume)
      .catch(error => {
        logger.error(`Resume customization failed for ${resume.id}:`, error);
        // Update status to failed
        resume.customizationStatus = 'failed';
        resume.customizationError = error.message;
        resume.save();
      });
    
    return {
      id: resume.id,
      name: resume.name,
      customizationStatus: resume.customizationStatus
    };
  } catch (error) {
    logger.error('Upload and customize service error:', error);
    throw error;
  }
};

/**
 * Process resume customization asynchronously
 */
exports.processResumeCustomization = async (resume) => {
  try {
    // Convert to markdown if needed
    if (!resume.markdownContent) {
      // For PDF files
      if (resume.fileType === 'pdf') {
        // Get file from S3
        const fileBuffer = await getFile(resume.s3Key);
        
        // Convert to markdown
        const markdown = await convertPdfToMarkdown(fileBuffer);
        
        // Update resume with markdown content
        resume.markdownContent = markdown;
        await resume.save();
      } else {
        // For now, only PDF is supported for conversion
        throw new Error('File type not supported for conversion. Only PDF files can be customized.');
      }
    }
    
    // Call n8n webhook
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook';
    const axios = require('axios');
    
    const n8nResponse = await axios.post(
      `${n8nWebhookUrl}/customize-resume-ai`, 
      {
        resumeContent: resume.markdownContent,
        jobDescription: resume.jobDescription,
        jobTitle: resume.jobTitle || '',
        companyName: resume.companyName || ''
      }
    );
    
    // Store customized content
    resume.customizedContent = n8nResponse.data.resume;
    resume.customizationStatus = 'completed';
    resume.customizationCompletedAt = new Date();
    
    // Generate PDF from customized content (this would require a PDF generation library)
    // For now, we're just saving the markdown content
    // In a real implementation, you would:
    // 1. Convert the markdown to PDF
    // 2. Upload the PDF to S3
    // 3. Update the resume with the S3 URL
    
    // Simulate PDF generation and upload
    // In a real implementation, replace this with actual PDF generation
    const customizedFileName = `${resume.userId}/customized_${crypto.randomBytes(8).toString('hex')}.pdf`;
    // Upload would happen here with the generated PDF
    const customizedS3Url = `https://example-bucket.s3.amazonaws.com/${customizedFileName}`;
    
    // Update resume with customized PDF location (simulated for now)
    resume.customizedS3Key = customizedFileName;
    resume.customizedS3Url = customizedS3Url;
    
    await resume.save();
    
    return resume;
  } catch (error) {
    logger.error('Resume processing error:', error);
    resume.customizationStatus = 'failed';
    resume.customizationError = error.message;
    await resume.save();
    throw error;
  }
};

/**
 * Get customization status
 */
exports.getCustomizationStatus = async (resumeId, userId) => {
  try {
    // Find resume
    const resume = await Resume.findOne({
      where: { id: resumeId, userId },
      attributes: ['id', 'name', 'customizationStatus', 'customizationError', 
                  'customizationCompletedAt', 'customizedS3Url']
    });
    
    if (!resume) return null;
    
    return {
      id: resume.id,
      name: resume.name,
      status: resume.customizationStatus,
      error: resume.customizationError,
      completedAt: resume.customizationCompletedAt,
      canDownload: resume.customizationStatus === 'completed',
      downloadUrl: resume.customizationStatus === 'completed' ? resume.customizedS3Url : null
    };
  } catch (error) {
    logger.error('Get customization status error:', error);
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
    
    if (!resume) return null;
    
    // Determine which version to download
    if (version === 'customized') {
      // Check if customized version is available
      if (resume.customizationStatus !== 'completed') {
        return {
          resume,
          status: resume.customizationStatus,
          error: resume.customizationError || 'Customization not completed',
          fileBuffer: null
        };
      }
      
      // Get customized file from S3
      // This would retrieve the file buffer from S3 using the customizedS3Key
      // For now, return the S3 URL
      return {
        resume,
        status: 'completed',
        downloadUrl: resume.customizedS3Url,
        fileBuffer: null  // In real implementation, this would be the file buffer
      };
    } else {
      // Get original file from S3
      const fileBuffer = await getFile(resume.s3Key);
      
      return {
        resume,
        status: 'completed',
        downloadUrl: resume.s3Url,
        fileBuffer
      };
    }
  } catch (error) {
    logger.error('Download resume error:', error);
    throw error;
  }
};