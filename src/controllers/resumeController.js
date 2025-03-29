const resumeService = require('../services/resumeService');
const logger = require('../utils/logger');

/**
 * Get all resumes for the current user
 */
exports.getAllResumes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const resumes = await resumeService.getUserResumes(userId);

    return res.status(200).json({
      status: 'success',
      results: resumes.length,
      data: {
        resumes
      }
    });
  } catch (error) {
    logger.error('Get all resumes error:', error);
    next(error);
  }
};

/**
 * Get a specific resume
 */
exports.getResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const resume = await resumeService.getResumeById(id, userId);

    if (!resume) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        resume
      }
    });
  } catch (error) {
    logger.error('Get resume error:', error);
    next(error);
  }
};

/**
 * Upload a new resume
 */
exports.uploadResume = async (req, res, next) => {
  try {
    // Multer middleware will attach file to req.file
    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please upload a resume file'
      });
    }

    const { name, description } = req.body;
    const userId = req.user.id;
    const file = req.file;

    // Create resume
    const resume = await resumeService.createResume({
      userId,
      name: name || file.originalname,
      description,
      file
    });

    return res.status(201).json({
      status: 'success',
      message: 'Resume uploaded successfully',
      data: {
        resume
      }
    });
  } catch (error) {
    logger.error('Upload resume error:', error);
    next(error);
  }
};

/**
 * Update resume details
 */
exports.updateResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, isPublic } = req.body;
    const userId = req.user.id;

    // Update resume
    const resume = await resumeService.updateResumeDetails(id, userId, {
      name,
      description,
      isPublic
    });

    if (!resume) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Resume updated successfully',
      data: {
        resume
      }
    });
  } catch (error) {
    logger.error('Update resume error:', error);
    next(error);
  }
};

/**
 * Delete a resume
 */
exports.deleteResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Delete resume
    const success = await resumeService.deleteResume(id, userId);

    if (!success) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume not found'
      });
    }

    return res.status(204).send();
  } catch (error) {
    logger.error('Delete resume error:', error);
    next(error);
  }
};

/**
 * Convert resume to markdown
 */
exports.convertToMarkdown = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Convert resume to markdown
    const { resume, markdown } = await resumeService.convertResumeToMarkdown(id, userId);

    if (!resume) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Resume converted to markdown successfully',
      data: {
        resume,
        markdown
      }
    });
  } catch (error) {
    logger.error('Convert to markdown error:', error);
    next(error);
  }
};

/**
 * Customize resume based on job description
 */
exports.customizeResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { jobDescription, jobTitle, companyName } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!jobDescription) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide job description'
      });
    }

    // Customize resume
    const customizedResume = await resumeService.customizeResume(id, userId, {
      jobDescription,
      jobTitle,
      companyName
    });

    if (!customizedResume) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Resume customized successfully',
      data: {
        resume: customizedResume
      }
    });
  } catch (error) {
    logger.error('Customize resume error:', error);
    next(error);
  }
};

/**
 * Share a resume (make it public/private)
 */
exports.shareResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPublic } = req.body;
    const userId = req.user.id;

    // Validate input
    if (isPublic === undefined) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please specify isPublic value'
      });
    }

    // Update resume sharing status
    const resume = await resumeService.updateResumeSharing(id, userId, isPublic);

    if (!resume) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: isPublic ? 'Resume shared successfully' : 'Resume sharing disabled',
      data: {
        resume
      }
    });
  } catch (error) {
    logger.error('Share resume error:', error);
    next(error);
  }
};

/**
 * Get public link for a shared resume
 */
exports.getPublicLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get public link
    const { resume, publicLink } = await resumeService.getResumePublicLink(id, userId);

    if (!resume) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume not found'
      });
    }

    if (!resume.isPublic) {
      return res.status(400).json({
        status: 'fail',
        message: 'Resume is not shared publicly'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        resume,
        publicLink
      }
    });
  } catch (error) {
    logger.error('Get public link error:', error);
    next(error);
  }
};

/**
 * Upload and customize resume in one step
 */
exports.uploadAndCustomize = async (req, res, next) => {
  try {
    // Validation is handled by the middleware
    const userId = req.user.id;
    const { 
      jobDescription, 
      jobTitle, 
      companyName,
      name, // Optional custom name
      resumeId // Optional existing resume ID
    } = req.body;
    
    let result;
    
    // Case 1: Using an existing resume
    if (resumeId) {
      logger.info(`Customizing existing resume ${resumeId} with new job description`);
      result = await resumeService.customizeExistingResume(resumeId, userId, {
        jobDescription,
        jobTitle,
        companyName
      });
    } 
    // Case 2: Uploading a new resume
    else if (req.file) {
      logger.info('Uploading and customizing new resume');
      const file = req.file;
      result = await resumeService.uploadAndCustomize({
        userId,
        name: name || file.originalname,
        file,
        jobDescription,
        jobTitle,
        companyName
      });
    } 
    // This shouldn't happen due to validation, but just in case
    else {
      const error = new Error('Either an existing resume ID or a file upload is required');
      error.statusCode = 400;
      throw error;
    }

    return res.status(202).json({
      status: 'success',
      message: 'Resume customization has been queued',
      data: {
        resumeId: result.id,
        status: result.customizationStatus,
        jobId: result.jobId,
        estimatedTimeSeconds: 60 // Realistic estimate
      }
    });
  } catch (error) {
    logger.error(`Upload and customize controller error: ${error.message}`);
    
    // Use error's status code if available, otherwise default to 500
    const statusCode = error.statusCode || 500;
    
    return res.status(statusCode).json({
      status: 'fail',
      message: error.message,
      error: error.originalError ? {
        type: error.originalError.name,
        details: error.originalError.message
      } : undefined
    });
  }
};

/**
 * Get customization status
 */
exports.getCustomizationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const status = await resumeService.getCustomizationStatus(id, userId);
    
    return res.status(200).json({
      status: 'success',
      data: status
    });
  } catch (error) {
    logger.error(`Get customization status controller error: ${error.message}`);
    
    // Use error's status code if available
    const statusCode = error.statusCode || 500;
    
    return res.status(statusCode).json({
      status: 'fail',
      message: error.message
    });
  }
};

/**
 * Download resume (original or customized)
 */
exports.downloadResume = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { version = 'customized' } = req.query;
    const userId = req.user.id;
    
    const result = await resumeService.downloadResume(id, userId, version);
    
    // Set cache headers for better performance
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    
    // Send file as response
    return res.send(result.fileBuffer);
  } catch (error) {
    logger.error(`Download resume controller error: ${error.message}`);
    
    // Use error's status code if available
    const statusCode = error.statusCode || 500;
    
    // Special case for customization not complete
    if (error.resumeStatus && statusCode === 400) {
      return res.status(statusCode).json({
        status: 'fail',
        message: error.message,
        data: {
          status: error.resumeStatus,
          error: error.resumeError
        }
      });
    }
    
    return res.status(statusCode).json({
      status: 'fail',
      message: error.message
    });
  }
};