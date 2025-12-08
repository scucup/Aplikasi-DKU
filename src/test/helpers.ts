/**
 * Test helper functions for backend tests
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * Clean all data from test database
 */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  // Delete in order to respect foreign key constraints
  await prisma.paymentHistory.deleteMany();
  await prisma.invoiceLineItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.revenueRecord.deleteMany();
  await prisma.budgetRequest.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.sparePart.deleteMany();
  await prisma.maintenanceRecord.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.profitSharingConfig.deleteMany();
  await prisma.resort.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Create a test user with hashed password
 */
export async function createTestUser(
  prisma: PrismaClient,
  data: {
    email: string;
    password: string;
    name: string;
    role: 'ENGINEER' | 'ADMIN' | 'MANAGER';
  }
) {
  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
    },
  });
}

/**
 * Generate a test JWT token for a user
 */
export function generateTestToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '1h' }
  );
}

/**
 * Create a test resort
 */
export async function createTestResort(
  prisma: PrismaClient,
  data?: {
    name?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
  }
) {
  return prisma.resort.create({
    data: {
      name: data?.name || 'Test Resort',
      contactName: data?.contactName,
      contactEmail: data?.contactEmail,
      contactPhone: data?.contactPhone,
    },
  });
}

/**
 * Create a test asset
 */
export async function createTestAsset(
  prisma: PrismaClient,
  resortId: string,
  data?: {
    name?: string;
    category?: 'ATV' | 'UTV' | 'SEA_SPORT' | 'POOL_TOYS' | 'LINE_SPORT';
    purchaseDate?: Date;
    purchaseCost?: number;
    status?: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
  }
) {
  return prisma.asset.create({
    data: {
      name: data?.name || 'Test Asset',
      category: data?.category || 'ATV',
      resortId,
      purchaseDate: data?.purchaseDate || new Date(),
      purchaseCost: data?.purchaseCost || 10000,
      status: data?.status || 'ACTIVE',
    },
  });
}

/**
 * Create a test profit sharing configuration
 */
export async function createTestProfitSharingConfig(
  prisma: PrismaClient,
  resortId: string,
  data?: {
    assetCategory?: 'ATV' | 'UTV' | 'SEA_SPORT' | 'POOL_TOYS' | 'LINE_SPORT';
    dkuPercentage?: number;
    resortPercentage?: number;
    effectiveFrom?: Date;
  }
) {
  return prisma.profitSharingConfig.create({
    data: {
      resortId,
      assetCategory: data?.assetCategory || 'ATV',
      dkuPercentage: data?.dkuPercentage || 85,
      resortPercentage: data?.resortPercentage || 15,
      effectiveFrom: data?.effectiveFrom || new Date(),
    },
  });
}

/**
 * Wait for a specified number of milliseconds
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random test data helpers
 */
export const testData = {
  randomEmail: () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
  randomString: (length: number = 10) => Math.random().toString(36).substring(2, 2 + length),
  randomNumber: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
  randomDate: (start: Date = new Date(2020, 0, 1), end: Date = new Date()) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  },
};
