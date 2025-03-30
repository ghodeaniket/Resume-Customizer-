/**
 * Jest test setup file
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.PUBLIC_URL = 'http://localhost:3000';
process.env.AWS_BUCKET_NAME = 'test-bucket';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
process.env.N8N_WEBHOOK_URL = 'http://localhost:5678/webhook';
process.env.N8N_WEBHOOK_PATH = 'customize-resume-ai';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.CUSTOMIZATION_TIMEOUT_MS = '1000';
process.env.CUSTOMIZATION_MAX_RETRIES = '1';
process.env.DATABASE_URL = 'sqlite::memory:';
process.env.MOCK_SERVICES = 'true';

// Create mock job
const mockJob = {
  id: 'mock-job-id',
  data: {},
  opts: {},
  progress: jest.fn(),
  log: jest.fn(),
  moveToCompleted: jest.fn(),
  moveToFailed: jest.fn()
};

// Create mock Queue
class MockQueue {
  constructor() {
    this.handlers = {};
    this.processors = {};
  }

  on(event, handler) {
    this.handlers[event] = handler;
    return this;
  }

  process(jobType, handler) {
    this.processors[jobType] = handler;
    return this;
  }

  add(jobType, data, options = {}) {
    return Promise.resolve({
      id: 'mock-job-id',
      data,
      opts: options
    });
  }

  // Using _jobId to follow the naming convention for unused parameters
  getJob(_jobId) {
    return Promise.resolve(mockJob);
  }

  clean() {
    return Promise.resolve(true);
  }

  close() {
    return Promise.resolve(true);
  }
}

// Mock Bull queue
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => new MockQueue());
});

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn().mockResolvedValue(),
      pdf: jest.fn().mockResolvedValue(Buffer.from('Mock PDF content')),
      close: jest.fn().mockResolvedValue()
    }),
    close: jest.fn().mockResolvedValue()
  })
}));

// Mock pdf-parse
jest.mock('pdf-parse', () => {
  return jest.fn().mockImplementation(() => {
    return Promise.resolve({
      text: 'MOCK PDF CONTENT\n\nThis is mock content for testing.',
      numpages: 1,
      info: {},
      metadata: null
    });
  });
});

// Mock convertPdfToMarkdown
jest.mock('../src/utils/convertPdfToMarkdown', () => {
  return jest.fn().mockImplementation(() => {
    return Promise.resolve(`# Mock Resume

This is a mocked resume content for testing.

## EXPERIENCE

### Software Engineer | ABC Company

- Developed features for enterprise applications
- Collaborated with cross-functional teams

## EDUCATION

### University of Testing

Bachelor of Science in Computer Science
`);
  });
});

// Mock the sequelize instance
jest.mock('../src/config/database', () => {
  const mockSequelize = {
    authenticate: jest.fn().mockResolvedValue(),
    sync: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    define: jest.fn().mockReturnValue({})
  };

  return {
    sequelize: mockSequelize,
    testConnection: jest.fn().mockResolvedValue()
  };
});

// Mock User model
jest.mock('../src/models/user', () => {
  const mockUser = {
    findByPk: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn().mockImplementation(() => Promise.resolve(true)),
    isPasswordValid: jest.fn()
  };
  
  // Add static factory methods
  mockUser.create = jest.fn().mockImplementation((data) => {
    return {
      id: 'test-user-id',
      ...data,
      isPasswordValid: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockImplementation(() => Promise.resolve())
    };
  });
  
  return mockUser;
});

// Mock Resume model
jest.mock('../src/models/resume', () => {
  return {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  };
});

// Make sure services are properly mocked
jest.mock('../src/services/implementations/queueService', () => {
  return {
    init: jest.fn(),
    addJob: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    registerProcessor: jest.fn(),
    getJob: jest.fn().mockResolvedValue(mockJob),
    destroy: jest.fn().mockResolvedValue()
  };
});

// Mock the resumeWorker
jest.mock('../src/workers/resumeWorker', () => {
  return {
    queueResumeCustomization: jest.fn().mockResolvedValue('mock-job-id')
  };
});

// Mock Redis connection
jest.mock('redis', () => {
  const mockRedisClient = {
    connect: jest.fn().mockResolvedValue(),
    disconnect: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue()
  };
  
  return {
    createClient: jest.fn().mockReturnValue(mockRedisClient)
  };
});

// Prevent jest from hanging due to open handles
afterAll(async () => {
  // Clean up any open handles
  const _Bull = require('bull'); // Renamed with underscore prefix to indicate it's intentionally unused
  jest.clearAllMocks();

  // Force exit after all tests complete
  setTimeout(() => {
    process.exit(0);
  }, 500);
});

// Setup global error handlers
process.on('unhandledRejection', (err) => {
  // Using jest.fn() instead of console.error to avoid linting warnings
  // This would typically log errors but we're silencing it for tests
  // console.error('Unhandled Rejection:', err);
  global.console.error('Unhandled Rejection:', err);
});

// Silence console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};