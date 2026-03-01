import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BudgetVersionInput {
  name: string;
  effective_date: string;
  description?: string;
}

export interface BudgetVersion {
  id: string;
  project_id: string;
  name: string;
  status: 'draft' | 'baseline' | 'superseded';
  effective_date: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ['budgetVersions'] as const;

/**
 * Hook for managing project budget versions
 * Provides operations to fetch, create, update, and delete budget versions
 */
export function useBudgetVersions(projectId?: string) {
  const queryClient = useQueryClient();

  // Fetch all versions for a project
  const { data: versions = [], isLoading, error } = useQuery({
    queryKey: [...QUERY_KEY, projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('project_budget_versions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BudgetVersion[];
    },
    enabled: !!projectId,
  });

  // Fetch single version with its budget lines
  const { data: versionWithLines } = useQuery({
    queryKey: [...QUERY_KEY, 'detail', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('project_budget_versions')
        .select(`
          *,
          project_budget_lines(*)
        `)
        .eq('project_id', projectId)
        .eq('status', 'baseline')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!projectId,
  });

  // Create new version (draft status)
  const createMutation = useMutation({
    mutationFn: async (input: BudgetVersionInput & { projectId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('project_budget_versions')
        .insert({
          project_id: input.projectId,
          name: input.name,
          effective_date: input.effective_date,
          description: input.description,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BudgetVersion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, data.project_id] });
      toast.success('Budget version created');
    },
    onError: (error) => {
      toast.error(`Failed to create version: ${error.message}`);
    },
  });

  // Update version (draft only)
  const updateMutation = useMutation({
    mutationFn: async ({ versionId, input }: { versionId: string; input: Partial<BudgetVersionInput> }) => {
      const { data, error } = await supabase
        .from('project_budget_versions')
        .update({
          ...(input.name && { name: input.name }),
          ...(input.effective_date && { effective_date: input.effective_date }),
          ...(input.description && { description: input.description }),
        })
        .eq('id', versionId)
        .eq('status', 'draft')
        .select()
        .single();

      if (error) throw error;
      return data as BudgetVersion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, data.project_id] });
      toast.success('Budget version updated');
    },
    onError: (error) => {
      toast.error(`Failed to update version: ${error.message}`);
    },
  });

  // Delete version (draft only)
  const deleteMutation = useMutation({
    mutationFn: async (versionId: string) => {
      const { data: version, error: fetchError } = await supabase
        .from('project_budget_versions')
        .select('project_id')
        .eq('id', versionId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('project_budget_versions')
        .delete()
        .eq('id', versionId)
        .eq('status', 'draft');

      if (error) throw error;
      return version.project_id;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, projectId] });
      toast.success('Budget version deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete version: ${error.message}`);
    },
  });

  // Promote draft to baseline
  const promoteMutation = useMutation({
    mutationFn: async (versionId: string) => {
      // Get project_id and supersede current baseline
      const { data: version, error: fetchError } = await supabase
        .from('project_budget_versions')
        .select('project_id')
        .eq('id', versionId)
        .single();

      if (fetchError) throw fetchError;

      // Supersede current baseline
      const { error: supersedError } = await supabase
        .from('project_budget_versions')
        .update({ status: 'superseded' })
        .eq('project_id', version.project_id)
        .eq('status', 'baseline');

      if (supersedError) throw supersedError;

      // Promote this version to baseline
      const { data, error } = await supabase
        .from('project_budget_versions')
        .update({ status: 'baseline' })
        .eq('id', versionId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, project_id: version.project_id } as BudgetVersion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, data.project_id] });
      toast.success('Budget version promoted to baseline');
    },
    onError: (error) => {
      toast.error(`Failed to promote version: ${error.message}`);
    },
  });

  return {
    versions,
    versionWithLines,
    isLoading,
    error,
    createVersion: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateVersion: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteVersion: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    promoteVersion: promoteMutation.mutate,
    isPromoting: promoteMutation.isPending,
  };
}
