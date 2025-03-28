const swaggerJsDoc = require('swagger-jsdoc');

// Replace all /api/v1 prefixes in the paths with empty strings
function stripApiV1Prefix(spec) {
  if (spec.paths) {
    const newPaths = {};
    for (const path in spec.paths) {
      const newPath = path.replace(/^\/api\/v1/, '');
      newPaths[newPath] = spec.paths[path];
    }
    spec.paths = newPaths;
  }
  return spec;
}

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Resume Customizer API',
      version: '1.0.0',
      description: 'API documentation for Resume Customizer Backend',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `${process.env.PUBLIC_URL || 'http://localhost:3004'}/api/v1`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

// Generate the docs and then transform them
const swaggerSpec = swaggerJsDoc(options);
module.exports = stripApiV1Prefix(swaggerSpec);