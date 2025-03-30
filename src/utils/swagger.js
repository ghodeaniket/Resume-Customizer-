/**
 * Swagger/OpenAPI Documentation
 * 
 * This module sets up Swagger/OpenAPI documentation for the API.
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const packageJson = require('../../package.json');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Resume Customizer API',
    version: packageJson.version,
    description: 'API documentation for the Resume Customizer application',
    license: {
      name: 'Private',
      url: 'https://yourcompany.com',
    },
    contact: {
      name: 'API Support',
      url: 'https://yourcompany.com/support',
      email: 'support@yourcompany.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://api.resumecustomizer.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      // Error Schemas
      Error: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'An error occurred',
          },
          code: {
            type: 'string',
            example: 'INTERNAL_ERROR',
          },
          statusCode: {
            type: 'integer',
            example: 500,
          },
        },
      },
      ValidationError: {
        allOf: [
          { $ref: '#/components/schemas/Error' },
          {
            type: 'object',
            properties: {
              errors: {
                type: 'object',
                example: {
                  field1: 'Error message for field1',
                  field2: 'Error message for field2',
                },
              },
            },
          },
        ],
      },
      // Resume Schemas
      ResumeBasic: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          name: {
            type: 'string',
            example: 'Software Developer Resume',
          },
          description: {
            type: 'string',
            example: 'My resume for software development positions',
          },
          fileType: {
            type: 'string',
            example: 'pdf',
          },
          lastModified: {
            type: 'string',
            format: 'date-time',
            example: '2023-01-15T12:00:00Z',
          },
          isPublic: {
            type: 'boolean',
            example: false,
          },
          customizationStatus: {
            type: 'string',
            enum: ['none', 'pending', 'processing', 'completed', 'failed'],
            example: 'completed',
          },
        },
      },
      ResumeDetailed: {
        allOf: [
          { $ref: '#/components/schemas/ResumeBasic' },
          {
            type: 'object',
            properties: {
              originalFileName: {
                type: 'string',
                example: 'John_Doe_Resume.pdf',
              },
              fileSize: {
                type: 'number',
                example: 125644,
              },
              s3Url: {
                type: 'string',
                example: 'https://bucket.s3.amazonaws.com/resume.pdf',
              },
              jobTitle: {
                type: 'string',
                example: 'Software Engineer',
              },
              companyName: {
                type: 'string',
                example: 'Tech Company Inc.',
              },
              customizationCompletedAt: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-16T14:30:00Z',
              },
              customizationError: {
                type: 'string',
                example: null,
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-15T10:00:00Z',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                example: '2023-01-16T14:30:00Z',
              },
            },
          },
        ],
      },
      // User Schemas
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '123e4567-e89b-12d3-a456-426614174000',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'user@example.com',
          },
          firstName: {
            type: 'string',
            example: 'John',
          },
          lastName: {
            type: 'string',
            example: 'Doe',
          },
          lastLogin: {
            type: 'string',
            format: 'date-time',
            example: '2023-01-15T12:00:00Z',
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              message: 'Unauthorized',
              code: 'UNAUTHORIZED',
              statusCode: 401,
            },
          },
        },
      },
      NotFoundError: {
        description: 'The specified resource was not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              message: 'Resource not found',
              code: 'NOT_FOUND',
              statusCode: 404,
              resource: 'resume',
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ValidationError',
            },
            example: {
              message: 'Validation failed',
              code: 'VALIDATION_ERROR',
              statusCode: 400,
              errors: {
                email: 'Email is required',
                password: 'Password must be at least 8 characters',
              },
            },
          },
        },
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              message: 'Internal server error',
              code: 'INTERNAL_ERROR',
              statusCode: 500,
            },
          },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

// Options for the swagger docs
const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../controllers/*.js'),
  ],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(options);

/**
 * Configure Swagger middleware for Express
 * @param {Object} app - Express app
 */
function setupSwagger(app) {
  // Serve swagger docs
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
    })
  );

  // Serve swagger spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

module.exports = {
  setupSwagger,
  swaggerSpec,
};
