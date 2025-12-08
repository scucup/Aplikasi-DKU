# Testing Guide

This document provides comprehensive information about the testing infrastructure for the DKU Adventure Rental Management System.

## Overview

The project uses a multi-layered testing approach:

1. **Unit Tests**: Test individual functions and components in isolation
2. **Property-Based Tests**: Test universal properties across many random inputs using fast-check
3. **Integration Tests**: Test end-to-end workflows and component interactions

## Test Frameworks and Libraries

### Backend
- **Jest**: Test runner and assertion library
- **fast-check**: Property-based testing framework
- **ts-jest**: TypeScript support for Jest
- **@fast-check/jest**: Jest integration for fast-check

### Frontend
- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **@testing-library/jest-dom**: Custom Jest matchers for DOM
- **@testing-library/user-event**: User interaction simulation
- **jsdom**: DOM implementation for Node.js
- **jest-environment-jsdom**: Jest environment for browser-like testing

## Quick Start

### Running Tests

```bash
# Backend tests
npm test                    # Run all backend tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report

# Frontend tests
npm run client:test        # Run all frontend tests
cd client && npm test      # Alternative
cd client && npm run test:watch    # Watch mode
cd client && npm run test:coverage # Coverage report
```

### Test Database Setup

Tests require a separate test database to avoid affecting development data.

1. **Create the test database:**
```sql
CREATE DATABASE dku_adventure_test;
```

2. **Set environment variable:**
Add to your `.env` file:
```
TEST_DATABASE_URL="postgresql://username:password@localhost:5432/dku_adventure_test?schema=public"
```

3. **Run migrations:**
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/dku_adventure_test" npx prisma migrate deploy
```

## Project Structure

```
├── src/test/                    # Backend test infrastructure
│   ├── setup.ts                # Global test setup
│   ├── helpers.ts              # Test helper functions
│   ├── generators.ts           # fast-check generators
│   ├── db-config.ts            # Database utilities
│   └── README.md               # Detailed documentation
│
├── client/src/test/            # Frontend test infrastructure
│   ├── setup.ts                # Global test setup
│   └── helpers.tsx             # Test helper functions
│
├── jest.config.js              # Backend Jest configuration
├── client/jest.config.cjs      # Frontend Jest configuration
└── TESTING.md                  # This file
```

## Writing Tests

### Backend Unit Tests

Create test files with `.test.ts` or `.spec.ts` extension next to the code being tested:

```typescript
// src/services/asset-service.test.ts
import { calculateROI } from './asset-service';

describe('Asset Service', () => {
  describe('calculateROI', () => {
    it('should calculate ROI correctly for positive profit', () => {
      const roi = calculateROI(10000, 15000);
      expect(roi).toBe(50); // (15000 - 10000) / 10000 * 100 = 50%
    });

    it('should handle zero cost', () => {
      const roi = calculateROI(0, 15000);
      expect(roi).toBe(Infinity);
    });

    it('should calculate negative ROI for losses', () => {
      const roi = calculateROI(10000, 5000);
      expect(roi).toBe(-50);
    });
  });
});
```

### Property-Based Tests

Use fast-check generators to test properties across many random inputs:

```typescript
import * as fc from 'fast-check';
import { positiveAmountArbitrary } from '../test/generators';
import { calculateROI } from './asset-service';

// Feature: dku-adventure-rental-management, Property 5: ROI calculation correctness
describe('Property: ROI calculation correctness', () => {
  it('should calculate ROI as (revenue - cost) / cost * 100', () => {
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
      { numRuns: 100 } // Run 100 random test cases
    );
  });
});
```

### Frontend Component Tests

Use React Testing Library to test components:

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssetList } from './AssetList';

describe('AssetList', () => {
  it('should render asset names', () => {
    const assets = [
      { id: '1', name: 'ATV-001', category: 'ATV', status: 'ACTIVE' },
      { id: '2', name: 'UTV-001', category: 'UTV', status: 'ACTIVE' },
    ];
    
    render(<AssetList assets={assets} />);
    
    expect(screen.getByText('ATV-001')).toBeInTheDocument();
    expect(screen.getByText('UTV-001')).toBeInTheDocument();
  });

  it('should handle empty asset list', () => {
    render(<AssetList assets={[]} />);
    expect(screen.getByText(/no assets/i)).toBeInTheDocument();
  });

  it('should call onSelect when asset is clicked', () => {
    const onSelect = jest.fn();
    const assets = [{ id: '1', name: 'ATV-001', category: 'ATV', status: 'ACTIVE' }];
    
    render(<AssetList assets={assets} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByText('ATV-001'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
```

## Test Helpers

