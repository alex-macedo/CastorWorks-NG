import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useTimeEntries,
  useCreateTimeEntry,
  useUpdateTimeEntry,
  useDeleteTimeEntry,
} from '../useTimeTracking';

const { mockSupabaseClient } = vi.hoisted(() => ({
  mockSupabaseClient: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

describe('useTimeTracking hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  const createQueryBuilderForList = (data: any[] | null, error: any = null) => {
    let mode: 'owned' | null = null;
    const builder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => {
        mode = 'owned';
        return builder;
      }),
      order: vi.fn().mockImplementation(() => Promise.resolve({ data, error })),
    };
    return builder;
  };

  it('fetches time entries for user', async () => {
    const sampleEntries = [
      { id: '1', user_id: 'user-1', start_time: new Date().toISOString(), end_time: new Date().toISOString(), duration_minutes: 60, description: 'Test' },
    ];

    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({ data: { user: { id: 'user-1' } } } as any);
    const qb = createQueryBuilderForList(sampleEntries);
    vi.mocked(mockSupabaseClient.from).mockReturnValue(qb as any);

    const { result } = renderHook(() => useTimeEntries(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].description).toBe('Test');
  });

  it('create/update/delete mutations call supabase', async () => {
    vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
      if (table === 'architect_time_entries') {
        return {
          insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'new' }, error: null } ) }) }),
          update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'u' }, error: null } ) }) }) }),
          delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        } as any;
      }
      return {} as any;
    });

    const { result: createHook } = renderHook(() => useCreateTimeEntry(), { wrapper });
    const created = await createHook.current.mutateAsync({ user_id: 'user-1', start_time: new Date().toISOString(), duration_minutes: 1 } as any);
    expect(created.id).toBe('new');

    const { result: updateHook } = renderHook(() => useUpdateTimeEntry(), { wrapper });
    const updated = await updateHook.current.mutateAsync({ id: 'new', description: 'updated' } as any);
    expect(updated.id).toBe('u');

    const { result: deleteHook } = renderHook(() => useDeleteTimeEntry(), { wrapper });
    const deleted = await deleteHook.current.mutateAsync('new');
    expect(deleted).toBe('new');
  });
});
