const express = require('express');
const resumeController = require('../controllers/resumeController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');
const multer = require('multer');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only pdf, doc, docx
    if (
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/msword' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Only PDF, DOC, and DOCX files are allowed.'), false);
    }
  },
});

const router = express.Router();

// All routes require authentication
router.use(authMiddleware.protect);

/**
 * @swagger
 * /api/v1/resumes/customize:
 *   post:
 *     summary: Upload and customize resume in one step
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - jobDescription
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Resume file (PDF, DOC, DOCX)
 *               jobDescription:
 *                 type: string
 *                 description: Job description text
 *               jobTitle:
 *                 type: string
 *                 description: Job title
 *               companyName:
 *                 type: string
 *                 description: Company name
 *               name:
 *                 type: string
 *                 description: Custom name for the resume
 *     responses:
 *       202:
 *         description: Resume customization in progress
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
 *                   example: Resume customization in progress
 *                 data:
 *                   type: object
 *                   properties:
 *                     resumeId:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       enum: [pending, processing, completed, failed]
 *                     estimatedTimeSeconds:
 *                       type: integer
 *       400:
 *         description: Invalid file format, missing file, or missing job description
 */
router.post(
  '/customize', 
  upload.single('file'), 
  validationMiddleware.validateCustomizeRequest,
  resumeController.uploadAndCustomize
);

/**
 * @swagger
 * /api/v1/resumes/{id}/status:
 *   get:
 *     summary: Get customization status
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Resume ID
 *     responses:
 *       200:
 *         description: Customization status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, processing, completed, failed]
 *                     progress:
 *                       type: integer
 *                       minimum: 0
 *                       maximum: 100
 *                     error:
 *                       type: string
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *                     canDownload:
 *                       type: boolean
 *                     downloadUrl:
 *                       type: string
 *       404:
 *         description: Resume not found
 */
router.get(
  '/:id/status', 
  validationMiddleware.validateResumeId,
  resumeController.getCustomizationStatus
);

/**
 * @swagger
 * /api/v1/resumes/{id}/download:
 *   get:
 *     summary: Download resume (original or customized)
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Resume ID
 *       - in: query
 *         name: version
 *         schema:
 *           type: string
 *           enum: [original, customized]
 *           default: customized
 *         description: Which version to download
 *     responses:
 *       200:
 *         description: Resume file download
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Customization not completed
 *       404:
 *         description: Resume not found
 */
router.get(
  '/:id/download', 
  validationMiddleware.validateDownloadRequest,
  resumeController.downloadResume
);

module.exports = router;