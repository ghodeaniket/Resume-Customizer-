const express = require('express');
const router = express.Router();
const multer = require('multer');
const convertPdfToMarkdown = require('../utils/convertPdfToMarkdown');
const fs = require('fs');
const logger = require('../utils/logger');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * @swagger
 * /test:
 *   get:
 *     summary: Test if the API is working
 *     tags: [Test]
 *     responses:
 *       200:
 *         description: API is working
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: API is working
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is working',
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV,
      database: process.env.DATABASE_URL ? 'Configured' : 'Not configured',
      aws: process.env.AWS_BUCKET_NAME ? 'Configured' : 'Not configured',
      n8n: process.env.N8N_WEBHOOK_URL ? 'Configured' : 'Not configured',
      redis: process.env.REDIS_HOST ? 'Configured' : 'Not configured',
      mockServices: process.env.MOCK_SERVICES === 'true' ? 'Enabled' : 'Disabled'
    }
  });
});

/**
 * @swagger
 * /test/pdf-parse:
 *   post:
 *     summary: Test PDF parsing
 *     tags: [Test]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Parsed PDF content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 markdown:
 *                   type: string
 */
router.post('/pdf-parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }
    
    // For testing, allow both PDF and text files
    let markdown;
    if (req.file.mimetype === 'application/pdf') {
      // Convert PDF to markdown
      logger.info(`Parsing PDF file: ${req.file.originalname}, size: ${req.file.size} bytes, mimetype: ${req.file.mimetype}`);
      markdown = await convertPdfToMarkdown(req.file.buffer);
    } else if (req.file.mimetype === 'text/plain' || req.file.originalname.endsWith('.txt')) {
      // Just use the text content directly
      logger.info(`Using text file: ${req.file.originalname}, size: ${req.file.size} bytes`);
      markdown = req.file.buffer.toString('utf8');
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Uploaded file must be PDF or text'
      });
    }
    
    res.status(200).json({
      status: 'success',
      markdown
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * @swagger
 * /test/customize:
 *   post:
 *     summary: Test resume customization
 *     tags: [Test]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *               jobDescription:
 *                 type: string
 *     responses:
 *       200:
 *         description: Customized resume content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 customizedResume:
 *                   type: string
 */
router.post('/customize', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No resume file uploaded'
      });
    }
    
    if (!req.body.jobDescription) {
      return res.status(400).json({
        status: 'error',
        message: 'Job description is required'
      });
    }
    
    // Get resume content
    let resumeContent;
    
    logger.info(`Resume file details - Name: ${req.file.originalname}, Size: ${req.file.size} bytes, Type: ${req.file.mimetype}`);
    
    if (req.file.mimetype === 'application/pdf') {
      logger.info('Processing PDF resume');
      resumeContent = await convertPdfToMarkdown(req.file.buffer);
    } else if (req.file.mimetype === 'text/plain' || req.file.originalname.endsWith('.txt')) {
      logger.info('Processing text resume');
      resumeContent = req.file.buffer.toString('utf8');
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Uploaded file must be PDF or text'
      });
    }
    
    // Log the first 200 characters of the resume content
    logger.info(`Resume content (first 200 chars): ${resumeContent.substring(0, 200)}...`);
    
    // Get AI service from service factory
    const aiService = require('../services').ai();
    
    // Call AI service for customization
    logger.info('Calling AI service for customization');
    const customization = await aiService.customizeResume({
      resumeContent,
      jobDescription: req.body.jobDescription,
      jobTitle: req.body.jobTitle || '',
      companyName: req.body.companyName || ''
    });
    
    res.status(200).json({
      status: 'success',
      customizedResume: customization.resume || customization
    });
  } catch (error) {
    logger.error(`Customization error: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Direct test endpoint for debugging
router.get('/debug-resume', (req, res) => {
  try {
    // Load the Aniket resume directly
    const resumePath = '/Users/aniketghode/development/Planned Projects/resume-customizer-backend/aniket-resume.txt';
    const content = fs.readFileSync(resumePath, 'utf8');
    
    res.status(200).json({
      status: 'success',
      resumeContent: content
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;