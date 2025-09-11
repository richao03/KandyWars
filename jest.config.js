module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file locations
  roots: ['<rootDir>/__tests__', '<rootDir>/src', '<rootDir>/app'],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx|js)',
    '**/?(*.)(test|spec).(ts|tsx|js)',
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    'jest-extended/all'
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Module name mapping for cleaner imports  
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/app/components/$1',
    '^@contexts/(.*)$': '<rootDir>/src/context/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!app/**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/coverage/**',
  ],
  
  // Enhanced coverage reporting
  coverageReporters: [
    'text',
    'text-summary', 
    'html',
    'lcov',
    'json-summary',
    'cobertura', // For CI/CD systems
  ],
  
  coverageDirectory: '<rootDir>/coverage',
  
  // Coverage thresholds to ensure quality
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    // Higher thresholds for critical game systems
    './src/context/': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  
  // Reporters for CI/CD integration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results',
      outputName: 'junit.xml',
      suiteName: 'CandyWarz Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
    }],
  ],
  
  // Test timeout and performance
  testTimeout: 15000, // 15 seconds for complex integration tests
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/.expo/',
  ],
  
  // Watch mode plugins for better development experience
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};