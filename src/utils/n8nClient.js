const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const logger = require('./logger');

// Check if we're in mock mode for development
const useMockN8n = process.env.NODE_ENV === 'development' && process.env.MOCK_SERVICES === 'true';

// Create mock n8n client
const createMockN8nClient = () => {
  logger.info('Using mock n8n client');
  
  return {
    customizeResume: async (data) => {
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
  };
};

// Initialize real or mock client based on environment
let n8nClientModule;

if (useMockN8n) {
  n8nClientModule = createMockN8nClient();
} else {
  try {
    // Get webhook URL and path from environment variables
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    const webhookPath = process.env.N8N_WEBHOOK_PATH || 'customize-resume-ai';
    const timeoutMs = parseInt(process.env.CUSTOMIZATION_TIMEOUT_MS || '120000');
    const maxRetries = parseInt(process.env.CUSTOMIZATION_MAX_RETRIES || '3');
    
    if (!webhookUrl) {
      throw new Error('N8N_WEBHOOK_URL is not defined in environment variables');
    }
    
    const fullWebhookUrl = `${webhookUrl}/${webhookPath}`;
    
    // Create axios instance for n8n
    const n8nClient = axios.create({
      baseURL: webhookUrl,
      timeout: timeoutMs
    });

    // Configure retry mechanism
    axiosRetry(n8nClient, {
      retries: maxRetries,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Retry on connection errors, 5xx responses, or timeouts
        const shouldRetry = 
          axiosRetry.isNetworkError(error) || 
          axiosRetry.isRetryableError(error) ||
          (error.response && error.response.status >= 500) ||
          error.code === 'ECONNABORTED';
        
        if (shouldRetry) {
          logger.warn(`Retrying n8n webhook call due to error: ${error.message}`);
        }
        
        return shouldRetry;
      },
      onRetry: (retryCount, error) => {
        logger.warn(`Retry attempt #${retryCount} for n8n webhook call: ${error.message}`);
      }
    });

    n8nClientModule = {
      customizeResume: async (data) => {
        try {
          const { resumeContent, jobDescription, jobTitle, companyName } = data;
          
          // Validate required fields
          if (!resumeContent || !jobDescription) {
            throw new Error('Resume content and job description are required');
          }
          
          logger.info(`Sending resume customization request to n8n webhook at ${fullWebhookUrl}`);
          
          // Make the API call with retry capability
          const response = await n8nClient.post(webhookPath, {
            resumeContent,
            jobDescription,
            jobTitle: jobTitle || '',
            companyName: companyName || ''
          });
          
          logger.info('Resume customization request successful');
          
          // Return the response data
          return response.data;
        } catch (error) {
          logger.error(`Error calling n8n webhook: ${error.message}`);
          
          // Enhance error with more details
          const enhancedError = new Error(`N8N webhook call failed: ${error.message}`);
          enhancedError.originalError = error;
          enhancedError.webhookUrl = fullWebhookUrl;
          enhancedError.status = error.response?.status;
          enhancedError.statusText = error.response?.statusText;
          
          throw enhancedError;
        }
      }
    };
  } catch (error) {
    logger.error(`Failed to initialize n8n client: ${error.message}`);
    
    // Fall back to mock client in development
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Falling back to mock n8n client');
      n8nClientModule = createMockN8nClient();
    } else {
      throw error;
    }
  }
}

module.exports = n8nClientModule;