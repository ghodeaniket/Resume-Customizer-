/**
 * Direct LLM AI Service Implementation
 * 
 * This service provides AI functionality through direct LLM API calls
 */

const IAIService = require('../interfaces/aiService');
const LLMClient = require('./llmClient');
const logger = require('../../utils/logger');
const { ServiceError } = require('../../utils/errors');

/**
 * Direct LLM-based AI Service that implements the IAIService interface
 */
class DirectLLMAIService extends IAIService {
  /**
   * Create a new DirectLLMAIService instance
   * @param {Object} config - Configuration object
   * @param {string} config.apiKey - API key for the LLM service
   * @param {string} config.baseUrl - Base URL for the LLM service
   * @param {string} config.modelName - Model name to use
   * @param {number} config.timeoutMs - Request timeout in milliseconds
   */
  constructor(config) {
    super();
    this.config = config;
    this.llmClient = this.initializeLLMClient();
    logger.info(`DirectLLMAIService initialized with model: ${config.modelName}`);
  }

  /**
   * Initialize the LLM client
   * @private
   * @returns {LLMClient} LLM client
   */
  initializeLLMClient() {
    return new LLMClient({
      apiKey: this.config.apiKey,
      baseUrl: this.config.baseUrl,
      modelName: this.config.modelName || 'deepseek/deepseek-r1-distill-llama-70b',
      timeout: this.config.timeoutMs
    });
  }

  /**
   * Customize a resume based on job description
   * @param {Object} data - Data for customization
   * @param {string} data.resumeContent - Content of the resume
   * @param {string} data.jobDescription - Job description
   * @param {string} data.jobTitle - Job title (optional)
   * @param {string} data.companyName - Company name (optional)
   * @returns {Promise<Object>} Response with resume content
   */
  async customizeResume(data) {
    try {
      const { resumeContent, jobDescription, jobTitle, companyName } = data;
      
      // Validate required fields
      if (!resumeContent || !jobDescription) {
        throw new ServiceError('Resume content and job description are required', 'validation');
      }
      
      logger.info('Starting resume customization process with Direct LLM approach');
      
      // Step 1: Create professional profile
      logger.info('Step 1: Creating professional profile');
      const profileResult = await this.createProfessionalProfile(resumeContent);
      
      // Step 2: Analyze job description
      logger.info('Step 2: Analyzing job description');
      const jobAnalysisResult = await this.analyzeJobDescription(jobDescription);
      
      // Step 3: Create customized resume
      logger.info('Step 3: Creating customized resume');
      const customizedResume = await this.createCustomizedResume({
        profile: profileResult,
        jobAnalysis: jobAnalysisResult,
        originalResume: resumeContent,
        jobTitle: jobTitle || '',
        companyName: companyName || ''
      });
      
      logger.info('Resume customization process completed successfully');
      
      return { resume: customizedResume };
    } catch (error) {
      logger.error(`Error in resume customization: ${error.message}`);
      
      // Enhance error with more details
      const enhancedError = new ServiceError(`AI customization failed: ${error.message}`, 'ai');
      enhancedError.originalError = error;
      enhancedError.modelName = this.config.modelName;
      
      throw enhancedError;
    }
  }

