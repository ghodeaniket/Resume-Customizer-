/**
 * Resume Mapper Utility
 * 
 * This module provides functions to map resume database entities to response objects,
 * which helps with maintaining consistent response formats and eliminates duplication.
 */

/**
 * Map a resume database entity to a basic response object
 * @param {Object} resume - Resume database entity
 * @returns {Object} - Basic resume response object
 */
const mapToBasicResponse = (resume) => ({
  id: resume.id,
  name: resume.name,
  description: resume.description,
  fileType: resume.fileType,
  fileSize: resume.fileSize,
  isPublic: resume.isPublic,
  lastModified: resume.lastModified,
  createdAt: resume.createdAt,
  updatedAt: resume.updatedAt
});

/**
 * Map a resume database entity to a detailed response object
 * @param {Object} resume - Resume database entity
 * @returns {Object} - Detailed resume response object
 */
const mapToDetailedResponse = (resume) => ({
  ...mapToBasicResponse(resume),
  originalFileName: resume.originalFileName,
  s3Url: resume.s3Url,
  markdownContent: resume.markdownContent
});

/**
 * Map a resume database entity to a customization status response object
 * @param {Object} resume - Resume database entity
 * @param {Object} options - Additional options
 * @param {boolean} options.includeDownloadUrl - Whether to include the download URL
 * @returns {Object} - Customization status response object
 */
const mapToCustomizationStatusResponse = (resume, options = {}) => {
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
  
  const response = {
    id: resume.id,
    name: resume.name,
    status: resume.customizationStatus,
    progress,
    error: resume.customizationError,
    completedAt: resume.customizationCompletedAt,
    jobTitle: resume.jobTitle,
    companyName: resume.companyName,
    canDownload: resume.customizationStatus === 'completed'
  };
  
  if (options.includeDownloadUrl && resume.customizationStatus === 'completed') {
    response.downloadUrl = `/api/v1/resumes/${resume.id}/download?version=customized`;
  }
  
  return response;
};

/**
 * Map a resume database entity to a upload and customize response object
 * @param {Object} resume - Resume database entity
 * @param {string} jobId - Job ID
 * @returns {Object} - Upload and customize response object
 */
const mapToUploadAndCustomizeResponse = (resume, jobId) => ({
  id: resume.id,
  name: resume.name,
  customizationStatus: resume.customizationStatus,
  jobId
});

module.exports = {
  mapToBasicResponse,
  mapToDetailedResponse,
  mapToCustomizationStatusResponse,
  mapToUploadAndCustomizeResponse
};
