import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Commitment = Database['public']['Tables']['project_commitments']['Row'];

export interface CommitmentInput {
  project_id: string;
  phase_id?: string;
  cost_code_id: string;
  vendor_name?: string;
  description?: string;
  committed_amount: number;
  status: 'draft' | 'approved' | 'sent' | 'received' | 'cancelled';
  committed_date: string;
  source_type?: string;
  source_id?: string;
}

const QUERY_KEY = ['projectCommitments'] as const;

/**
 * Hook for managing project commitments (POs/contracts)
 * Provides operations to fetch, create, update, delete, and update status
 */
export function useProjectCommitments(projectId?: string) {
  const queryClient = useQueryClient();

  // Fetch all commitments for a project
  const { data: commitments = [], isLoading, error } = useQuery({
    queryKey: [...QUERY_KEY, projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_commitments')
        .select(`
          *,
          cost_codes!project_commitments_cost_code_id_fkey(code, name),
          project_phases!project_commitments_phase_id_fkey(phase_name)
        `)
        .eq('project_id', projectId)
        .order('committed_date', { ascending: false });

      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!projectId,
  });

  // Create commitment
  const createMutation = useMutation({
    mutationFn: async (input: CommitmentInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('project_commitments')
        .insert({
          ...input,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Commitment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, data.project_id] });
      toast.success('Commitment created');
    },
    onError: (error) => {
      toast.error(`Failed to create commitment: ${error.message}`);
    },
  });

  // Update commitment
  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CommitmentInput> }) => {
      const { data, error } = await supabase
        .from('project_commitments')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Commitment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, data.project_id] });
      toast.success('Commitment updated');
    },
    onError: (error) => {
      toast.error(`Failed to update commitment: ${error.message}`);
    },
  });

  // Delete commitment
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: commitment, error: fetchError } = await supabase
        .from('project_commitments')
        .select('project_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('project_commitments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return commitment.project_id;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, projectId] });
      toast.success('Commitment deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete commitment: ${error.message}`);
    },
  });

  // Update status only
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CommitmentInput['status'] }) => {
      const { data, error } = await supabase
        .from('project_commitments')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Commitment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, data.project_id] });
      toast.success('Commitment status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  return {
    commitments,
    isLoading,
    error,
    createCommitment: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateCommitment: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteCommitment: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
}

