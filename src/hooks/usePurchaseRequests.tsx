import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type PurchaseRequest = Database['public']['Tables']['project_purchase_requests']['Row'];
type PurchaseRequestInsert = Database['public']['Tables']['project_purchase_requests']['Insert'];

export const usePurchaseRequests = (projectId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: purchaseRequests, isLoading } = useQuery({
    queryKey: ['purchase_requests', projectId],
    queryFn: async () => {
      let query = supabase
        .from('project_purchase_requests')
        .select(`
          *,
          projects(name),
          purchase_request_items:purchase_request_items(*)
        `)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const createRequest = useMutation({
    mutationFn: async (request: PurchaseRequestInsert) => {
      const { data, error } = await supabase
        .from('project_purchase_requests')
        .insert(request)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      toast({
        title: 'Request created',
        description: 'The purchase request has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create request: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<PurchaseRequestInsert>) => {
      const { data, error } = await supabase
        .from('project_purchase_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      toast({
        title: 'Request updated',
        description: 'The purchase request has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update request: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_purchase_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      toast({
        title: 'Request deleted',
        description: 'The purchase request has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete request: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    purchaseRequests,
    isLoading,
    createRequest,
    updateRequest,
    deleteRequest,
  };
};

// Hook for fetching a single purchase request with full details
export const usePurchaseRequest = (id?: string) => {
  const { data: purchaseRequest, isLoading } = useQuery({
    queryKey: ['purchase_request', id],
    queryFn: async () => {
      if (!id) throw new Error('Purchase request ID is required');

      const { data, error } = await supabase
        .from('project_purchase_requests')
        .select(`
          *,
          projects(id, name, client_name, location),
          purchase_request_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  return {
    purchaseRequest,
    isLoading,
  };
};
