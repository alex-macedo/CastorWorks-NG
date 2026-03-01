import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type PurchaseRequestItem = Database['public']['Tables']['purchase_request_items']['Row'];
type PurchaseRequestItemInsert = Database['public']['Tables']['purchase_request_items']['Insert'];
type PurchaseRequestItemUpdate = Database['public']['Tables']['purchase_request_items']['Update'];

export const usePurchaseRequestItems = (requestId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['purchase_request_items', requestId],
    queryFn: async () => {
      let query = supabase
        .from('purchase_request_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestId) {
        query = query.eq('request_id', requestId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PurchaseRequestItem[];
    },
    enabled: !!requestId,
  });

  const createItem = useMutation({
    mutationFn: async (item: PurchaseRequestItemInsert) => {
      // Verify user authentication for audit trail
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Unable to verify user identity. Please sign in again.');
      }

      const { data, error } = await supabase
        .from('purchase_request_items')
        .insert({
          ...item,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_request_items'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      toast({
        title: 'Item added',
        description: 'The purchase request item has been added successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add item: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: PurchaseRequestItemUpdate & { id: string }) => {
      // Verify user authentication for audit trail
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Unable to verify user identity. Please sign in again.');
      }

      const { data, error } = await supabase
        .from('purchase_request_items')
        .update({
          ...updates,
          updated_by: user.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_request_items'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      toast({
        title: 'Item updated',
        description: 'The purchase request item has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update item: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('purchase_request_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_request_items'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_requests'] });
      toast({
        title: 'Item removed',
        description: 'The purchase request item has been removed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to remove item: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    items,
    isLoading,
    createItem,
    updateItem,
    deleteItem,
  };
};
