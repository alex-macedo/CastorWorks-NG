import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BudgetTemplateItem {
  id: string;
  template_id: string;
  category: string;
  description?: string;
  budgeted_amount: number;
  phase_id?: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBudgetTemplateItemInput {
  template_id: string;
  category: string;
  description?: string;
  budgeted_amount: number;
  phase_id?: string;
  sort_order?: number;
}

export interface UpdateBudgetTemplateItemInput {
  category?: string;
  description?: string;
  budgeted_amount?: number;
  phase_id?: string;
  sort_order?: number;
}

export function useBudgetTemplateItems(templateId: string) {
  const queryClient = useQueryClient();

  const createItem = useMutation({
    mutationFn: async (input: CreateBudgetTemplateItemInput) => {
      const { data, error } = await supabase
        .from('budget_template_items')
        .insert({
          ...input,
          sort_order: input.sort_order ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_templates', templateId] });
      queryClient.invalidateQueries({ queryKey: ['budget_templates'] });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBudgetTemplateItemInput }) => {
      const { error } = await supabase
        .from('budget_template_items')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_templates', templateId] });
      queryClient.invalidateQueries({ queryKey: ['budget_templates'] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budget_template_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_templates', templateId] });
      queryClient.invalidateQueries({ queryKey: ['budget_templates'] });
    },
  });

  return {
    createItem: createItem.mutate,
    updateItem: updateItem.mutate,
    deleteItem: deleteItem.mutate,
    isCreating: createItem.isPending,
    isUpdating: updateItem.isPending,
    isDeleting: deleteItem.isPending,
    createError: createItem.error,
    updateError: updateItem.error,
    deleteError: deleteItem.error,
  };
}

