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
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please upload a resume file'
      });
    }

    // Check if job description exists
    if (!req.body.jobDescription) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a job description'
      });
    }

    const userId = req.user.id;
    const file = req.file;
    const { 
      jobDescription, 
      jobTitle, 
      companyName,
      name // Optional custom name
    } = req.body;

    // Process upload and start customization
    const result = await resumeService.uploadAndCustomize({
      userId,
      name: name || file.originalname,
      file,
      jobDescription,
      jobTitle,
      companyName
    });

    return res.status(202).json({
      status: 'success',
      message: 'Resume customization in progress',
      data: {
        resumeId: result.id,
        status: result.customizationStatus,
        estimatedTimeSeconds: 30 // Approximate time for customization
      }
    });
  } catch (error) {
    logger.error('Upload and customize error:', error);
    next(error);
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
    
    if (!status) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume not found'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: status
    });
  } catch (error) {
    logger.error('Get customization status error:', error);
    next(error);
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
    
    if (!result) {
      return res.status(404).json({
        status: 'fail',
        message: 'Resume not found'
      });
    }
    
    // If customization is not complete and trying to download customized version
    if (version === 'customized' && result.status !== 'completed') {
      return res.status(400).json({
        status: 'fail',
        message: `Customization ${result.status}`,
        data: {
          status: result.status,
          error: result.error
        }
      });
    }
    
    // If we have the file buffer (for original files)
    if (result.fileBuffer) {
      // Set headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.resume.name}.pdf"`);
      
      // Send file
      return res.send(result.fileBuffer);
    }
    
    // For customized files, redirect to the S3 URL
    // Note: In a production environment, you might want to use pre-signed URLs or other methods
    return res.status(200).json({
      status: 'success',
      data: {
        downloadUrl: result.downloadUrl
      }
    });
  } catch (error) {
    logger.error('Download resume error:', error);
    next(error);
  }
};