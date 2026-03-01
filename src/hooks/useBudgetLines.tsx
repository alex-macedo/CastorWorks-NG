import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BudgetLineInput {
  phase_id: string;
  cost_code_id: string;
  amount: number;
}

export interface BudgetLine {
  id: string;
  version_id: string;
  phase_id: string;
  cost_code_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ['budgetLines'] as const;

/**
 * Hook for managing budget lines within a version
 * Provides operations to fetch, create, update, delete, and bulk upsert budget lines
 */
export function useBudgetLines(versionId?: string) {
  const queryClient = useQueryClient();

  // Fetch all budget lines for a version
  const { data: lines = [], isLoading, error } = useQuery({
    queryKey: [...QUERY_KEY, versionId],
    queryFn: async () => {
      if (!versionId) return [];

      const { data, error } = await supabase
        .from('project_budget_lines')
        .select('*')
        .eq('version_id', versionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as BudgetLine[];
    },
    enabled: !!versionId,
  });

  // Create single budget line
  const createMutation = useMutation({
    mutationFn: async (input: BudgetLineInput & { versionId: string }) => {
      const { data, error } = await supabase
        .from('project_budget_lines')
        .insert({
          version_id: input.versionId,
          phase_id: input.phase_id,
          cost_code_id: input.cost_code_id,
          amount: input.amount,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BudgetLine;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, data.version_id] });
    },
    onError: (error) => {
      toast.error(`Failed to create budget line: ${error.message}`);
    },
  });

  // Update budget line
  const updateMutation = useMutation({
    mutationFn: async ({ lineId, input }: { lineId: string; input: Partial<BudgetLineInput> }) => {
      const { data, error } = await supabase
        .from('project_budget_lines')
        .update({
          ...(input.amount !== undefined && { amount: input.amount }),
          ...(input.phase_id && { phase_id: input.phase_id }),
          ...(input.cost_code_id && { cost_code_id: input.cost_code_id }),
        })
        .eq('id', lineId)
        .select()
        .single();

      if (error) throw error;
      return data as BudgetLine;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, data.version_id] });
    },
    onError: (error) => {
      toast.error(`Failed to update budget line: ${error.message}`);
    },
  });

  // Delete budget line
  const deleteMutation = useMutation({
    mutationFn: async (lineId: string) => {
      const { data: line, error: fetchError } = await supabase
        .from('project_budget_lines')
        .select('version_id')
        .eq('id', lineId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('project_budget_lines')
        .delete()
        .eq('id', lineId);

      if (error) throw error;
      return line.version_id;
    },
    onSuccess: (versionId) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, versionId] });
    },
    onError: (error) => {
      toast.error(`Failed to delete budget line: ${error.message}`);
    },
  });

  // Bulk upsert lines (for matrix editor)
  const bulkUpsertMutation = useMutation({
    mutationFn: async ({
      versionId,
      lines: newLines,
    }: {
      versionId: string;
      lines: BudgetLineInput[];
    }) => {
      // Delete all existing lines for this version
      const { error: deleteError } = await supabase
        .from('project_budget_lines')
        .delete()
        .eq('version_id', versionId);

      if (deleteError) throw deleteError;

      // Insert new lines
      if (newLines.length > 0) {
        const { data, error } = await supabase
          .from('project_budget_lines')
          .insert(
            newLines.map((line) => ({
              version_id: versionId,
              phase_id: line.phase_id,
              cost_code_id: line.cost_code_id,
              amount: line.amount,
            }))
          )
          .select();

        if (error) throw error;
        return data as BudgetLine[];
      }

      return [];
    },
    onSuccess: (lines) => {
      if (lines.length > 0) {
        queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, lines[0].version_id] });
      }
      toast.success('Budget lines saved');
    },
    onError: (error) => {
      toast.error(`Failed to save budget lines: ${error.message}`);
    },
  });

  return {
    lines,
    isLoading,
    error,
    createLine: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateLine: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteLine: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    bulkUpsertLines: bulkUpsertMutation.mutate,
    isUpserting: bulkUpsertMutation.isPending,
  };
}