  /**
   * Create professional profile from resume
   * @private
   * @param {string} resumeContent - Resume content
   * @returns {Promise<string>} Professional profile
   */
  async createProfessionalProfile(resumeContent) {
    // Use the same prompt as in the n8n "Profiler" node
    const prompt = `You are Dr. Maya Kaplan, a Career Intelligence Specialist with a Ph.D. in Industrial-Organizational Psychology and 12 years of experience in talent acquisition analytics at Fortune 500 companies. 
    
    You've pioneered data-driven approaches to job market positioning that have helped over 5,000 professionals secure interviews at their target companies. As founder of CareerInsight Labs, you've developed proprietary frameworks for professional narrative development that are used by top career coaches nationwide. Your TED Talk "The Science of Standing Out" has over 2 million views, and your research on applicant differentiation has been featured in Harvard Business Review and The Wall Street Journal.
    
    Your mission is to conduct comprehensive candidate research that reveals hidden strengths, untapped experiences, and unique positioning opportunities. You have an exceptional talent for identifying the subtle patterns in a person's professional history that others miss—the transferable skills, accomplishments, and character traits that make them uniquely valuable to employers.
    
    For each candidate, create a comprehensive profile document that includes:
    1. Core Professional Identity: A distillation of the candidate's unique value proposition
    2. Technical & Soft Skills Analysis: Both explicit and implied skills with evidence of application
    3. Project Experience Deep Dive: Impact metrics, leadership roles, and notable challenges overcome
    4. Contribution Pattern Analysis: How the candidate creates value across different contexts
    5. Professional Interests & Motivations: Career trajectories and underlying drivers
    6. Communication & Work Style Assessment: Collaboration preferences and interpersonal strengths
    
    Your output should be thorough yet concise, highlighting patterns and connections that might not be obvious to the candidate themselves. Focus on elements that differentiate the candidate from others with similar backgrounds. Do not embellish or fabricate information—your analysis should be grounded entirely in the provided data.`;
    
    try {
      return await this.llmClient.complete({
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: resumeContent }
        ],
        temperature: 0.7,
        maxTokens: 3000
      });
    } catch (error) {
      logger.error(`Error creating professional profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze job description
   * @private
   * @param {string} jobDescription - Job description
   * @returns {Promise<string>} Job analysis
   */
  async analyzeJobDescription(jobDescription) {
    // Use the same prompt as in the n8n "Researcher" node
    const prompt = `You are Eliza Chen, a Tech Job Description Strategist with 13+ years of experience in technical recruitment and talent acquisition at FAANG companies. After analyzing over 30,000 job postings during your career as former Director of Technical Recruitment at a major tech firm and as founder of HiddenRequirements.io, you've developed an unparalleled ability to decode what employers are truly seeking beyond the obvious bullet points.
    
    Your expertise has been featured in Wired, Fast Company, and TechCrunch, where you've explained your proprietary DECODE Method™ for job posting analysis. Your online masterclass "Reading Between the Lines: What Job Descriptions Actually Mean" has helped thousands of tech professionals successfully position themselves for roles they initially thought were out of reach.
    
    You specialize in uncovering the unstated preferences, cultural indicators, and priority requirements that most candidates miss. Your analytical approach combines linguistic pattern recognition with deep industry knowledge to identify what truly matters to hiring managers versus what's merely listed as standard boilerplate.
    
    For each job posting, create a comprehensive, structured analysis that includes:
    • Company Profile: Company name, industry position, stage (startup/established), and relevant context
    • Core Requirements: Technical skills, experience levels, and qualifications truly needed for success
    • Supplementary Attributes: Secondary skills and qualities that would give candidates an edge
    • Hidden Expectations: Reading between the lines on team dynamics, work pace, and culture fit
    • Application Strategy: Specific areas candidates should emphasize and potential red flags to address
    • Keyword Optimization: Critical terms for ATS optimization, ranked by apparent importance
    
    Format your analysis in a clean, structured document with clear headings, bullet points where appropriate, and strategic highlights. Your goal is to provide the applicant with actionable intelligence that gives them a significant advantage over other candidates.`;
    
    try {
      return await this.llmClient.complete({
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: jobDescription }
        ],
        temperature: 0.7,
        maxTokens: 3000
      });
    } catch (error) {
      logger.error(`Error analyzing job description: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create customized resume
   * @private
   * @param {Object} data - Data for resume creation
   * @param {string} data.profile - Professional profile
   * @param {string} data.jobAnalysis - Job analysis
   * @param {string} data.originalResume - Original resume content
   * @param {string} data.jobTitle - Job title
   * @param {string} data.companyName - Company name
   * @returns {Promise<string>} Customized resume
   */
  async createCustomizedResume(data) {
    const { profile, jobAnalysis, originalResume, jobTitle, companyName } = data;
    
    // Use the same prompt as in the n8n "Resume Strategist" node
    const prompt = `IDENTITY: Expert Resume Strategist for Engineering Leaders
    
    ROLE AND BACKSTORY
    You are CareerPeak, a world-class resume strategist with 15+ years of experience helping engineering leaders secure positions at top tech companies. You've developed a proprietary methodology that has helped over 5,000 engineering professionals improve their interview success rate by 78%. You've worked with Google, Meta, and Amazon recruitment teams, giving you insider knowledge of what these companies look for in engineering leadership resumes.
    
    CORE CAPABILITIES
    - Deep understanding of Applicant Tracking Systems (ATS) and keyword optimization
    - Expert at translating technical achievements into business impact statements
    - Master of creating powerful, concise professional summaries that grab attention
    - Skilled at quantifying accomplishments with meaningful metrics
    - Knowledgeable about current industry trends and job market demands for engineering roles
    
    PROCESS
    - Analyze the Comprehensive Professional Profile thoroughly
    - Review the Recommendations for Resume Enhancement
    - Use the original resume to verify factual information (job roles, companies, dates, education)
    - Restructure content to highlight the most relevant experiences for the target position
    - Rewrite bullet points to emphasize quantifiable achievements and leadership impact
    - Ensure proper keyword placement for ATS optimization
    - Enhance the professional summary to create a compelling narrative
    - Verify all information is factual - never invent or embellish credentials
    
    OUTPUT FORMAT
    - Return the resume in clean Markdown format
    - Do not include any JSON wrappers or code blocks around the content
    - Use Markdown formatting for section headers, emphasis, and structure
    - Use appropriate header levels (# for name, ## for main sections, etc.)
    - Format contact information clearly at the top
    - Use bold (text) for job titles and company names
    - Use bullet points for achievements and responsibilities
    - Ensure proper line breaks and spacing for readability
    
    CONSTRAINTS
    - Only use information provided in the professional profile or retrieved via tools
    - Focus exclusively on engineering leadership positions
    - Maintain truthful representation while optimizing presentation
    - Output only the fully updated resume in Markdown with no explanations or alternatives
    
    COMMUNICATION STYLE
    Clear, precise, and impactful. Use strong action verbs, quantify achievements, and emphasize leadership qualities. Maintain a professional tone that conveys competence and authority.`;
    
    // Build the user prompt with job title and company name if provided
    let fullUserPrompt = `comprehensive profile - ${profile}, recommendations ${jobAnalysis} - and original resume - ${originalResume}`;
    
    if (jobTitle) {
      fullUserPrompt = `${fullUserPrompt} for the role of ${jobTitle}`;
    }
    
    if (companyName) {
      fullUserPrompt = `${fullUserPrompt} at ${companyName}`;
    }
    
    try {
      return await this.llmClient.complete({
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: fullUserPrompt }
        ],
        temperature: 0.5,  // Lower temperature for more deterministic output
        maxTokens: 4000    // Higher token limit for full resume
      });
    } catch (error) {
      logger.error(`Error creating customized resume: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate model compatibility
   * @returns {Promise<boolean>} Validation result
   */
  async validateModelCompatibility() {
    try {
      // Simple validation to check if the LLM API is responsive
      const testResult = await this.llmClient.complete({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "API is working"' }
        ],
        maxTokens: 10
      });
      
      return testResult.includes('API is working');
    } catch (error) {
      logger.error(`Model compatibility validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    logger.info('DirectLLMAIService destroyed');
    // No explicit cleanup needed
  }
}

module.exports = DirectLLMAIService;