import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type QuoteApprovalLog = Database['public']['Tables']['quote_approval_logs']['Row'];
type QuoteApprovalLogInsert = Database['public']['Tables']['quote_approval_logs']['Insert'];

export const useQuoteApprovalLogs = (quoteId?: string) => {
  const { data: approvalLogs, isLoading } = useQuery({
    queryKey: ['quote_approval_logs', quoteId],
    queryFn: async () => {
      if (!quoteId) return [];

      const { data, error } = await supabase
        .from('quote_approval_logs')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as QuoteApprovalLog[];
    },
    enabled: !!quoteId,
  });

  return {
    approvalLogs,
    isLoading,
  };
};

export const useCreateApprovalLog = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (log: QuoteApprovalLogInsert) => {
      const { data, error } = await supabase
        .from('quote_approval_logs')
        .insert(log)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quote_approval_logs', data.quote_id] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: 'Success',
        description: `Quote ${data.action} successfully`,
      });
    },
    onError: (error) => {
      console.error('Error creating approval log:', error);
      toast({
        title: 'Error',
        description: 'Failed to process quote approval',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateQuoteStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ quoteId, status }: { quoteId: string; status: string }) => {
      const { data, error } = await supabase
        .from('quotes')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
    onError: (error) => {
      console.error('Error updating quote status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update quote status',
        variant: 'destructive',
      });
    },
  });
};
