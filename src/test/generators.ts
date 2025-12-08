/**
 * fast-check generators for property-based testing
 * These generators create random valid test data for various domain models
 */

import * as fc from 'fast-check';

/**
 * Generator for user roles
 */
export const roleArbitrary = fc.constantFrom('ENGINEER', 'ADMIN', 'MANAGER');

/**
 * Generator for asset categories
 */
export const assetCategoryArbitrary = fc.constantFrom(
  'ATV',
  'UTV',
  'SEA_SPORT',
  'POOL_TOYS',
  'LINE_SPORT'
);

/**
 * Generator for asset status
 */
export const assetStatusArbitrary = fc.constantFrom('ACTIVE', 'MAINTENANCE', 'RETIRED');

/**
 * Generator for maintenance types
 */
export const maintenanceTypeArbitrary = fc.constantFrom('PREVENTIVE', 'CORRECTIVE');

/**
 * Generator for expense categories
 */
export const expenseCategoryArbitrary = fc.constantFrom('OPERATIONAL', 'PERSONNEL', 'MARKETING');

/**
 * Generator for approval status
 */
export const approvalStatusArbitrary = fc.constantFrom('PENDING', 'APPROVED', 'REJECTED');

/**
 * Generator for invoice status
 */
export const invoiceStatusArbitrary = fc.constantFrom('DRAFT', 'SENT', 'PAID');

/**
 * Generator for valid email addresses
 */
export const emailArbitrary = fc
  .tuple(
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), { minLength: 3, maxLength: 20 }).map(arr => arr.join('')),
    fc.constantFrom('example.com', 'test.com', 'mail.com')
  )
  .map(([local, domain]) => `${local}@${domain}`);

/**
 * Generator for positive decimal amounts (for costs, revenue, etc.)
 */
export const positiveAmountArbitrary = fc.double({ min: 0.01, max: 1000000, noNaN: true });

/**
 * Generator for profit sharing percentages that sum to 100
 */
export const profitSharingPairArbitrary = fc
  .integer({ min: 1, max: 99 })
  .map(dkuPercentage => ({
    dkuPercentage,
    resortPercentage: 100 - dkuPercentage,
  }));

/**
 * Generator for valid date ranges (start date before end date)
 */
export const dateRangeArbitrary = fc
  .tuple(
    fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
    fc.integer({ min: 1, max: 365 })
  )
  .map(([startDate, daysOffset]) => {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysOffset);
    return { startDate, endDate };
  });

/**
 * Generator for user data
 */
export const userDataArbitrary = fc.record({
  email: emailArbitrary,
  name: fc.string({ minLength: 3, maxLength: 50 }),
  password: fc.string({ minLength: 8, maxLength: 20 }),
  role: roleArbitrary,
});

/**
 * Generator for resort data
 */
export const resortDataArbitrary = fc.record({
  name: fc.string({ minLength: 3, maxLength: 100 }),
  contactName: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: undefined }),
  contactEmail: fc.option(emailArbitrary, { nil: undefined }),
  contactPhone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: undefined }),
});

/**
 * Generator for asset data
 */
export const assetDataArbitrary = fc.record({
  name: fc.string({ minLength: 3, maxLength: 100 }),
  category: assetCategoryArbitrary,
  purchaseDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  purchaseCost: positiveAmountArbitrary,
  status: assetStatusArbitrary,
});

/**
 * Generator for maintenance record data
 */
export const maintenanceDataArbitrary = fc.record({
  type: maintenanceTypeArbitrary,
  description: fc.string({ minLength: 10, maxLength: 500 }),
  startDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  laborCost: positiveAmountArbitrary,
});

/**
 * Generator for spare part data
 */
export const sparePartDataArbitrary = fc.record({
  partName: fc.string({ minLength: 3, maxLength: 100 }),
  quantity: fc.integer({ min: 1, max: 100 }),
  unitCost: positiveAmountArbitrary,
});

/**
 * Generator for expense data
 */
export const expenseDataArbitrary = fc.record({
  category: expenseCategoryArbitrary,
  description: fc.string({ minLength: 10, maxLength: 500 }),
  amount: positiveAmountArbitrary,
  date: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
});

/**
 * Generator for budget request data
 */
export const budgetRequestDataArbitrary = fc.record({
  category: expenseCategoryArbitrary,
  amount: positiveAmountArbitrary,
  justification: fc.string({ minLength: 20, maxLength: 500 }),
});

/**
 * Generator for revenue record data
 */
export const revenueDataArbitrary = fc.record({
  assetCategory: assetCategoryArbitrary,
  date: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  amount: positiveAmountArbitrary,
});

/**
 * Generator for profit sharing config data
 */
export const profitSharingConfigArbitrary = fc.record({
  assetCategory: assetCategoryArbitrary,
  percentages: profitSharingPairArbitrary,
  effectiveFrom: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
});

/**
 * Generator for non-empty arrays
 */
export function nonEmptyArrayOf<T>(arb: fc.Arbitrary<T>, maxLength: number = 10): fc.Arbitrary<T[]> {
  return fc.array(arb, { minLength: 1, maxLength });
}

/**
 * Generator for UUIDs (simplified for testing)
 */
export const uuidArbitrary = fc.uuid();
