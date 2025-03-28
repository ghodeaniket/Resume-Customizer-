const express = require('express');
const resumeController = require('../controllers/resumeController');
const authMiddleware = require('../middleware/authMiddleware');
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
 * components:
 *   schemas:
 *     Resume:
 *       type: object
 *       required:
 *         - name
 *         - fileType
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The auto-generated ID of the resume
 *         userId:
 *           type: string
 *           format: uuid
 *           description: The ID of the user who owns this resume
 *         name:
 *           type: string
 *           description: Resume name/title
 *         description:
 *           type: string
 *           description: Resume description
 *         originalFileName:
 *           type: string
 *           description: Original file name
 *         s3Url:
 *           type: string
 *           format: uri
 *           description: URL to the resume file in S3
 *         fileType:
 *           type: string
 *           enum: [pdf, doc, docx]
 *           description: File type
 *         fileSize:
 *           type: integer
 *           description: File size in bytes
 *         markdownContent:
 *           type: string
 *           description: Resume content in markdown format
 *         isPublic:
 *           type: boolean
 *           description: Whether the resume is publicly accessible
 *         lastModified:
 *           type: string
 *           format: date-time
 *           description: Last modified timestamp
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Update timestamp
 */

/**
 * @swagger
 * /resumes:
 *   get:
 *     summary: Get all resumes for the current user
 *     tags: [Resumes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of resumes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: integer
 *                   description: Number of resumes
 *                 data:
 *                   type: object
 *                   properties:
 *                     resumes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Resume'
 */
router.get('/', resumeController.getAllResumes);

/**
 * @swagger
 * /resumes/{id}:
 *   get:
 *     summary: Get a specific resume
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
 *         description: Resume details
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
 *                     resume:
 *                       $ref: '#/components/schemas/Resume'
 *       404:
 *         description: Resume not found
 */
router.get('/:id', resumeController.getResume);

/**
 * @swagger
 * /resumes:
 *   post:
 *     summary: Upload a new resume
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
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Resume file (PDF, DOC, DOCX)
 *               name:
 *                 type: string
 *                 description: Resume name/title
 *               description:
 *                 type: string
 *                 description: Resume description
 *     responses:
 *       201:
 *         description: Resume uploaded successfully
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
 *                   example: Resume uploaded successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     resume:
 *                       $ref: '#/components/schemas/Resume'
 *       400:
 *         description: Invalid file format or missing file
 */
router.post('/', upload.single('file'), resumeController.uploadResume);

/**
 * @swagger
 * /resumes/{id}:
 *   put:
 *     summary: Update resume details
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Resume updated successfully
 *       404:
 *         description: Resume not found
 */
router.put('/:id', resumeController.updateResume);

/**
 * @swagger
 * /resumes/{id}:
 *   delete:
 *     summary: Delete a resume
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
 *       204:
 *         description: Resume deleted successfully
 *       404:
 *         description: Resume not found
 */
router.delete('/:id', resumeController.deleteResume);

/**
 * @swagger
 * /resumes/{id}/convert:
 *   post:
 *     summary: Convert resume to markdown
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
 *         description: Resume converted to markdown successfully
 *       404:
 *         description: Resume not found
 */
router.post('/:id/convert', resumeController.convertToMarkdown);

/**
 * @swagger
 * /resumes/{id}/customize:
 *   post:
 *     summary: Customize resume based on job description
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobDescription
 *             properties:
 *               jobDescription:
 *                 type: string
 *               jobTitle:
 *                 type: string
 *               companyName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resume customized successfully
 *       404:
 *         description: Resume not found
 */
router.post('/:id/customize', resumeController.customizeResume);

/**
 * @swagger
 * /resumes/{id}/share:
 *   post:
 *     summary: Share a resume (make it public/private)
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isPublic
 *             properties:
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Resume sharing status updated
 *       404:
 *         description: Resume not found
 */
router.post('/:id/share', resumeController.shareResume);

/**
 * @swagger
 * /resumes/{id}/public-link:
 *   get:
 *     summary: Get public link for a shared resume
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
 *         description: Public link retrieved successfully
 *       404:
 *         description: Resume not found
 *       400:
 *         description: Resume is not shared publicly
 */
router.get('/:id/public-link', resumeController.getPublicLink);

module.exports = router;