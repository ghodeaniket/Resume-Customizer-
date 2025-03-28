const express = require('express');
const router = express.Router();

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
      redis: process.env.REDIS_HOST ? 'Configured' : 'Not configured'
    }
  });
});

module.exports = router;