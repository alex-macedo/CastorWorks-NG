import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { QuoteRequest, QuoteRequestFormInput } from '@/types/procurement.types';

export const useQuoteRequests = (purchaseRequestId?: string) => {
  const { toast } = useToast();

  const { data: quoteRequests, isLoading, isError, error, refetch } = useQuery<QuoteRequest[]>({
    queryKey: ['quote_requests', purchaseRequestId],
    queryFn: async () => {
      if (!purchaseRequestId) {
        throw new Error('Purchase request ID is required');
      }

      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .eq('purchase_request_id', purchaseRequestId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch quote requests: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!purchaseRequestId,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Show error toast when query fails
  React.useEffect(() => {
    if (isError && error) {
      toast({
        title: 'Error loading quote requests',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [isError, error, toast]);

  return {
    quoteRequests: quoteRequests || [],
    isLoading,
    isError,
    error,
    refetch,
  };
};

export const useSendQuoteRequests = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: QuoteRequestFormInput) => {
      const { data: response, error } = await supabase.functions.invoke('send-quote-requests', {
        body: data,
      });

      if (error) throw error;
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      toast({
        title: 'Success',
        description: 'Quote requests sent successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send quote requests',
        variant: 'destructive',
      });
    },
  });
};

export const useResendQuoteRequest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteRequestId: string) => {
      // First get the quote request details
      const { data: quoteRequest, error: fetchError } = await supabase
        .from('quote_requests')
        .select('*, purchase_request_id')
        .eq('id', quoteRequestId)
        .single();

      if (fetchError || !quoteRequest) {
        throw new Error('Quote request not found');
      }

      // Get supplier ID
      const { data: supplier } = await supabase
        .from('quote_requests')
        .select('supplier_id')
        .eq('id', quoteRequestId)
        .single();

      if (!supplier) {
        throw new Error('Supplier not found');
      }

      const { data: response, error } = await supabase.functions.invoke('send-quote-requests', {
        body: {
          purchase_request_id: quoteRequest.purchase_request_id,
          supplier_ids: [supplier.supplier_id],
          response_deadline: quoteRequest.response_deadline,
        },
      });

      if (error) throw error;
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-requests'] });
      toast({
        title: 'Success',
        description: 'Quote request resent successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend quote request',
        variant: 'destructive',
      });
    },
  });
};

export const useCancelQuoteRequest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteRequestId: string) => {
      const { data, error } = await supabase
        .from('quote_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', quoteRequestId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to cancel quote request: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote_requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      toast({
        title: 'Success',
        description: 'Quote request cancelled successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel quote request',
        variant: 'destructive',
      });
    },
  });
};

