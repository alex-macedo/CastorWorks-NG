import React, { ReactElement } from 'react';
import { render, RenderOptions } from 'vitest-happy-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

/**
 * Create a fresh QueryClient instance for tests
 * Each test gets its own isolated cache
 */
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
      },
      mutations: {
        retry: false,
      },
    },
  });
};

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

/**
 * Custom render function that wraps components with necessary providers
 * Includes: QueryClientProvider, Toaster
 *
 * @example
 * const { getByText } = renderWithProviders(<MyComponent />);
 * expect(getByText('Hello')).toBeInTheDocument();
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    ...renderOptions
  }: ExtendedRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

/**
 * Mock Supabase client for testing
 */
export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null,
        }),
      }),
      limit: vi.fn().mockReturnValue({
        offset: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 1 },
          error: null,
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: { id: 1 },
        error: null,
      }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    }),
  }),
  storage: {
    from: vi.fn().mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed-url' },
        error: null,
      }),
      download: vi.fn().mockResolvedValue({
        data: new Blob(),
        error: null,
      }),
      upload: vi.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      }),
    }),
  },
};

/**
 * Mock toast notifications for testing
 */
export const mockToast = vi.fn();

export const mockUseToast = vi.fn(() => ({
  toast: mockToast,
}));

/**
 * Wait for async operations to complete
 * Useful for testing async state updates
 *
 * @example
 * await waitFor(() => {
 *   expect(getByText('Loaded')).toBeInTheDocument();
 * });
 */
export { waitFor } from 'vitest';

/**
 * Create mock route parameters for testing
 *
 * @example
 * const params = createMockParams({ id: '123' });
 */
export function createMockParams<T extends Record<string, any>>(
  params: T
): T {
  return params;
}

/**
 * Create mock API response
 *
 * @example
 * const response = createMockResponse({ success: true, data: [] });
 */
export function createMockResponse<T>(
  data: T,
  error: any = null
): { data: T; error: any } {
  return { data, error };
}

/**
 * Delay execution for testing async behavior
 *
 * @example
 * await delay(100);
 */
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create mock user object for testing
 */
export function createMockUser(overrides?: Partial<any>) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock project object for testing
 */
export function createMockProject(overrides?: Partial<any>) {
  return {
    id: 'test-project-id',
    name: 'Test Project',
    description: 'A test project',
    status: 'planning',
    start_date: new Date().toISOString(),
    end_date: new Date(Date.now() + 86400000).toISOString(),
    budget_total: 10000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// Re-export everything from vitest for convenience
export { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
