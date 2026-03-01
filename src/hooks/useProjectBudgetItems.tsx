import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type BudgetItem = Database['public']['Tables']['project_budget_items']['Row'];
type BudgetItemInsert = Database['public']['Tables']['project_budget_items']['Insert'];
type BudgetItemUpdate = Database['public']['Tables']['project_budget_items']['Update'];

export const useProjectBudgetItems = (projectId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: budgetItems, isLoading } = useQuery({
    queryKey: ['budget_items', projectId],
    queryFn: async () => {
      let query = supabase
        .from('project_budget_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as BudgetItem[];
    },
    // Enable query even when projectId is undefined to fetch all budget items
  });

  const createBudgetItem = useMutation({
    mutationFn: async (item: BudgetItemInsert) => {
      const { data, error } = await supabase
        .from('project_budget_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_items'] });
      toast({
        title: 'Budget item added',
        description: 'The budget item has been added successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add budget item: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateBudgetItem = useMutation({
    mutationFn: async ({ id, ...updates }: BudgetItemUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('project_budget_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_items'] });
      toast({
        title: 'Budget item updated',
        description: 'The budget item has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update budget item: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteBudgetItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_budget_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_items'] });
      toast({
        title: 'Budget item removed',
        description: 'The budget item has been removed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to remove budget item: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    budgetItems,
    isLoading,
    createBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
  };
};
