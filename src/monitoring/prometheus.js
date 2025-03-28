const promClient = require('prom-client');
const logger = require('../utils/logger');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add default metrics to the registry
promClient.collectDefaultMetrics({ register });

// Custom HTTP metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

// Custom business metrics
const resumeUploads = new promClient.Counter({
  name: 'resume_uploads_total',
  help: 'Total number of resume uploads'
});

const resumeConversions = new promClient.Counter({
  name: 'resume_conversions_total',
  help: 'Total number of resume conversions to markdown'
});

const resumeCustomizations = new promClient.Counter({
  name: 'resume_customizations_total',
  help: 'Total number of resume customizations'
});

const n8nWorkflowTriggers = new promClient.Counter({
  name: 'n8n_workflow_triggers_total',
  help: 'Total number of n8n workflow triggers',
  labelNames: ['workflow_id']
});

// Register the custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(resumeUploads);
register.registerMetric(resumeConversions);
register.registerMetric(resumeCustomizations);
register.registerMetric(n8nWorkflowTriggers);

// Prometheus middleware for Express
const prometheusMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Record end time and calculate duration
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Skip metrics endpoint to avoid recursion
    if (req.path !== '/metrics') {
      // Get route pattern from Express
      const route = req.route ? req.route.path : req.path;
      
      // Observe HTTP request duration
      httpRequestDurationMicroseconds
        .labels(req.method, route, res.statusCode)
        .observe(duration / 1000); // Convert to seconds
    }
  });
  
  next();
};

// Function to connect Prometheus metrics endpoint
const connectPrometheus = (app) => {
  logger.info('Prometheus metrics enabled');
  
  // Expose metrics endpoint
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      logger.error('Error generating metrics:', err);
      res.status(500).end(err);
    }
  });
};

module.exports = {
  register,
  prometheusMiddleware,
  connectPrometheus,
  metrics: {
    resumeUploads,
    resumeConversions,
    resumeCustomizations,
    n8nWorkflowTriggers
  }
};