// src/test/setup.js - Vitest test setup and configuration
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import 'dotenv/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/secure_docs_test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock external services
global.mockServices = {
  email: {
    send: vi.fn().mockResolvedValue({ messageId: 'test-message-id' })
  },
  storage: {
    upload: vi.fn().mockResolvedValue({ url: 'https://test-storage.com/file.pdf' }),
    delete: vi.fn().mockResolvedValue(true)
  }
};

// Test database setup
let testDb;

beforeAll(async () => {
  // Initialize test database connection
  const { default: db } = await import('../config/database.js');
  testDb = db;
  
  // Run database migrations for tests
  // await runTestMigrations();
  
  console.log('Test environment initialized');
});

afterAll(async () => {
  // Clean up test database
  if (testDb) {
    // await cleanupTestDatabase();
    console.log('Test environment cleaned up');
  }
});

beforeEach(async () => {
  // Reset mocks before each test
  vi.clearAllMocks();
  
  // Clear test data if needed
  // await clearTestData();
});

afterEach(async () => {
  // Cleanup after each test
  // await cleanupTestData();
});

// Test utilities
export const testUtils = {
  // Create test user
  async createTestUser(userData = {}) {
    const defaultUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      isActive: true
    };
    
    return { ...defaultUser, ...userData };
  },
  
  // Create test document
  async createTestDocument(documentData = {}) {
    const defaultDocument = {
      title: `Test Document ${Date.now()}`,
      description: 'Test document description',
      category: 'GENERAL',
      filename: 'test-document.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf'
    };
    
    return { ...defaultDocument, ...documentData };
  },
  
  // Generate test JWT token
  generateTestToken(userId, role = 'USER') {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },
  
  // Create test request object
  createTestRequest(overrides = {}) {
    return {
      headers: {},
      body: {},
      query: {},
      params: {},
      user: null,
      ip: '127.0.0.1',
      path: '/test',
      method: 'GET',
      ...overrides
    };
  },
  
  // Create test response object
  createTestResponse() {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis()
    };
    return res;
  },
  
  // Wait for async operations
  async waitFor(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Database test utilities
export const dbTestUtils = {
  // Clean all test tables
  async cleanTables() {
    if (!testDb) return;
    
    const tables = [
      'activity_logs',
      'document_permissions',
      'documents',
      'users'
    ];
    
    for (const table of tables) {
      try {
        await testDb.query(`DELETE FROM ${table} WHERE email LIKE '%@example.com' OR email LIKE '%test%'`);
      } catch (error) {
        // Table might not exist, ignore error
      }
    }
  },
  
  // Create test tables if they don't exist
  async createTestTables() {
    if (!testDb) return;
    
    // Add table creation SQL here if needed
    // This would typically be handled by migrations
  }
};

// Export test database instance
export { testDb };

// Global test configuration
global.testConfig = {
  timeout: 10000,
  retries: 2,
  bail: false
};

