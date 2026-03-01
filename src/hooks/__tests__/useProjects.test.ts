import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useProjects } from '../useProjects';

/**
 * Test suite for useProjects hook
 * Tests data fetching, error handling, and caching behavior
 */

const { mockSupabaseClient } = vi.hoisted(() => ({
  mockSupabaseClient: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

vi.mock('@/hooks/useUserRoles', () => ({
  useUserRoles: () => ({ data: [] }),
}));

describe('useProjects', () => {
  let queryClient: QueryClient;
  const createMockProject = (
    overrides: Record<string, unknown> = {}
  ) => ({
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
  });

  beforeEach(() => {
    // Create a fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  const createMockQueryBuilder = ({
    ownedData,
    regularData,
    ownedError = null,
    regularError = null,
  }: {
    ownedData: any[] | null;
    regularData: any[] | null;
    ownedError?: Error | null;
    regularError?: Error | null;
  }) => {
    let mode: 'owned' | 'regular' | null = null;
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => {
        mode = 'owned';
        return builder;
      }),
      or: vi.fn().mockImplementation(() => {
        mode = 'regular';
        return builder;
      }),
      order: vi.fn().mockImplementation(() => {
        if (mode === 'regular') {
          return Promise.resolve({ data: regularData, error: regularError });
        }
        return Promise.resolve({ data: ownedData, error: ownedError });
      }),
    };

    return builder;
  };

  it('should fetch projects successfully', async () => {
    const mockProjects = [
      createMockProject({
        id: '1',
        name: 'Project 1',
        owner_id: 'user-1',
        project_phases: [{ progress_percentage: 50, budget_spent: 1000 }],
      }),
      createMockProject({
        id: '2',
        name: 'Project 2',
        owner_id: 'user-1',
        project_phases: [{ progress_percentage: 25, budget_spent: 500 }],
      }),
    ];

    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } },
    } as any);

    const mockQueryBuilder = createMockQueryBuilder({
      ownedData: mockProjects,
      regularData: [],
    });

    vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQueryBuilder as any);

    const { result } = renderHook(() => useProjects(), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.projects).toHaveLength(2);
    expect((result.current.projects?.[0] as any)?.avg_progress).toBe(50);
    expect(result.current.error).toBeNull();
  });

  it('should return empty list when fetch fails', async () => {
    const mockError = new Error('Failed to fetch projects');

    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } },
    } as any);

    const mockQueryBuilder = createMockQueryBuilder({
      ownedData: null,
      regularData: [],
      ownedError: mockError,
    });

    vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQueryBuilder as any);

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.projects?.length).toBe(0);
  });

  it('should return empty list when no projects found', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } },
    } as any);

    const mockQueryBuilder = createMockQueryBuilder({
      ownedData: [],
      regularData: [],
    });

    vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQueryBuilder as any);

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.projects?.length).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should expose mutation helpers', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } },
    } as any);

    const mockQueryBuilder = createMockQueryBuilder({
      ownedData: [],
      regularData: [],
    });

    vi.mocked(mockSupabaseClient.from).mockReturnValue(mockQueryBuilder as any);

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.createProject).toBeDefined();
    expect(result.current.updateProject).toBeDefined();
    expect(result.current.deleteProject).toBeDefined();
  });
});
