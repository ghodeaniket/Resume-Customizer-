/**
 * Mock AI Service
 * Provides a mock implementation of the AI customization service
 */

const logger = require('../../src/utils/logger');

/**
 * Initialize the service
 */
function init() {
  logger.info('Mock AI Service initialized');
  
  // Add a warning banner to logs
  const warning = [
    '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
    '!!                   MOCK MODE ACTIVE                      !!',
    '!!                                                         !!',
    '!! AI Service is using MOCK IMPLEMENTATION                 !!',
    '!! All customizations are simulated and use predefined     !!',
    '!! templates. This mode is for development only.           !!',
    '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
  ];
  
  warning.forEach(line => logger.warn(line));
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
  
  logger.info('[MOCK] Processing resume customization request');
  
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
  
  // Simulate processing delay (1-3 seconds)
  const delay = 1000 + Math.random() * 2000;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Create a customized resume based on the job description and extracted keywords
  const customizedResume = `# Customized Resume for ${jobTitle || 'Software Engineer'} at ${companyName || 'Tech Company'}

## Personal Information
- Name: John Doe
- Email: john.doe@example.com
- Phone: (123) 456-7890
- Location: San Francisco, CA

## Professional Summary
Dedicated ${roleKeywords.join(' ')} developer with extensive experience in developing robust applications and systems. Proven ability to deliver high-quality solutions that align with business requirements. Strong technical skills in ${techKeywords.join(', ')} and a commitment to continuous learning.

## Experience
### Senior Software Engineer
**ABC Company** | Jan 2020 - Present
- Led development of microservices architecture, improving system scalability by 200%
- Implemented CI/CD pipelines reducing deployment time by 75%
- Optimized database queries resulting in 40% performance improvement
- Mentored junior developers and conducted technical interviews

### Software Engineer
**XYZ Tech** | Mar 2017 - Dec 2019
- Developed and maintained backend systems supporting 500K+ daily users
- Collaborated with product teams to implement new features and enhancements
- Implemented automated testing workflows increasing code coverage to 90%
- Participated in on-call rotation, handling production issues with minimal downtime

## Education
### Master of Computer Science
**Stanford University** | 2015 - 2017

### Bachelor of Science in Computer Science
**University of California, Berkeley** | 2011 - 2015

## Skills
- Languages: ${techKeywords.filter(k => ['JavaScript', 'Python', 'Java'].includes(k)).join(', ') || 'JavaScript, Python, Java'}
- Frameworks: ${techKeywords.filter(k => ['React', 'Node.js'].includes(k)).join(', ') || 'React, Node.js, Express'}
- Cloud & DevOps: ${techKeywords.filter(k => ['AWS', 'Docker', 'Kubernetes', 'DevOps', 'Cloud'].includes(k)).join(', ') || 'AWS, Docker, Git'}
- Databases: ${techKeywords.filter(k => ['SQL', 'NoSQL', 'MongoDB'].includes(k)).join(', ') || 'PostgreSQL, MongoDB, Redis'}
- Methodologies: Agile, Scrum, Test-Driven Development
- Soft Skills: Communication, Team Leadership, Problem-Solving

*This resume has been customized based on the job description provided (MOCK VERSION).*
`;
  
  logger.info('[MOCK] Resume customization complete');
  
  return {
    resume: customizedResume
  };
}

/**
 * Clean up resources when service is destroyed
 */
function destroy() {
  logger.info('Mock AI Service destroyed');
  // No specific cleanup needed
}

module.exports = {
  init,
  customizeResume,
  destroy
};