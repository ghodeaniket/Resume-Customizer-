#!/bin/bash

# Development startup script for resume-customizer-backend
# This script starts the development environment with Docker services

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Resume Customizer Development Environment${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"

# Step 1: Start Docker services
echo -e "${GREEN}Starting Docker services...${NC}"
docker-compose -f docker-compose.dev.yml up -d

# Check if Docker services started successfully
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to start Docker services. Check Docker installation.${NC}"
    exit 1
fi

# Step 2: Wait for services to be ready
echo -e "${GREEN}Waiting for services to be ready...${NC}"
sleep 5

# Step 3: Initialize MinIO bucket
echo -e "${GREEN}Setting up MinIO bucket...${NC}"
docker run --rm --network host minio/mc \
  config host add local http://localhost:9000 minioadmin minioadmin && \
  docker run --rm --network host minio/mc \
  mb local/resume-customizer-bucket

# Step 4: Set .env file for development
echo -e "${GREEN}Configuring development environment...${NC}"
cat > .env.dev << EOL
# Server Configuration
NODE_ENV=development
PORT=3005

# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/resume_customizer

# JWT
JWT_SECRET=development-jwt-secret-key
JWT_EXPIRES_IN=7d

# AWS S3 - using MinIO in development
AWS_BUCKET_NAME=resume-customizer-bucket
AWS_REGION=us-east-1
AWS_ENDPOINT=http://localhost:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_FORCE_PATH_STYLE=true

# N8N
N8N_WEBHOOK_URL=http://localhost:5678/webhook
N8N_WEBHOOK_PATH=customize-resume-ai

# Redis (for Bull queue)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Public URL
PUBLIC_URL=http://localhost:3005

# Customization defaults
CUSTOMIZATION_TIMEOUT_MS=30000
CUSTOMIZATION_MAX_RETRIES=2
EOL

echo -e "${GREEN}Created .env.dev configuration file${NC}"

# Step 5: Start the Node.js application
echo -e "${GREEN}Starting the application...${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}The server will start now. Press Ctrl+C to stop.${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"

# Use the development env file
export $(cat .env.dev | grep -v '#' | xargs)

# Start the application with Nodemon
npx nodemon src/app.js
