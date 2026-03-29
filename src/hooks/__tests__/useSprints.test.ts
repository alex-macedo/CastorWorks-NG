import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useOpenSprint } from '../useSprints';

const { mockSupabaseClient } = vi.hoisted(() => ({
  mockSupabaseClient: {
    from: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

describe('useOpenSprint', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  it('orders open sprints by newest start date before taking one row', async () => {
    const openSprint = {
      id: 'sprint-2026-12',
      sprint_identifier: '2026-12',
      start_date: '2026-03-23',
      created_at: '2026-03-20T00:00:00Z',
      status: 'open',
    };

    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: openSprint, error: null }),
    };

    vi.mocked(mockSupabaseClient.from).mockReturnValue(builder as any);

    const { result } = renderHook(() => useOpenSprint(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('sprints');
    expect(builder.eq).toHaveBeenCalledWith('status', 'open');
    expect(builder.order).toHaveBeenNthCalledWith(1, 'start_date', { ascending: false });
    expect(builder.order).toHaveBeenNthCalledWith(2, 'created_at', { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(1);
    expect(builder.maybeSingle).toHaveBeenCalledOnce();
    expect(result.current.data).toEqual(openSprint);
  });

  it('returns null when no open sprint exists', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    vi.mocked(mockSupabaseClient.from).mockReturnValue(builder as any);

    const { result } = renderHook(() => useOpenSprint(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });
});
