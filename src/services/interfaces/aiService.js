/**
 * AI Service Interface
 * All AI service implementations must follow this interface
 */
class IAIService {
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
    throw new Error('Method not implemented');
  }

  /**
   * Validate model compatibility
   * @returns {Promise<boolean>} Validation result
   */
  async validateModelCompatibility() {
    throw new Error('Method not implemented');
  }

  /**
   * Clean up resources
   */
  destroy() {
    throw new Error('Method not implemented');
  }
}

module.exports = IAIService;