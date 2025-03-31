const serverless = require('serverless-http');
const app = require('./app');

// Wrap express app with better error logging
const handler = serverless(app);

module.exports.handler = async (event, context) => {
  try {
    // Add request logging for debugging
    console.log('Request Event:', JSON.stringify({
      path: event.path,
      httpMethod: event.httpMethod,
      headers: event.headers,
      queryStringParameters: event.queryStringParameters,
      // Don't log body to avoid sensitive data in logs
      bodyPresent: !!event.body
    }));
    
    // Check if all required environment variables are set
    const requiredEnvVars = [
      'JWT_SECRET', 
      'DATABASE_URL',
      'AWS_BUCKET_NAME', 
      'AWS_REGION',
      'N8N_WEBHOOK_URL',
      'REDIS_HOST'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      console.error('Missing required environment variables:', missingEnvVars);
    }
    
    // Log all environment variables (excluding sensitive ones) for debugging
    console.log('Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'set (hidden)' : 'not set',
      JWT_SECRET: process.env.JWT_SECRET ? 'set (hidden)' : 'not set',
      AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
      AWS_REGION: process.env.AWS_REGION,
      N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: process.env.REDIS_PORT,
      PUBLIC_URL: process.env.PUBLIC_URL,
      FALLBACK_TO_MOCK: process.env.FALLBACK_TO_MOCK
    });
    
    return await handler(event, context);
  } catch (error) {
    console.error('FATAL ERROR:', error);
    console.error('EVENT:', JSON.stringify(event));
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      body: JSON.stringify({
        message: 'Internal server error',
        errorType: error.name,
        errorMessage: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      })
    };
  }
};
