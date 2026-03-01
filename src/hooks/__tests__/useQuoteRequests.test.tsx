import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useQuoteRequests, useSendQuoteRequests, useResendQuoteRequest } from '../useQuoteRequests';
import type { QuoteRequest } from '@/types/procurement.types';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Mock data
const mockQuoteRequest: QuoteRequest = {
  id: 'quote-req-1',
  purchase_request_id: 'pr-1',
  supplier_id: 'supplier-1',
  response_deadline: '2025-12-01T10:00:00Z',
  status: 'sent',
  created_at: '2025-11-05T10:00:00Z',
  updated_at: '2025-11-05T10:00:00Z',
  supplier: {
    id: 'supplier-1',
    name: 'Test Supplier',
    category: 'electrical',
    contact_email: 'test@supplier.com',
    contact_phone: '+1234567890',
    preferred_contact_method: 'email',
    is_active: true,
    rating: 4.5,
    orders_completed: 10,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
};

// Import the mocked supabase after mocking
import { supabase } from '@/integrations/supabase/client';

describe('useQuoteRequests', () => {
  let mockQuery: any;

  beforeEach(() => {
    mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(mockQuery);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: null });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useQuoteRequests hook', () => {
    it('should return initial loading state when purchaseRequestId is provided', () => {
      const { result } = renderHook(
        () => useQuoteRequests('pr-1'),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.quoteRequests).toEqual([]);
      expect(result.current.isError).toBe(false);
    });

    it('should not make query when purchaseRequestId is not provided', () => {
      const { result } = renderHook(
        () => useQuoteRequests(),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.quoteRequests).toEqual([]);
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should fetch quote requests successfully', async () => {
      mockQuery.order.mockResolvedValue({
        data: [mockQuoteRequest],
        error: null,
      });

      const { result } = renderHook(
        () => useQuoteRequests('pr-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(supabase.from).toHaveBeenCalledWith('quote_requests');
      expect(mockQuery.select).toHaveBeenCalledWith(`
          *,
          supplier:suppliers(*)
        `);
      expect(mockQuery.eq).toHaveBeenCalledWith('purchase_request_id', 'pr-1');
    });

    it('should handle empty result data correctly', async () => {
      mockQuery.order.mockResolvedValue({
        data: null,
        error: null,
      });

      const { result } = renderHook(
        () => useQuoteRequests('pr-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.quoteRequests).toEqual([]);
      expect(result.current.isError).toBe(false);
    });

    it('should handle refetch functionality', async () => {
      mockQuery.order.mockResolvedValue({
        data: [mockQuoteRequest],
        error: null,
      });

      const { result } = renderHook(
        () => useQuoteRequests('pr-1'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
      expect(result.current.quoteRequests).toHaveLength(1);
    });
  });

  describe('useSendQuoteRequests hook', () => {
    it('should send quote requests successfully', async () => {
      const mockResponse = { success: true };
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(
        () => useSendQuoteRequests(),
        { wrapper: createWrapper() }
      );

      const mockData = {
        purchase_request_id: 'pr-1',
        supplier_ids: ['supplier-1'],
        response_deadline: '2025-12-01',
      };

      result.current.mutate(mockData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('send-quote-requests', expect.objectContaining({
        body: expect.objectContaining({
          purchase_request_id: mockData.purchase_request_id,
          supplier_ids: mockData.supplier_ids,
          response_deadline: mockData.response_deadline,
        }),
      }));

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Quote requests sent successfully',
      });
    });

    it('should handle send error', async () => {
      const errorMessage = 'Send failed';
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: new Error(errorMessage),
      });

      const { result } = renderHook(
        () => useSendQuoteRequests(),
        { wrapper: createWrapper() }
      );

      const mockData = {
        purchase_request_id: 'pr-1',
        supplier_ids: ['supplier-1'],
        response_deadline: '2025-12-01',
      };

      result.current.mutate(mockData);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    });
  });

  describe('useResendQuoteRequest hook', () => {
    it('should resend quote request successfully', async () => {
      // Mock the quote request fetch
      mockQuery.single.mockResolvedValueOnce({
        data: {
          id: 'quote-req-1',
          purchase_request_id: 'pr-1',
          response_deadline: '2025-12-01',
        },
        error: null,
      });

      // Mock the supplier ID fetch
      mockQuery.single.mockResolvedValueOnce({
        data: { supplier_id: 'supplier-1' },
        error: null,
      });

      const mockResponse = { success: true };
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(
        () => useResendQuoteRequest(),
        { wrapper: createWrapper() }
      );

      result.current.mutate('quote-req-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Quote request resent successfully',
      });
    });

    it('should handle quote request not found', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const { result } = renderHook(
        () => useResendQuoteRequest(),
        { wrapper: createWrapper() }
      );

      result.current.mutate('invalid-id');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Quote request not found',
        variant: 'destructive',
      });
    });
  });
});