### Backend Helpers

Located in `src/test/helpers.ts`:

```typescript
import { cleanDatabase, createTestUser, createTestAsset } from './test/helpers';

describe('Asset API', () => {
  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  it('should create an asset', async () => {
    const user = await createTestUser(prisma, {
      email: 'manager@test.com',
      password: 'password',
      name: 'Test Manager',
      role: 'MANAGER',
    });

    const resort = await createTestResort(prisma);
    const asset = await createTestAsset(prisma, resort.id);

    expect(asset.name).toBeDefined();
    expect(asset.resortId).toBe(resort.id);
  });
});
```

### Frontend Helpers

Located in `client/src/test/helpers.tsx`:

```typescript
import { renderWithRouter, mockUsers } from './test/helpers';

describe('LoginPage', () => {
  it('should render login form', () => {
    renderWithRouter(<LoginPage />, { initialRoute: '/login' });
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });
});
```

## fast-check Generators

Pre-built generators are available in `src/test/generators.ts`:

- `roleArbitrary`: User roles (ENGINEER, ADMIN, MANAGER)
- `assetCategoryArbitrary`: Asset categories
- `emailArbitrary`: Valid email addresses
- `positiveAmountArbitrary`: Positive decimal amounts
- `profitSharingPairArbitrary`: Profit sharing percentages that sum to 100
- `dateRangeArbitrary`: Valid date ranges
- `userDataArbitrary`: Complete user data
- `assetDataArbitrary`: Complete asset data
- `revenueDataArbitrary`: Complete revenue data

Example usage:

```typescript
import * as fc from 'fast-check';
import { assetDataArbitrary } from '../test/generators';

fc.assert(
  fc.property(assetDataArbitrary, (assetData) => {
    // Test with random asset data
    const asset = createAsset(assetData);
    expect(asset.category).toBe(assetData.category);
  }),
  { numRuns: 100 }
);
```

## Property-Based Testing Guidelines

1. **Minimum Iterations**: Each property test MUST run at least 100 iterations
2. **Property Comments**: Each test MUST include a comment referencing the design document
3. **Format**: `// Feature: dku-adventure-rental-management, Property {number}: {property_text}`
4. **One Property Per Test**: Each correctness property should have exactly one test
5. **Use Generators**: Use pre-built generators from `generators.ts` when possible

## Coverage Goals

- **Backend Services**: 80% minimum coverage
- **Frontend Components**: 70% minimum coverage
- **Critical Business Logic**: 100% coverage
  - ROI calculations
  - Profit sharing calculations
  - Invoice generation
  - Financial aggregations

## Continuous Integration

Tests should be run automatically in CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Run Backend Tests
  run: npm test -- --coverage

- name: Run Frontend Tests
  run: cd client && npm test -- --coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Database Connection Errors

**Problem**: Tests fail with "Cannot connect to database"

**Solution**:
1. Ensure PostgreSQL is running
2. Verify `TEST_DATABASE_URL` is set correctly in `.env`
3. Check that the test database exists
4. Run migrations on the test database

### Test Timeouts

**Problem**: Tests timeout after 5 seconds

**Solution**:
1. Increase timeout in `jest.config.js`: `testTimeout: 10000`
2. Check for unresolved promises in async tests
3. Ensure database connections are properly closed

### Module Resolution Issues

**Problem**: Cannot find module '@/...'

**Solution**:
1. Check `tsconfig.json` paths configuration
2. Verify `jest.config.js` moduleNameMapper
3. Ensure all dependencies are installed

### React Testing Library Issues

**Problem**: "React is not defined" in JSX

**Solution**:
Add `import React from 'react';` at the top of test files

### fast-check Failures

**Problem**: Property test fails with counterexample

**Solution**:
1. Review the counterexample provided by fast-check
2. Check if the property is correctly specified
3. Verify generators produce valid inputs
4. Consider edge cases in the implementation

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the code does, not how it does it
2. **Keep Tests Simple**: Each test should verify one thing
3. **Use Descriptive Names**: Test names should clearly describe what is being tested
4. **Avoid Test Interdependence**: Tests should not depend on each other
5. **Clean Up After Tests**: Use `beforeEach`/`afterEach` to reset state
6. **Mock External Dependencies**: Mock APIs, databases, and external services
7. **Test Edge Cases**: Include tests for boundary conditions and error cases
8. **Use Property Tests for Algorithms**: Use property-based testing for mathematical operations
9. **Keep Tests Fast**: Optimize slow tests to maintain quick feedback loops
10. **Maintain Test Code**: Refactor tests as you refactor production code

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [fast-check Documentation](https://fast-check.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
