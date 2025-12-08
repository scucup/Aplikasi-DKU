# Test Infrastructure

This directory contains the testing infrastructure for the DKU Adventure Rental Management System.

## Overview

The project uses a comprehensive testing strategy that includes:

- **Unit Tests**: Testing individual functions and components
- **Property-Based Tests**: Testing universal properties across many random inputs using fast-check
- **Integration Tests**: Testing end-to-end workflows

## Test Frameworks

### Backend Testing
- **Jest**: Test runner and assertion library
- **fast-check**: Property-based testing library
- **ts-jest**: TypeScript support for Jest

### Frontend Testing
- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **jsdom**: DOM implementation for Node.js

## Directory Structure

```
src/test/
├── README.md           # This file
├── setup.ts            # Global test setup (runs before all tests)
├── helpers.ts          # Test helper functions
├── generators.ts       # fast-check generators for property-based testing
└── db-config.ts        # Test database configuration utilities
```

## Configuration Files

- `jest.config.js` (root): Backend test configuration
- `client/jest.config.js`: Frontend test configuration

## Running Tests

### Backend Tests
```bash
npm test                 # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

### Frontend Tests
```bash
npm run client:test     # Run frontend tests
cd client && npm test   # Alternative
```

## Test Database Setup

The tests require a separate test database to avoid affecting development data.

### Environment Variables

Create a `.env.test` file or set the following environment variable:

```
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/dku_adventure_test
```

### Database Setup

1. Create the test database:
```sql
CREATE DATABASE dku_adventure_test;
```

2. Run migrations on the test database:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dku_adventure_test npx prisma migrate deploy
```

## Writing Tests

### Unit Tests

Create test files with `.test.ts` or `.spec.ts` extension:

```typescript
import { calculateROI } from '../services/asset-service';

describe('Asset Service', () => {
  it('should calculate ROI correctly', () => {
    const roi = calculateROI(10000, 15000);
    expect(roi).toBe(50);
  });
});
```

### Property-Based Tests

Use fast-check generators from `generators.ts`:

```typescript
import * as fc from 'fast-check';
import { positiveAmountArbitrary } from '../test/generators';

// Feature: dku-adventure-rental-management, Property 5: ROI calculation correctness
describe('Property: ROI calculation correctness', () => {
  it('should calculate ROI as (revenue - cost) / cost', () => {
    fc.assert(
      fc.property(
        positiveAmountArbitrary,
        positiveAmountArbitrary,
        (cost, revenue) => {
          const expectedROI = ((revenue - cost) / cost) * 100;
          const actualROI = calculateROI(cost, revenue);
          expect(actualROI).toBeCloseTo(expectedROI, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Frontend Component Tests

Use React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { AssetList } from '../components/AssetList';

describe('AssetList', () => {
  it('should render asset names', () => {
    const assets = [{ id: '1', name: 'ATV-001', category: 'ATV' }];
    render(<AssetList assets={assets} />);
    expect(screen.getByText('ATV-001')).toBeInTheDocument();
  });
});
```

## Test Helpers

### Backend Helpers (`helpers.ts`)

- `cleanDatabase(prisma)`: Clean all data from test database
- `createTestUser(prisma, data)`: Create a test user
- `generateTestToken(userId, role)`: Generate JWT token for testing
- `createTestResort(prisma, data)`: Create a test resort
- `createTestAsset(prisma, resortId, data)`: Create a test asset
- `testData`: Random data generators

### Frontend Helpers (`client/src/test/helpers.tsx`)

- `renderWithRouter(ui, options)`: Render component with router
- `mockUsers`: Pre-defined mock user data
- `mockResort`: Pre-defined mock resort data
- `mockAsset`: Pre-defined mock asset data
- `createMockResponse(data, status)`: Create mock API response
- `createMockError(message, status)`: Create mock API error

## Property-Based Testing Guidelines

1. Each property test MUST run at least 100 iterations (`numRuns: 100`)
2. Each property test MUST include a comment referencing the design document property
3. Format: `// Feature: dku-adventure-rental-management, Property {number}: {property_text}`
4. Use appropriate generators from `generators.ts`
5. Test universal properties, not specific examples

## Coverage Goals

- Backend services: 80% minimum
- Frontend components: 70% minimum
- Critical business logic: 100% (ROI, profit sharing, invoice generation)

## Troubleshooting

### Database Connection Issues

If tests fail with database connection errors:
1. Ensure PostgreSQL is running
2. Verify TEST_DATABASE_URL is set correctly
3. Check that the test database exists
4. Run migrations on the test database

### Test Timeouts

If tests timeout:
1. Increase timeout in jest.config.js
2. Check for unresolved promises
3. Ensure database connections are properly closed

### Module Resolution Issues

If imports fail:
1. Check tsconfig.json paths configuration
2. Verify jest.config.js moduleNameMapper
3. Ensure all dependencies are installed
