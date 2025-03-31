# Serverless Deployment Guide

This guide explains how to deploy the Resume Customizer backend using AWS Serverless architecture with AWS Lambda, API Gateway, DynamoDB, and S3.

## Architecture Overview

The serverless architecture uses:
- **AWS Lambda + API Gateway**: For hosting the Express.js application
- **DynamoDB**: For database storage (replacing PostgreSQL)
- **S3**: For storing resume files and other assets
- **AWS SSM Parameter Store**: For storing configuration and environment variables

## Estimated Costs

This setup is estimated to cost approximately $5-10/month, with most components staying within the AWS free tier:
- **AWS Lambda + API Gateway**: Likely free tier (1M requests/month free, 400,000 GB-seconds compute time)
- **DynamoDB**: Likely free tier (25GB storage and 25 RCUs/WCUs free)
- **S3**: Essentially free for typical usage (small files, low traffic)

## Prerequisites

1. AWS Account
2. AWS CLI installed and configured with appropriate credentials
3. Serverless Framework installed: `npm install -g serverless`
4. Node.js and npm

## Setup AWS SSM Parameters

Before deployment, you need to set up the following parameters in AWS SSM Parameter Store:

```bash
# Set required parameters for each environment (dev, staging, production)
aws ssm put-parameter --name "/resume-customizer/dev/db/host" --value "dynamodb" --type String
aws ssm put-parameter --name "/resume-customizer/dev/db/name" --value "resume-customizer-dev-resumes" --type String
aws ssm put-parameter --name "/resume-customizer/dev/db/user" --value "not-used-with-dynamodb" --type String
aws ssm put-parameter --name "/resume-customizer/dev/db/password" --value "not-used-with-dynamodb" --type SecureString
aws ssm put-parameter --name "/resume-customizer/dev/jwt/secret" --value "your-secure-jwt-secret" --type SecureString

# Repeat for staging and production environments
```

## GitHub Actions Setup

The GitHub Actions workflow is configured to deploy the application to AWS using the serverless framework. To enable the workflow, you need to add the following secrets to your GitHub repository:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `AWS_REGION`: Your AWS region (e.g., us-east-1)

## Manual Deployment

If you want to deploy manually:

1. Install dependencies:
   ```bash
   npm ci
   ```

2. Deploy to AWS:
   ```bash
   # Deploy to dev environment
   npm run deploy:dev
   
   # Deploy to staging environment
   npm run deploy:staging
   
   # Deploy to production environment
   npm run deploy:prod
   ```

3. Remove a deployment:
   ```bash
   # Remove the current stage's deployment
   npm run remove
   ```

## Local Development with Serverless

For local development with the serverless setup:

1. Install additional plugins:
   ```bash
   npm install --save-dev serverless-offline serverless-dynamodb-local
   ```

2. Add the following to the `plugins` section in `serverless.yml`:
   ```yaml
   plugins:
     - serverless-offline
     - serverless-dynamodb-local
   ```

3. Run the application locally:
   ```bash
   serverless offline start
   ```

## Adapting the Application for Serverless

The main application has been adapted for serverless deployment through the following changes:

1. Created a `src/serverless.js` file that wraps the Express app with `serverless-http`
2. Updated database connections to work with DynamoDB instead of PostgreSQL
3. Configured environment variables to be retrieved from SSM Parameter Store
4. Adjusted file storage to use S3 instead of local filesystem

## Monitoring and Logging

- **CloudWatch Logs**: AWS Lambda automatically sends logs to CloudWatch
- **X-Ray**: Can be enabled for tracing requests through the application
- **CloudWatch Metrics**: Monitor Lambda invocations, duration, and errors

## Scaling

The serverless architecture scales automatically:
- Lambda functions scale with the number of requests
- DynamoDB scales with the provisioned capacity or on-demand settings
- API Gateway handles high traffic without configuration

No manual scaling or server maintenance is required.
