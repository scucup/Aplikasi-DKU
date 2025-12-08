/**
 * Basic test to verify Jest and fast-check setup
 */

import * as fc from 'fast-check';

describe('Test Infrastructure Setup', () => {
  describe('Jest Configuration', () => {
    it('should run basic assertions', () => {
      expect(1 + 1).toBe(2);
      expect('test').toBe('test');
      expect(true).toBeTruthy();
    });

    it('should handle async operations', async () => {
      const result = await Promise.resolve(42);
      expect(result).toBe(42);
    });
  });

  describe('fast-check Configuration', () => {
    it('should run property-based tests', () => {
      fc.assert(
        fc.property(fc.integer(), (n) => {
          expect(n + 0).toBe(n);
        }),
        { numRuns: 100 }
      );
    });

    it('should generate random strings', () => {
      fc.assert(
        fc.property(fc.string(), (s) => {
          expect(typeof s).toBe('string');
        }),
        { numRuns: 100 }
      );
    });

    it('should generate random numbers in range', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (n) => {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(100);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('TypeScript Support', () => {
    it('should support TypeScript types', () => {
      interface TestType {
        id: string;
        value: number;
      }

      const obj: TestType = { id: 'test', value: 42 };
      expect(obj.id).toBe('test');
      expect(obj.value).toBe(42);
    });
  });
});
