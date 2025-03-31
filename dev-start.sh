#!/bin/bash

# Enhanced development startup script for resume-customizer-backend
# This script starts the development environment with Docker services

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Resume Customizer Development Environment${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Step 1: Check for environment file
if [ ! -f ".env.dev" ]; then
    echo -e "${YELLOW}Creating .env.dev file from template...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env.dev
        echo -e "${GREEN}Created .env.dev file from template${NC}"
    else
        echo -e "${RED}.env.example file not found. Creating minimal .env.dev...${NC}"
        cat > .env.dev << EOL
# Server Configuration
NODE_ENV=development
PORT=3000
PUBLIC_URL=http://localhost:3005

# Database
DATABASE_URL=postgres://postgres:postgres@postgres:5432/resume_customizer

# JWT
JWT_SECRET=development-jwt-secret-key
JWT_EXPIRES_IN=7d

# AWS S3 - using MinIO in development
AWS_BUCKET_NAME=resume-customizer-bucket
AWS_REGION=us-east-1
AWS_ENDPOINT=http://minio:9000
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_FORCE_PATH_STYLE=true

# N8N
N8N_WEBHOOK_URL=http://mock-n8n:5678/webhook
N8N_WEBHOOK_PATH=customize-resume-ai

# Redis (for Bull queue)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Customization defaults
CUSTOMIZATION_TIMEOUT_MS=30000
CUSTOMIZATION_MAX_RETRIES=2

# Logging
LOG_LEVEL=debug
EOL
    fi
fi

echo -e "${GREEN}Using environment variables from .env.dev${NC}"

# Step 2: Check for .dockerignore
if [ ! -f ".dockerignore" ]; then
    echo -e "${YELLOW}Creating .dockerignore file...${NC}"
    cat > .dockerignore << EOL
# Git
.git
.gitignore

# Node.js
node_modules
npm-debug.log
coverage
.nyc_output

# Environment
.env
.env.*
!.env.example

# Docker
Dockerfile*
docker-compose*
.dockerignore

# Logs
logs
*.log

# Test files
__tests__
__mocks__
tests
test
jest.config.js

# Other unnecessary files
.DS_Store
.vscode
*.md
LICENSE
.github
EOL
    echo -e "${GREEN}Created .dockerignore file${NC}"
fi

# Step 3: Start Docker services
echo -e "${GREEN}Starting Docker services...${NC}"
docker-compose -f docker-compose.dev.yml up -d --build

# Check if Docker services started successfully
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to start Docker services. Check Docker logs.${NC}"
    exit 1
fi

# Step 4: Wait for services to be ready and monitor health
echo -e "${GREEN}Waiting for services to be ready...${NC}"

check_health() {
    local SERVICE=$1
    local MAX_ATTEMPTS=$2
    local ATTEMPT=1
    
    echo -e "${BLUE}Checking health of $SERVICE...${NC}"
    
    while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
        if docker-compose -f docker-compose.dev.yml ps | grep "$SERVICE" | grep -q "(healthy)"; then
            echo -e "${GREEN}$SERVICE is healthy!${NC}"
            return 0
        fi
        echo -e "${YELLOW}Attempt $ATTEMPT/$MAX_ATTEMPTS: $SERVICE not yet healthy, waiting...${NC}"
        sleep 5
        ATTEMPT=$((ATTEMPT + 1))
    done
    
    echo -e "${RED}$SERVICE failed to become healthy after $MAX_ATTEMPTS attempts.${NC}"
    return 1
}

check_health "postgres" 12 || { echo -e "${RED}Database failed to start. Exiting.${NC}"; exit 1; }
check_health "redis" 6 || { echo -e "${RED}Redis failed to start. Exiting.${NC}"; exit 1; }
check_health "minio" 6 || { echo -e "${RED}MinIO failed to start. Exiting.${NC}"; exit 1; }
check_health "mock-n8n" 6 || { echo -e "${RED}Mock N8N failed to start. Exiting.${NC}"; exit 1; }

# Step 5: Initialize MinIO bucket
echo -e "${GREEN}Setting up MinIO bucket...${NC}"

# Source environment variables
source .env.dev

docker run --rm --network resume-customizer-network minio/mc \
  config host add local http://minio:9000 ${AWS_ACCESS_KEY_ID:-minioadmin} ${AWS_SECRET_ACCESS_KEY:-minioadmin}

docker run --rm --network resume-customizer-network minio/mc \
  mb local/${AWS_BUCKET_NAME:-resume-customizer-bucket} --ignore-existing

# Step 6: Show service information
echo -e "${GREEN}Development environment ready!${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Services available:${NC}"
echo -e "${BLUE}Backend API:${NC} http://localhost:3005"
echo -e "${BLUE}MinIO Console:${NC} http://localhost:9001 (login: minioadmin/minioadmin)"
echo -e "${BLUE}Adminer:${NC} http://localhost:8080 (server: postgres, login: postgres/postgres)"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"

# Step 7: Tail logs
echo -e "${GREEN}Tailing logs from Docker containers. Press Ctrl+C to stop.${NC}"
docker-compose -f docker-compose.dev.yml logs -f
