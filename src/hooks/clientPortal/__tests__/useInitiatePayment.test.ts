import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInitiatePayment } from '../useInitiatePayment';
import React from 'react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: () => ({ select: () => ({ single: () => ({ data: { id: 'pay-1' }, error: null }) }) }),
    }),
  },
}));

import TestProviders from '@/test/utils/TestProviders';
describe('useInitiatePayment', () => {
  it('initiates payment and returns record', async () => {
    const { result } = renderHook(() => useInitiatePayment(), { wrapper: ({ children }: any) => React.createElement(TestProviders, null, children) });
    const mutation = result.current;
    await act(async () => {
      const res = await mutation.mutateAsync({ invoice_id: 'inv-1', amount: 100 });
      expect((res as any).id).toBe('pay-1');
    });
  });
});
