# Development Setup Guide

This guide explains how to set up the development environment for the Resume Customizer Backend.

## Prerequisites

- Node.js (v14 or later)
- Docker and Docker Compose
- Git

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Development Environment

We use Docker to provide consistent development environments. The following services are included:

- **PostgreSQL**: Database
- **Redis**: Queue management
- **MinIO**: S3-compatible storage
- **Mock N8N API**: Simulates the n8n webhook for resume customization

### 3. Start Development Environment

```bash
# Start all services with Docker
npm run docker:up

# Start the application with proper environment
npm run dev:docker
```

Alternatively, you can start individual components:

```bash
# Start just the Docker services
npm run docker:up

# Start just the Node.js application
npm run dev
```

### 4. Testing

Tests use mock implementations instead of real services. The mocks are located in `tests/mocks/services/`.

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Project Structure

- `src/`: Application source code
  - `controllers/`: Request handlers
  - `middleware/`: Express middleware
  - `models/`: Database models
  - `routes/`: API routes
  - `services/`: Business logic
    - `implementations/`: Actual service implementations
  - `utils/`: Utility functions
  - `workers/`: Background job processors
  
- `tests/`: Test files
  - `mocks/`: Mock implementations for testing
  - `unit/`: Unit tests
  - `integration/`: Integration tests
  - `e2e/`: End-to-end tests

- `dev/`: Development support files
  - `mock-n8n/`: Mock N8N API for development

## Environment Variables

Create a `.env` file based on `.env.example` with appropriate values for your environment.

For local development, the `dev-start.sh` script will create an appropriate `.env.dev` file.

## Accessing Development Services

- **API**: http://localhost:3005
- **Swagger Documentation**: http://localhost:3005/api-docs
- **MinIO Console**: http://localhost:9001 (login: minioadmin/minioadmin)
- **Mock N8N API**: http://localhost:5678

## Cleaning Up

When you're done, you can stop the Docker services:

```bash
npm run docker:down
```
