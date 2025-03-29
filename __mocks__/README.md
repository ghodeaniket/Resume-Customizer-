# Mock Implementations for Testing and Development

This directory contains mock implementations of various services, models, and utilities used by the application. These mocks are intended for:

1. **Development**: When working without the real services (S3, database, etc.)
2. **Testing**: For unit and integration tests that should not depend on external services

## Directory Structure

- `__mocks__/`
  - `models/` - Mock database models
  - `services/` - Mock service implementations
  - `utils/` - Utility mocks (S3, queue, N8N, data store)
  - `README.md` - This file

## Using Mocks

The mocks are used automatically when:

1. `process.env.NODE_ENV === 'development'` and `process.env.MOCK_SERVICES === 'true'`
2. In test environments

You can enable mocks by setting the appropriate environment variables in your `.env` file:

```
NODE_ENV=development
MOCK_SERVICES=true
```

## Mock Implementation Details

### Models

Mock models simulate database operations in memory. They provide the same API as Sequelize models but store data in memory arrays that persist only during the application's runtime.

### Services

Mock services provide identical APIs to their real counterparts but with simpler implementations that don't require external dependencies:

- `aiService.js` - Simulates AI customization with pre-defined templates
- `queueService.js` - In-memory job queue with processing simulation
- `storageService.js` - In-memory file storage that mimics S3 operations

### Utils

Various utility mocks for:

- `mockDataStore.js` - A shared data store for all mocks
- `n8nMock.js` - Mock implementation of N8N API client
- `queueMock.js` - Alternative mock queue implementation
- `s3Mock.js` - S3 service mock

## Guidelines for Mock Development

When creating or updating mocks:

1. Keep the API identical to the real implementation
2. Add clear logging to indicate when mocks are being used
3. Make mocks deterministic and reliable
4. Keep mocks simple, but realistic enough for development and testing
5. Add proper documentation and type definitions
6. Include error simulation capabilities where appropriate
7. Use dependency injection rather than direct imports

## Warning

NEVER import mock implementations in production code. Mocks should only be used through the service factory pattern, which ensures they are only used in development and testing environments.