/**
 * Property-based tests for Asset model
 * Tests correctness properties related to asset management
 */

import * as fc from 'fast-check';
import { getTestPrismaClient, closeTestPrismaClient, withRollback, isTestDatabaseAvailable } from './db-config';
import { cleanDatabase } from './helpers';
import { assetDataArbitrary } from './generators';

describe('Asset Property Tests', () => {
  const prisma = getTestPrismaClient();
  let dbAvailable = false;

  beforeAll(async () => {
    // Check if database is available
    dbAvailable = await isTestDatabaseAvailable();
    
    if (!dbAvailable) {
      console.warn('⚠️  Test database is not available. Skipping property tests.');
      console.warn('   Please ensure PostgreSQL is running and TEST_DATABASE_URL is configured.');
      return;
    }
    
    // Clean database before running tests
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    if (dbAvailable) {
      // Clean up and close connection
      await cleanDatabase(prisma);
    }
    await closeTestPrismaClient();
  });

  describe('Property 3: Asset creation preserves all fields', () => {
    // Feature: dku-adventure-rental-management, Property 3: Asset creation preserves all fields
    // Validates: Requirements 2.1
    it('should preserve all submitted fields when creating an asset', async () => {
      if (!dbAvailable) {
        console.warn('⚠️  Skipping test - database not available');
        return;
      }

      await fc.assert(
        fc.asyncProperty(assetDataArbitrary, async (assetData) => {
          // Use withRollback to ensure each test iteration doesn't persist data
          await withRollback(prisma, async (tx) => {
            // Create a resort first (required foreign key)
            const resort = await tx.resort.create({
              data: {
                name: 'Test Resort',
              },
            });

            // Create the asset with the generated data
            const createdAsset = await tx.asset.create({
              data: {
                name: assetData.name,
                category: assetData.category,
                resortId: resort.id,
                purchaseDate: assetData.purchaseDate,
                purchaseCost: assetData.purchaseCost,
                status: assetData.status,
              },
            });

            // Verify all fields are preserved
            expect(createdAsset.name).toBe(assetData.name);
            expect(createdAsset.category).toBe(assetData.category);
            expect(createdAsset.resortId).toBe(resort.id);
            expect(createdAsset.purchaseDate.toISOString()).toBe(assetData.purchaseDate.toISOString());
            expect(Number(createdAsset.purchaseCost)).toBeCloseTo(assetData.purchaseCost, 2);
            expect(createdAsset.status).toBe(assetData.status);
            
            // Verify the asset has required metadata fields
            expect(createdAsset.id).toBeDefined();
            expect(typeof createdAsset.id).toBe('string');
            expect(createdAsset.createdAt).toBeInstanceOf(Date);
            expect(createdAsset.updatedAt).toBeInstanceOf(Date);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Cost accumulation is additive', () => {
    // Feature: dku-adventure-rental-management, Property 4: Cost accumulation is additive
    // Validates: Requirements 2.2
    it('should accumulate all costs additively for an asset', async () => {
      if (!dbAvailable) {
        console.warn('⚠️  Skipping test - database not available');
        return;
      }

      await fc.assert(
        fc.asyncProperty(
          assetDataArbitrary,
          fc.array(fc.record({
            laborCost: fc.double({ min: 0.01, max: 10000, noNaN: true }),
            spareParts: fc.array(fc.record({
              partName: fc.string({ minLength: 3, maxLength: 50 }),
              quantity: fc.integer({ min: 1, max: 20 }),
              unitCost: fc.double({ min: 0.01, max: 1000, noNaN: true }),
            }), { minLength: 0, maxLength: 5 })
          }), { minLength: 1, maxLength: 5 }),
          async (assetData, maintenanceRecords) => {
            await withRollback(prisma, async (tx) => {
              // Create a resort and user
              const resort = await tx.resort.create({
                data: { name: 'Test Resort' },
              });

              const user = await tx.user.create({
                data: {
                  email: `test-${Date.now()}@example.com`,
                  passwordHash: 'test-hash',
                  name: 'Test User',
                  role: 'ENGINEER',
                },
              });

              // Create the asset
              const asset = await tx.asset.create({
                data: {
                  name: assetData.name,
                  category: assetData.category,
                  resortId: resort.id,
                  purchaseDate: assetData.purchaseDate,
                  purchaseCost: assetData.purchaseCost,
                  status: assetData.status,
                },
              });

              // Track expected total cost
              let expectedTotalCost = assetData.purchaseCost;

              // Add maintenance records with spare parts
              for (const maintenanceData of maintenanceRecords) {
                const maintenance = await tx.maintenanceRecord.create({
                  data: {
                    assetId: asset.id,
                    type: 'CORRECTIVE',
                    description: 'Test maintenance',
                    startDate: new Date(),
                    laborCost: maintenanceData.laborCost,
                    performedBy: user.id,
                  },
                });

                // Add labor cost to expected total
                expectedTotalCost += maintenanceData.laborCost;

                // Add spare parts
                for (const part of maintenanceData.spareParts) {
                  await tx.sparePart.create({
                    data: {
                      maintenanceRecordId: maintenance.id,
                      partName: part.partName,
                      quantity: part.quantity,
                      unitCost: part.unitCost,
                    },
                  });

                  // Add spare part cost to expected total
                  expectedTotalCost += part.quantity * part.unitCost;
                }
              }

              // Calculate actual total cost from database
              const maintenanceRecordsFromDb = await tx.maintenanceRecord.findMany({
                where: { assetId: asset.id },
                include: { spareParts: true },
              });

              let actualMaintenanceCost = 0;
              for (const record of maintenanceRecordsFromDb) {
                actualMaintenanceCost += Number(record.laborCost);
                for (const part of record.spareParts) {
                  actualMaintenanceCost += part.quantity * Number(part.unitCost);
                }
              }

              const actualTotalCost = Number(asset.purchaseCost) + actualMaintenanceCost;

              // Verify cost accumulation is additive
              expect(actualTotalCost).toBeCloseTo(expectedTotalCost, 2);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
