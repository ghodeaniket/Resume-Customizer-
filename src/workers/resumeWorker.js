/**
 * Resume Customization Worker
 * 
 * This module manages the background processing of resume customization jobs.
 * It uses the queue service to handle job processing and coordinates between
 * different services (storage, AI) to perform the customization workflow.
 */

const Resume = require('../models/resume');
const logger = require('../utils/logger');
const crypto = require('crypto');
const convertPdfToMarkdown = require('../utils/convertPdfToMarkdown');
const { generatePdfFromMarkdown } = require('../utils/pdfGenerator');
const services = require('../services');

// Get required services
const queueService = services.queue();
const storageService = services.storage();
const aiService = services.ai();

// Initialize worker
try {
  /**
   * Process resume customization job
   */
  queueService.registerProcessor('resume-customization', async (job) => {
    const { resumeId } = job.data;
    logger.info(`Processing resume customization job ${job.id} for resume ${resumeId}`);
    
    try {
      // Find resume
      const resume = await Resume.findByPk(resumeId);
      
      if (!resume) {
        throw new Error(`Resume not found: ${resumeId}`);
      }
      
      // Update status to processing
      resume.customizationStatus = 'processing';
      await resume.save();
      
      // Step 1: Convert to markdown if needed
      if (!resume.markdownContent) {
        logger.info(`Converting resume ${resumeId} to markdown`);
        
        // For PDF files
        if (resume.fileType === 'pdf') {
          // Get file from storage
          const fileBuffer = await storageService.getFile(resume.s3Key);
          
          // Convert to markdown
          const markdown = await convertPdfToMarkdown(fileBuffer);
          
          // Update resume with markdown content
          resume.markdownContent = markdown;
          await resume.save();
        } else {
          // For now, only PDF is supported for conversion
          throw new Error('File type not supported for conversion. Only PDF files can be customized.');
        }
      }
      
      // Step 2: Call AI service for customization
      logger.info(`Sending resume ${resumeId} for AI customization`);
      const aiResponse = await aiService.customizeResume({
        resumeContent: resume.markdownContent,
        jobDescription: resume.jobDescription,
        jobTitle: resume.jobTitle || '',
        companyName: resume.companyName || ''
      });
      
      // Step 3: Store customized content
      logger.info(`Storing customized content for resume ${resumeId}`);
      
      // Extract resume content from AI response
      let resumeContent = '';
      
      try {
        if (typeof aiResponse === 'string') {
          // Try to parse the response as JSON if it's a string
          try {
            const parsedResponse = JSON.parse(aiResponse);
            if (parsedResponse && parsedResponse.resume) {
              resumeContent = parsedResponse.resume;
            } else {
              // If no resume field but looks like markdown, use the whole parsed response
              resumeContent = JSON.stringify(parsedResponse);
            }
          } catch (parseError) {
            // Not valid JSON, might be direct markdown content
            logger.info('AI response is not JSON, using as raw content');
            resumeContent = aiResponse;
          }
        } else if (aiResponse && typeof aiResponse === 'object') {
          // Handle object response
          if (aiResponse.resume) {
            resumeContent = aiResponse.resume;
          } else {
            // If no resume field, stringify the whole response
            resumeContent = JSON.stringify(aiResponse);
          }
        } else {
          throw new Error('Unexpected response format from AI service');
        }
        
        // Check if response is valid
        if (!resumeContent || resumeContent.trim() === '') {
          throw new Error('Empty content received from AI service');
        }
        
        // For debugging: Log a portion of the content
        logger.info(`Extracted resume content (first 100 chars): ${resumeContent.substring(0, 100)}...`);
        
        // Store the content
        resume.customizedContent = resumeContent;
      } catch (contentError) {
        logger.error(`Failed to extract resume content: ${contentError.message}`);
        logger.error(`Raw AI response: ${JSON.stringify(aiResponse)}`);
        throw new Error(`Failed to process AI response: ${contentError.message}`);
      }
      
      // Step 4: Generate PDF from customized content
      logger.info(`Generating PDF for customized resume ${resumeId}`);
      const pdfBuffer = await generatePdfFromMarkdown(resume.customizedContent);
      
      // Step 5: Upload customized PDF to storage
      logger.info(`Uploading customized PDF for resume ${resumeId}`);
      const customizedFileName = `${resume.userId}/customized_${crypto.randomBytes(8).toString('hex')}.pdf`;
      const customizedS3Url = await storageService.uploadFile(
        pdfBuffer,
        customizedFileName,
        'application/pdf'
      );
      
      // Step 6: Update resume with customized PDF location
      resume.customizedS3Key = customizedFileName;
      resume.customizedS3Url = customizedS3Url;
      resume.customizationStatus = 'completed';
      resume.customizationCompletedAt = new Date();
      
      await resume.save();
      
      logger.info(`Resume customization job ${job.id} completed successfully`);
      
      return {
        resumeId: resume.id,
        status: 'completed',
        customizedS3Url
      };
    } catch (error) {
      logger.error(`Resume customization job ${job.id} failed: ${error.message}`);
      
      try {
        // Update resume status to failed
        const resume = await Resume.findByPk(resumeId);
        if (resume) {
          resume.customizationStatus = 'failed';
          resume.customizationError = error.message;
          await resume.save();
        }
      } catch (updateError) {
        logger.error(`Failed to update resume status: ${updateError.message}`);
      }
      
      // Rethrow error to mark job as failed
      throw error;
    }
  });

  logger.info('Resume customization worker initialized successfully');
} catch (error) {
  logger.error(`Failed to initialize resume customization worker: ${error.message}`);
}

/**
 * Add resume customization job to queue
 */
const queueResumeCustomization = async (resumeId) => {
  try {
    const job = await queueService.addJob(
      'resume-customization',
      { resumeId },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    );
    
    logger.info(`Resume customization job ${job.id} added to queue for resume ${resumeId}`);
    
    return job.id;
  } catch (error) {
    logger.error(`Failed to queue resume customization for ${resumeId}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  queueResumeCustomization
};
