/**
 * Test setup file for backend tests
 * This file runs before all tests
 */

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/dku_adventure_test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
