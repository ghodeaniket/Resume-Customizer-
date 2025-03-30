/**
 * Mock N8N API Server
 * 
 * This server simulates the N8N webhook endpoint for development.
 * It responds to resume customization requests with a template-based response.
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5678;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Mock webhook endpoint
app.post('/webhook/customize-resume-ai', (req, res) => {
  const { resumeContent, jobDescription, jobTitle, companyName } = req.body;
  
  // Validate required fields
  if (!resumeContent || !jobDescription) {
    return res.status(400).json({
      error: 'Resume content and job description are required'
    });
  }
  
  // Log request
  console.log(`[${new Date().toISOString()}] Customization request received:`);
  console.log(`  Job Title: ${jobTitle || 'Not specified'}`);
  console.log(`  Company: ${companyName || 'Not specified'}`);
  console.log(`  Resume Length: ${resumeContent.length} chars`);
  console.log(`  Job Description Length: ${jobDescription.length} chars`);
  
  // Extract some keywords from job description for simple customization
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

*This resume has been customized based on the job description provided.*
`;
  
  console.log(`[${new Date().toISOString()}] Returning customized resume (${customizedResume.length} chars)`);
  
  // Simulate processing delay (1-3 seconds)
  setTimeout(() => {
    res.status(200).json({
      resume: customizedResume
    });
  }, 1000 + Math.random() * 2000);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Mock N8N API server running at http://localhost:${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook/customize-resume-ai`);
});