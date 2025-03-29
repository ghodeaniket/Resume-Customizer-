# Testing Strategy for Resume Customizer Backend

This document outlines the testing approach for the Resume Customizer Backend application. It provides guidelines for what to test, how to test, and best practices to follow.

## Testing Layers

The application has three layers of testing:

1. **Unit Tests** - Test individual components in isolation
2. **Integration Tests** - Test how components work together
3. **End-to-End Tests** - Test the application as a whole

## Unit Testing

Unit tests focus on testing individual components (functions, classes, modules) in isolation from their dependencies.

### What to Mock

- **Always Mock**:
  - External services (S3, AI services, etc.)
  - Database interactions
  - File system operations
  - Network requests
  - Email services
  - Message queues

- **Don't Mock**:
  - Pure utility functions
  - Non-complex business logic
  - Validators

### Unit Testing Guidelines

1. **Test in Isolation**: Use dependency injection and mocks to isolate the unit being tested.
2. **Test Edge Cases**: Include tests for error conditions, edge cases, and corner cases.
3. **Arrange-Act-Assert**: Structure tests with clear setup (Arrange), execution (Act), and verification (Assert) phases.
4. **One Assertion Per Test**: Focus each test on a single behavior or outcome.
5. **Descriptive Test Names**: Use names that describe the behavior being tested.

## Integration Testing

Integration tests verify that different parts of the application work together correctly.

### What to Mock

- **Mock**:
  - External third-party services
  - Slow or resource-intensive operations

- **Don't Mock**:
  - Database (use test database)
  - Internal services
  - Application logic

### Integration Testing Guidelines

1. **Use Test Database**: Run tests against a separate test database.
2. **Clean State**: Each test should start with a clean state.
3. **Realistic Data**: Use realistic test data that reflects actual usage.
4. **Focus on Boundaries**: Test the integration points between components.

## End-to-End Testing

E2E tests verify that the entire application works as expected from the user's perspective.

### What to Mock

- **Mock**:
  - External paid services (e.g., AI services with usage limits)
  - Email services

- **Don't Mock**:
  - Database
  - Internal services
  - Application logic
  - API endpoints

### E2E Testing Guidelines

1. **User Flows**: Test complete user flows (e.g., upload resume, customize, download).
2. **Environment**: Run tests in an environment that closely resembles production.
3. **Regression Focus**: Focus on critical user flows to catch regression issues.

## Setting Up Test Environment

### Prerequisites

1. Install testing dependencies:
   ```bash
   npm install --save-dev jest supertest
   ```

2. Configure Jest:
   - Update `jest.config.js` with appropriate settings
   - Add test scripts in `package.json`

### Environment Variables

Create a `.env.test` file with test-specific configuration:

```bash
NODE_ENV=test
PORT=3001
DATABASE_URL=postgres://postgres:postgres@localhost:5432/resume_customizer_test
JWT_SECRET=test-jwt-secret-key
MOCK_SERVICES=true
```

### Database Setup

For integration and E2E tests, set up a test database:

```bash
npm run db:create:test
npm run db:migrate:test
```

## Writing Tests

### Example Unit Test

```javascript
// src/tests/unit/services/resumeService.test.js
const ResumeService = require('../../../src/services/resumeService');

// Mock dependencies
const mockResumeRepository = {
  findById: jest.fn(),
  // other methods...
};

const mockStorageService = {
  uploadFile: jest.fn(),
  // other methods...
};

// Create service with mocked dependencies
const resumeService = new ResumeService({
  resumeRepository: mockResumeRepository,
  storageService: mockStorageService,
  // other dependencies...
});

describe('ResumeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getResumeById', () => {
    it('should return a resume by ID', async () => {
      // Arrange
      const mockResume = { id: '123', name: 'Test Resume' };
      mockResumeRepository.findById.mockResolvedValue(mockResume);
      
      // Act
      const result = await resumeService.getResumeById('123', 'user1');
      
      // Assert
      expect(mockResumeRepository.findById).toHaveBeenCalledWith('123', 'user1');
      expect(result).toEqual(mockResume);
    });
  });
});
```

### Example Integration Test

```javascript
// src/tests/integration/routes/resume.test.js
const request = require('supertest');
const app = require('../../../src/app');
const container = require('../../../src/config/container');
const { setupTestDatabase, clearTestDatabase } = require('../../utils/dbHelpers');

describe('Resume API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await clearTestDatabase();
  });

  describe('GET /api/v1/resumes/:id', () => {
    it('should return a resume by ID', async () => {
      // Arrange - Set up test data
      const userRepository = container.resolve('userRepository');
      const resumeRepository = container.resolve('resumeRepository');
      
      const user = await userRepository.create({
        // User data...
      });
      
      const resume = await resumeRepository.create({
        userId: user.id,
        name: 'Test Resume',
        // other resume data...
      });
      
      // Get JWT token
      const authResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'password' });
      
      const token = authResponse.body.data.token;
      
      // Act
      const response = await request(app)
        .get(`/api/v1/resumes/${resume.id}`)
        .set('Authorization', `Bearer ${token}`);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.resume.id).toBe(resume.id);
      expect(response.body.data.resume.name).toBe('Test Resume');
    });
  });
});
```

## Best Practices

1. **Test Coverage**: Aim for at least 80% test coverage for critical code paths.
2. **Keep Tests Fast**: Tests should run quickly to encourage frequent testing.
3. **Independent Tests**: Tests should not depend on each other.
4. **Readable Tests**: Tests should be easy to understand and maintain.
5. **CI Integration**: Run tests automatically in CI/CD pipeline.
6. **Test Fixtures**: Use fixtures for common test data.
7. **Mocking Strategy**: Be consistent with what you mock and what you don't.

## Continuous Integration

Set up CI to run tests automatically on pull requests and commits to main branches:

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: resume_customizer_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v2
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    - name: Install dependencies
      run: npm ci
    - name: Run tests
      run: npm run test:ci
      env:
        NODE_ENV: test
        DATABASE_URL: postgres://postgres:postgres@localhost:5432/resume_customizer_test
        JWT_SECRET: test-jwt-secret-key
        MOCK_SERVICES: true
```

## Conclusion

This testing strategy provides a comprehensive approach to testing the Resume Customizer Backend application. By following these guidelines, we can ensure the application is reliable, maintainable, and meets user requirements.

For any questions or suggestions regarding testing, please contact the development team.
