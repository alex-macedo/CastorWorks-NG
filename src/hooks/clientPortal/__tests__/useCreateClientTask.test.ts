import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreateClientTask } from '../useCreateClientTask';
import TestProviders from '@/test/utils/TestProviders';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: () => ({ select: () => ({ single: () => ({ data: { id: '1', name: 'Task' }, error: null }) }) }),
    }),
  },
}));

describe('useCreateClientTask', () => {
  it('returns a mutation that creates a task', async () => {
    const { result } = renderHook(() => useCreateClientTask(), {
      wrapper: ({ children }: any) => React.createElement(TestProviders, null, children),
    });

    const mutation = result.current;
    expect(typeof mutation.mutateAsync).toBe('function');

    await act(async () => {
      const res = await mutation.mutateAsync({ name: 'Test' });
      expect(res).toBeDefined();
      expect((res as any).id).toBe('1');
    });
  });
});

