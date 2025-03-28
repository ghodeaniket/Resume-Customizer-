const { resumeQueue } = require('../config/queue');
const Resume = require('../models/resume');
const { getFile, uploadFile } = require('../config/s3');
const convertPdfToMarkdown = require('../utils/convertPdfToMarkdown');
const logger = require('../utils/logger');
const n8nClient = require('../utils/n8nClient');
const { generatePdfFromMarkdown } = require('../utils/pdfGenerator');
const crypto = require('crypto');

// Skip worker initialization if resumeQueue is not available
if (!resumeQueue) {
  logger.warn('Resume queue not available. Worker will not be initialized.');
  module.exports = {
    queueResumeCustomization: async (resumeId) => {
      logger.warn(`Mock queue used for resume ${resumeId}`);
      return 'mock-job-id';
    }
  };
} else {
  /**
   * Process resume customization job
   */
  resumeQueue.process(async (job) => {
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
          // Get file from S3
          const fileBuffer = await getFile(resume.s3Key);
          
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
      
      // Step 2: Call n8n webhook for AI customization
      logger.info(`Sending resume ${resumeId} to n8n for customization`);
      const n8nResponse = await n8nClient.customizeResume({
        resumeContent: resume.markdownContent,
        jobDescription: resume.jobDescription,
        jobTitle: resume.jobTitle || '',
        companyName: resume.companyName || ''
      });
      
      // Step 3: Store customized content
      logger.info(`Storing customized content for resume ${resumeId}`);
      resume.customizedContent = n8nResponse.resume;
      
      // Step 4: Generate PDF from customized content
      logger.info(`Generating PDF for customized resume ${resumeId}`);
      const pdfBuffer = await generatePdfFromMarkdown(resume.customizedContent);
      
      // Step 5: Upload customized PDF to S3
      logger.info(`Uploading customized PDF for resume ${resumeId} to S3`);
      const customizedFileName = `${resume.userId}/customized_${crypto.randomBytes(8).toString('hex')}.pdf`;
      const customizedS3Url = await uploadFile(
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

  // Log queue events
  resumeQueue.on('active', job => {
    logger.info(`Resume customization job ${job.id} has started processing`);
  });

  resumeQueue.on('completed', (job, result) => {
    logger.info(`Resume customization job ${job.id} has been completed`);
  });

  resumeQueue.on('failed', (job, err) => {
    logger.error(`Resume customization job ${job.id} has failed with error: ${err.message}`);
  });

  /**
   * Add resume customization job to queue
   */
  const queueResumeCustomization = async (resumeId) => {
    try {
      const job = await resumeQueue.add(
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
}