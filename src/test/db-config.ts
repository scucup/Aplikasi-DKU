/**
 * Test database configuration and utilities
 */

import { PrismaClient } from '@prisma/client';

let testPrisma: PrismaClient | null = null;

/**
 * Get or create a test database client
 */
export function getTestPrismaClient(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
        },
      },
      log: process.env.DEBUG_TESTS ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return testPrisma;
}

/**
 * Close the test database connection
 */
export async function closeTestPrismaClient(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = null;
  }
}

/**
 * Execute a function within a database transaction that rolls back
 * Useful for tests that need to modify the database but should not persist changes
 */
export async function withRollback<T>(
  prisma: PrismaClient,
  fn: (tx: any) => Promise<T>
): Promise<T> {
  let result: T;
  
  try {
    await prisma.$transaction(async (tx) => {
      result = await fn(tx);
      // Force rollback by throwing an error
      throw new Error('ROLLBACK');
    });
  } catch (error: any) {
    if (error.message === 'ROLLBACK') {
      return result!;
    }
    throw error;
  }
  
  return result!;
}

/**
 * Check if test database is available
 */
export async function isTestDatabaseAvailable(): Promise<boolean> {
  try {
    const prisma = getTestPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Test database not available:', error);
    return false;
  }
}
