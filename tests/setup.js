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

// Setup global error handlers
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
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