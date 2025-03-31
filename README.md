# Resume Customizer Backend

[![CI Status](https://github.com/ghodeaniket/Resume-Customizer-/actions/workflows/ci.yml/badge.svg)](https://github.com/ghodeaniket/Resume-Customizer-/actions/workflows/ci.yml)
[![CD Status](https://github.com/ghodeaniket/Resume-Customizer-/actions/workflows/cd.yml/badge.svg)](https://github.com/ghodeaniket/Resume-Customizer-/actions/workflows/cd.yml)

This is the backend API for the Resume Customizer application, which helps users customize their resumes for specific job applications using AI and automation.

## Features

- User authentication and authorization (JWT)
- Resume storage and management (upload, update, delete)
- PDF to Markdown conversion
- Resume customization based on job descriptions
- Multiple AI service implementations (n8n workflow or direct LLM API)
- API documentation with Swagger/OpenAPI
- Monitoring with Prometheus and Grafana
- Comprehensive testing setup

## Tech Stack

- Node.js & Express.js
- PostgreSQL with Sequelize ORM
- JWT for authentication
- AWS S3 for file storage
- n8n for automation workflows
- Direct LLM integration (OpenRouter, OpenAI, Anthropic)
- Swagger for API documentation
- Prometheus and Grafana for monitoring
- Docker and Docker Compose for containerization
- Nginx for production deployment

## AI Service Implementations

The application supports two different implementations for the AI resume customization service:

1. **n8n Workflow Implementation** - Uses an external n8n workflow with 3 steps:
   - Profiler: Analyzes the resume to create a comprehensive professional profile
   - Researcher: Analyzes the job description to extract requirements
   - Resume Strategist: Creates a tailored resume based on the profile and job requirements

2. **Direct LLM Implementation** - Directly calls LLM APIs to perform the same 3-step process:
   - Supports multiple LLM providers (OpenRouter, OpenAI, Anthropic)
   - No external n8n dependency required
   - Same high-quality results with better control

You can switch between implementations using the `AI_SERVICE_IMPLEMENTATION` environment variable:
- `AI_SERVICE_IMPLEMENTATION=n8n` - Use the n8n workflow (default)
- `AI_SERVICE_IMPLEMENTATION=direct_llm` - Use direct LLM API calls

## Dockerized Setup

The application is fully dockerized for consistent development and production environments:

### Development Environment

```bash
# Start the development environment with all services (PostgreSQL, Redis, MinIO, Mock N8N)
npm run dev:docker

# Or start just the Docker services
npm run docker:up

# Start in detached mode and manually start the server
npm run docker:up
npm run dev

# Stop environment
npm run docker:down
```

For detailed development setup instructions, see [DEV_SETUP.md](DEV_SETUP.md).

## Security Notes

See [SECURITY.md](SECURITY.md) for information about security considerations and known vulnerabilities.

The project uses `serverless-dynamodb-local` for local development, which has some known dependencies with security vulnerabilities. These have been addressed in one of the following ways:
1. Using a fixed version (0.1.1) of the package with fewer vulnerabilities
2. Configuring npm audit to ignore development dependencies in CI pipeline
3. Setting `audit=false` in `.npmrc` to prevent audit failures while still showing audit information

### Production Environment

```bash
# Build and start production environment
./docker-compose.sh -e prod -a build
./docker-compose.sh -e prod -a up -d

# View logs
./docker-compose.sh -e prod -a logs
```

### Monitoring Environment

```bash
# Start monitoring (Prometheus + Grafana)
./docker-compose.sh -e monitoring -a up -d
```

### Docker Compose Environment Variables

Create a `.env` file in the project root with the following variables:

```
# Database
POSTGRES_USER=username
POSTGRES_PASSWORD=password
POSTGRES_DB=database

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-resume-bucket

# AI Service Implementation
AI_SERVICE_IMPLEMENTATION=n8n  # or direct_llm

# n8n (when using n8n implementation)
N8N_WEBHOOK_URL=http://n8n:5678
N8N_WEBHOOK_PATH=/webhook/customize-resume-ai
N8N_TIMEOUT_MS=120000
N8N_MAX_RETRIES=3

# LLM API (when using direct_llm implementation)
LLM_API_KEY=your_llm_api_key
LLM_API_BASE_URL=https://openrouter.ai/api
LLM_MODEL_NAME=deepseek/deepseek-r1-distill-llama-70b
LLM_TIMEOUT_MS=120000
```

## Manual Setup (Without Docker)

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- AWS account (for S3 storage)
- n8n instance or LLM API access (depending on implementation)

### Installation

1. Clone the repository
   ```
   git clone <repository-url>
   cd resume-customizer-backend
   ```

2. Copy the example environment file and update it with your values
   ```
   cp .env.example .env
   ```

3. Install dependencies
   ```
   npm install
   ```

4. Run database migrations and seed data
   ```
   npm run db:migrate
   npm run db:seed
   ```

5. Start the application
   ```
   npm run dev
   ```

6. The API will be available at http://localhost:3000/api/v1

## API Documentation

API documentation is available at http://localhost:3000/api-docs when the server is running. It provides detailed information about all endpoints, request/response formats, and authentication requirements.

## Database Migrations

We use Sequelize migrations to manage database schema changes:

```
# Run pending migrations
npm run db:migrate

# Create a new migration
npx sequelize-cli migration:generate --name migration-name

# Undo the last migration
npx sequelize-cli db:migrate:undo

# Seed the database with initial data
npm run db:seed
```

## Testing

The project includes unit and integration tests with proper mocks for all external services. Run them with:

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Run tests with coverage report
npm run test:coverage

# Run tests in CI mode
npm run test:ci
```

All tests use mock implementations of external services (storage, queue, AI) to ensure they can run without dependencies and provide consistent results. The mock implementations are in the `tests/mocks/services` directory.

For manual API testing, we provide a Postman collection in the `postman` directory:
- `Resume-Customizer-API.postman_collection.json`
- `Resume-Customizer-Environment.postman_environment.json`

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions, including production deployment considerations.

## Directory Structure

```
/resume-customizer-backend
│
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── migrations/      # Database migrations
│   ├── models/          # Sequelize models
│   ├── monitoring/      # Prometheus metrics
│   ├── routes/          # API routes
│   ├── seeders/         # Database seed data
│   ├── services/        # Business logic
│   │   ├── factories/   # Service factories
│   │   ├── interfaces/  # Service interfaces
│   │   ├── implementations/ # Service implementations
│   │   └── serviceRegistry.js # Service registry
│   ├── tests/           # Unit and integration tests
│   ├── utils/           # Utility functions
│   └── app.js           # Express application setup
│
├── monitoring/          # Monitoring configuration
├── nginx/               # Nginx configuration for production
│   ├── conf/            # Configuration files
│   └── certbot/         # SSL certificates
│
├── postman/             # Postman collection for API testing
├── secrets/             # Secret files for production (not committed)
│
├── .env.example         # Example environment variables
├── .sequelizerc         # Sequelize CLI configuration
├── .gitignore           # Git ignored files
├── Dockerfile           # Multi-stage Docker build
├── docker-compose.yml   # Base Docker Compose configuration
├── docker-compose.dev.yml   # Development overrides
├── docker-compose.prod.yml  # Production overrides
├── docker-compose.monitoring.yml # Monitoring stack
├── docker-compose.sh    # Helper script for Docker environments
├── package.json         # Dependencies and scripts
├── DEPLOYMENT.md        # Deployment instructions
└── README.md            # Project documentation
```

## License

[MIT](LICENSE)
