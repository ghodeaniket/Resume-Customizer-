const express = require('express');
const n8nController = require('../controllers/n8nController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /n8n/webhook:
 *   post:
 *     summary: Webhook endpoint for n8n to call
 *     tags: [n8n]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 description: Webhook type
 *               action:
 *                 type: string
 *                 description: Action performed
 *               data:
 *                 type: object
 *                 description: Webhook payload data
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook data
 */
router.post('/webhook', n8nController.handleWebhook);

// Below routes require authentication
router.use(authMiddleware.protect);

/**
 * @swagger
 * /n8n/trigger/{workflowId}:
 *   post:
 *     summary: Trigger an n8n workflow
 *     tags: [n8n]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID to trigger
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Data to pass to the workflow
 *     responses:
 *       200:
 *         description: Workflow triggered successfully
 *       400:
 *         description: Invalid workflow ID or data
 */
router.post('/trigger/:workflowId', n8nController.triggerWorkflow);

/**
 * @swagger
 * /n8n/status/{executionId}:
 *   get:
 *     summary: Get workflow execution status
 *     tags: [n8n]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Execution ID to check
 *     responses:
 *       200:
 *         description: Workflow execution status
 *       400:
 *         description: Invalid execution ID
 */
router.get('/status/:executionId', n8nController.getWorkflowStatus);

/**
 * @swagger
 * /n8n/workflows:
 *   get:
 *     summary: Get all available workflows
 *     tags: [n8n]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available workflows
 */
router.get('/workflows', n8nController.getWorkflows);

module.exports = router;