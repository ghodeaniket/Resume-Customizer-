/**
 * Resume Controller
 * Handles HTTP requests related to resumes
 */

const { ServiceType, getService } = require('../services/serviceRegistry');
const { 
  withErrorHandling, 
  successResponse, 
  errorResponse 
} = require('../utils/controllerUtils');
const {
  ValidationError,
  NotFoundError
} = require('../utils/errors');

// Get resume service from registry
const resumeService = getService(ServiceType.RESUME);

/**
 * Get all resumes for the current user
 */
exports.getAllResumes = withErrorHandling(async (req, res) => {
  const userId = req.user.id;
  const resumes = await resumeService.getUserResumes(userId);

  return successResponse(res, 200, 'Resumes retrieved successfully', {
    results: resumes.length,
    resumes
  });
}, 'Get all resumes');

/**
 * Get a specific resume
 */
exports.getResume = withErrorHandling(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const resume = await resumeService.getResumeById(id, userId);

  if (!resume) {
    throw new NotFoundError('Resume not found', 'resume');
  }

  return successResponse(res, 200, 'Resume retrieved successfully', { resume });
}, 'Get resume');

/**
 * Upload a new resume
 */
exports.uploadResume = withErrorHandling(async (req, res) => {
  // Multer middleware will attach file to req.file
  if (!req.file) {
    throw new ValidationError('Please upload a resume file');
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

  return successResponse(res, 201, 'Resume uploaded successfully', { resume });
}, 'Upload resume');

/**
 * Update resume details
 */
exports.updateResume = withErrorHandling(async (req, res) => {
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
    throw new NotFoundError('Resume not found', 'resume');
  }

  return successResponse(res, 200, 'Resume updated successfully', { resume });
}, 'Update resume');

/**
 * Delete a resume
 */
exports.deleteResume = withErrorHandling(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Delete resume
  const success = await resumeService.deleteResume(id, userId);

  if (!success) {
    throw new NotFoundError('Resume not found', 'resume');
  }

  return res.status(204).send();
}, 'Delete resume');

/**
 * Convert resume to markdown
 */
exports.convertToMarkdown = withErrorHandling(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Convert resume to markdown
  const { resume, markdown } = await resumeService.convertResumeToMarkdown(id, userId);

  if (!resume) {
    throw new NotFoundError('Resume not found', 'resume');
  }

  return successResponse(res, 200, 'Resume converted to markdown successfully', {
    resume,
    markdown
  });
}, 'Convert to markdown');

/**
 * Customize resume based on job description
 */
exports.customizeResume = withErrorHandling(async (req, res) => {
  const { id } = req.params;
  const { jobDescription, jobTitle, companyName } = req.body;
  const userId = req.user.id;

  // Validate input
  if (!jobDescription) {
    throw new ValidationError('Please provide job description');
  }

  // Customize resume
  const customizedResume = await resumeService.customizeResume(id, userId, {
    jobDescription,
    jobTitle,
    companyName
  });

  return successResponse(res, 200, 'Resume customization has been queued', {
    resume: customizedResume
  });
}, 'Customize resume');

/**
 * Share a resume (make it public/private)
 */
exports.shareResume = withErrorHandling(async (req, res) => {
  const { id } = req.params;
  const { isPublic } = req.body;
  const userId = req.user.id;

  // Validate input
  if (isPublic === undefined) {
    throw new ValidationError('Please specify isPublic value');
  }

  // Update resume sharing status
  const resume = await resumeService.updateResumeSharing(id, userId, isPublic);

  if (!resume) {
    throw new NotFoundError('Resume not found', 'resume');
  }

  return successResponse(
    res, 
    200, 
    isPublic ? 'Resume shared successfully' : 'Resume sharing disabled', 
    { resume }
  );
}, 'Share resume');

/**
 * Get public link for a shared resume
 */
exports.getPublicLink = withErrorHandling(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Get public link
  const { resume, publicLink } = await resumeService.getResumePublicLink(id, userId);

  if (!resume) {
    throw new NotFoundError('Resume not found', 'resume');
  }

  if (!resume.isPublic) {
    throw new ValidationError('Resume is not shared publicly');
  }

  return successResponse(res, 200, 'Public link retrieved successfully', {
    resume,
    publicLink
  });
}, 'Get public link');

/**
 * Upload and customize resume in one step
 */
exports.uploadAndCustomize = withErrorHandling(async (req, res) => {
  // Validation is handled by the middleware
  const userId = req.user.id;
  const file = req.file;
  const { 
    jobDescription, 
    jobTitle, 
    companyName,
    name // Optional custom name
  } = req.body;

  if (!file) {
    throw new ValidationError('Please upload a resume file');
  }

  if (!jobDescription) {
    throw new ValidationError('Please provide job description');
  }

  // Process upload and start customization
  const result = await resumeService.uploadAndCustomize({
    userId,
    name: name || file.originalname,
    file,
    jobDescription,
    jobTitle,
    companyName
  });

  return successResponse(res, 202, 'Resume customization has been queued', {
    resumeId: result.id,
    status: result.customizationStatus,
    jobId: result.jobId,
    estimatedTimeSeconds: 60 // Realistic estimate
  });
}, 'Upload and customize resume');

/**
 * Get customization status
 */
exports.getCustomizationStatus = withErrorHandling(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  const status = await resumeService.getCustomizationStatus(id, userId);
  
  return successResponse(res, 200, 'Customization status retrieved successfully', status);
}, 'Get customization status');

/**
 * Download resume (original or customized)
 */
exports.downloadResume = withErrorHandling(async (req, res) => {
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
}, 'Download resume');