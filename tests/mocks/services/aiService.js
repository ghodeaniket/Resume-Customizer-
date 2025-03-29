/**
 * Mock AI Service for Testing
 * Provides a mock implementation of the AI customization service
 */

const logger = require('../../../src/utils/logger');

/**
 * Initialize the service
 */
function init() {
  logger.info('Test Mock AI Service initialized');
}

/**
 * Customize a resume based on job description
 * @param {Object} data - Data for customization
 * @param {string} data.resumeContent - Content of the resume
 * @param {string} data.jobDescription - Job description
 * @param {string} data.jobTitle - Job title (optional)
 * @param {string} data.companyName - Company name (optional)
 */
async function customizeResume(data) {
  const { resumeContent, jobDescription, jobTitle, companyName } = data;
  
  // Validate required fields
  if (!resumeContent || !jobDescription) {
    throw new Error('Resume content and job description are required');
  }
  
  // Extract some keywords from job description to make template slightly responsive
  const keywordExtractor = (text, keywords) => {
    return keywords.filter(keyword => 
      text.toLowerCase().includes(keyword.toLowerCase())
    );
  };
  
  const techKeywords = keywordExtractor(
    jobDescription, 
    ['JavaScript', 'React', 'Node.js', 'Python', 'Java', 'AWS', 'Docker', 'Kubernetes', 
    'SQL', 'NoSQL', 'MongoDB', 'DevOps', 'Machine Learning', 'AI', 'Cloud']
  );
  
  const roleKeywords = keywordExtractor(
    jobDescription,
    ['Frontend', 'Backend', 'Full Stack', 'DevOps', 'Data Science', 'Manager', 
    'Lead', 'Senior', 'Junior', 'Architect', 'Designer']
  );
  
  // Create a customized resume based on the job description and extracted keywords
  const customizedResume = `# Customized Resume for ${jobTitle || 'Software Engineer'} at ${companyName || 'Tech Company'}

## Professional Summary
Dedicated ${roleKeywords.join(' ')} developer with experience in developing applications and systems.

## Skills
- Languages: ${techKeywords.filter(k => ['JavaScript', 'Python', 'Java'].includes(k)).join(', ') || 'JavaScript, Python, Java'}
- Frameworks: ${techKeywords.filter(k => ['React', 'Node.js'].includes(k)).join(', ') || 'React, Node.js, Express'}
- Cloud & DevOps: ${techKeywords.filter(k => ['AWS', 'Docker', 'Kubernetes', 'DevOps', 'Cloud'].includes(k)).join(', ') || 'AWS, Docker, Git'}

*This is a test mock resume.*
`;
  
  return {
    resume: customizedResume
  };
}

/**
 * Clean up resources when service is destroyed
 */
function destroy() {
  // No specific cleanup needed
}

module.exports = {
  init,
  customizeResume,
  destroy
};