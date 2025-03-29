/**
 * Jest Configuration
 */
module.exports = {
  // The test environment that will be used for testing
  testEnvironment: 'node',
  
  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',
  
  // Coverage collection configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  
  // Test match pattern
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,
  
  // Make calling deprecated APIs throw helpful error messages
  errorOnDeprecated: true,
  
  // Force coverage collection from ignored files using an array of glob patterns
  forceCoverageMatch: [],
  
  // The maximum amount of workers used to run your tests. Can be specified as % or a number.
  // E.g. maxWorkers: 10% will use 10% of your CPU amount + 1 as the maximum worker number.
  // maxWorkers: 2 will use a maximum of 2 workers.
  maxWorkers: '50%',
  
  // An array of directory names to be searched recursively up from the requiring module's location
  moduleDirectories: [
    'node_modules',
    'src'
  ],
  
  // A map from regular expressions to module names that allow to stub out resources with a single module
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // An array of regexp pattern strings that are matched against all modules before the module loader will automatically return a mock for them
  automock: false,
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // Set timeout for tests
  testTimeout: 30000,
};
