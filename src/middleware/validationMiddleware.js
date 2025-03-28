const { validationResult, param, body, query } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Middleware to validate request and return appropriate errors
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg
    }));
    
    logger.warn(`Validation error: ${JSON.stringify(formattedErrors)}`);
    
    return res.status(400).json({
      status: 'fail',
      message: 'Validation error',
      errors: formattedErrors
    });
  }
  next();
};

/**
 * Validate customization request
 */
const validateCustomizeRequest = [
  body('jobDescription')
    .exists().withMessage('Job description is required')
    .isString().withMessage('Job description must be a string')
    .isLength({ min: 10 }).withMessage('Job description must be at least 10 characters long'),
  
  body('jobTitle')
    .optional()
    .isString().withMessage('Job title must be a string'),
  
  body('companyName')
    .optional()
    .isString().withMessage('Company name must be a string'),
  
  body('name')
    .optional()
    .isString().withMessage('Resume name must be a string'),
  
  validateRequest
];

/**
 * Validate resume ID parameter
 */
const validateResumeId = [
  param('id')
    .exists().withMessage('Resume ID is required')
    .isUUID().withMessage('Resume ID must be a valid UUID'),
  
  validateRequest
];

/**
 * Validate download request
 */
const validateDownloadRequest = [
  param('id')
    .exists().withMessage('Resume ID is required')
    .isUUID().withMessage('Resume ID must be a valid UUID'),
  
  query('version')
    .optional()
    .isIn(['original', 'customized']).withMessage('Version must be either "original" or "customized"'),
  
  validateRequest
];

module.exports = {
  validateCustomizeRequest,
  validateResumeId,
  validateDownloadRequest
};