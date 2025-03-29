/**
 * N8N Client Mock Implementation
 */
const logger = require('../../src/utils/logger');

class N8NMockClient {
  constructor() {
    logger.info('Initialized N8N Mock Client');
  }

  async customizeResume(data) {
    const { resumeContent, jobDescription, jobTitle, companyName } = data;
    
    // Validate required fields
    if (!resumeContent || !jobDescription) {
      throw new Error('Resume content and job description are required');
    }
    
    logger.info('Mock n8n: Processing resume customization request');
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create a customized resume based on the job description
    const customizedResume = `# Customized Resume for ${jobTitle || 'Software Engineer'} at ${companyName || 'Tech Company'}

## Personal Information
- Name: John Doe
- Email: john.doe@example.com
- Phone: (123) 456-7890
- Location: San Francisco, CA

## Professional Summary
Dedicated software engineer with extensive experience in developing robust applications and systems. Proven ability to deliver high-quality solutions that align with business requirements. Strong technical skills and a commitment to continuous learning.

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
- Languages: JavaScript, Python, Java, Go
- Frameworks: Node.js, Express, React, Django
- Databases: PostgreSQL, MongoDB, Redis
- Tools: Docker, Kubernetes, AWS, Git
- Methodologies: Agile, Scrum, Test-Driven Development
- Soft Skills: Communication, Team Leadership, Problem-Solving

*This resume has been customized based on the job description provided.*
`;
    
    logger.info('Mock n8n: Resume customization complete');
    
    return {
      resume: customizedResume
    };
  }
}

// Create a singleton instance
const n8nClient = new N8NMockClient();

module.exports = n8nClient;