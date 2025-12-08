/**
 * Test helper functions for frontend tests
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';

/**
 * Custom render function that includes common providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
}

export function renderWithRouter(
  ui: ReactElement,
  { initialRoute = '/', ...renderOptions }: CustomRenderOptions = {}
) {
  window.history.pushState({}, 'Test page', initialRoute);

  function Wrapper({ children }: { children: ReactNode }) {
    return <BrowserRouter>{children}</BrowserRouter>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Mock user data for testing
 */
export const mockUsers = {
  engineer: {
    id: '1',
    email: 'engineer@test.com',
    name: 'Test Engineer',
    role: 'ENGINEER' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  admin: {
    id: '2',
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'ADMIN' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  manager: {
    id: '3',
    email: 'manager@test.com',
    name: 'Test Manager',
    role: 'MANAGER' as const,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

/**
 * Mock resort data for testing
 */
export const mockResort = {
  id: 'resort-1',
  name: 'Harris Resort',
  contactName: 'John Doe',
  contactEmail: 'john@harris.com',
  contactPhone: '+1234567890',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

/**
 * Mock asset data for testing
 */
export const mockAsset = {
  id: 'asset-1',
  name: 'ATV-001',
  category: 'ATV' as const,
  resortId: 'resort-1',
  purchaseDate: new Date('2024-01-01'),
  purchaseCost: 15000,
  status: 'ACTIVE' as const,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

/**
 * Create a mock API response
 */
export function createMockResponse<T>(data: T, status: number = 200) {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  };
}

/**
 * Create a mock API error
 */
export function createMockError(message: string, status: number = 400) {
  const error: any = new Error(message);
  error.response = {
    data: { error: { message } },
    status,
    statusText: 'Error',
  };
  return error;
}

/**
 * Wait for async operations to complete
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
