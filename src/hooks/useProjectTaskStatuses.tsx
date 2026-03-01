import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProjectTaskStatus } from '@/types/taskManagement';
import { toast } from 'sonner';

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Hook for managing project task statuses (configurable workflow columns)
 * 
 * @param projectId - The project ID to fetch statuses for
 * @returns Object with statuses data and CRUD operations
 */
export const useProjectTaskStatuses = (projectId: string) => {
  const queryClient = useQueryClient();

  // Query to fetch all statuses for a project
  const {
    data: statuses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['project-task-statuses', projectId],
    queryFn: async () => {
      // If projectId is not a valid UUID, return empty array
      if (projectId && !isValidUUID(projectId)) {
        return [] as ProjectTaskStatus[];
      }

      try {
        const { data, error } = await supabase
          .from('project_task_statuses')
          .select('*')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true });

        if (error) throw error;
        return (data || []) as ProjectTaskStatus[];
      } catch (err) {
        console.warn('Task statuses unavailable, returning empty array', err);
        return [] as ProjectTaskStatus[];
      }
    },
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation to create a new status
  const createStatusMutation = useMutation({
    mutationFn: async (
      status: Omit<ProjectTaskStatus, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const { data, error } = await supabase
        .from('project_task_statuses')
        .insert(status)
        .select()
        .single();

      if (error) throw error;
      return data as ProjectTaskStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-task-statuses', projectId] });
      queryClient.invalidateQueries({ queryKey: ['architect-tasks', projectId] });
      toast.success('Status column created successfully');
    },
    onError: (error: Error) => {
      console.error('Error creating status:', error);
      toast.error('Failed to create status column');
    },
  });

  // Mutation to update an existing status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<ProjectTaskStatus> & { id: string }) => {
      const { data, error } = await supabase
        .from('project_task_statuses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ProjectTaskStatus;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ['project-task-statuses', projectId] });

      const previousStatuses = queryClient.getQueryData<ProjectTaskStatus[]>([
        'project-task-statuses',
        projectId,
      ]);

      if (previousStatuses) {
        const nextStatuses = previousStatuses.map((status) =>
          status.id === id ? { ...status, ...updates } : status
        );
        queryClient.setQueryData(['project-task-statuses', projectId], nextStatuses);
      }

      return { previousStatuses };
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousStatuses) {
        queryClient.setQueryData(
          ['project-task-statuses', projectId],
          context.previousStatuses
        );
      }
      console.error('Error updating status:', error);
      toast.error('Failed to update status column');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-task-statuses', projectId] });
      queryClient.invalidateQueries({ queryKey: ['architect-tasks', projectId] });
      toast.success('Status column updated successfully');
    },
  });

  // Mutation to delete a status (only non-system statuses)
  const deleteStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      // First check if it's a system status
      const status = statuses?.find((s) => s.id === id);
      if (status?.is_system) {
        throw new Error('Cannot delete system status');
      }

      const { error } = await supabase
        .from('project_task_statuses')
        .delete()
        .eq('id', id)
        .eq('is_system', false); // Extra safety check

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-task-statuses', projectId] });
      queryClient.invalidateQueries({ queryKey: ['architect-tasks', projectId] });
      toast.success('Status column deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Error deleting status:', error);
      toast.error(error.message || 'Failed to delete status column');
    },
  });

  // Mutation to reorder statuses
  const reorderStatusesMutation = useMutation({
    mutationFn: async (statusIds: string[]) => {
      // Use RPC function to handle reordering in a proper transaction
      const { error } = await supabase.rpc('reorder_project_task_statuses', {
        p_project_id: projectId,
        p_status_ids: statusIds,
      });
      
      if (error) throw error;
    },
    onMutate: async (statusIds) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['project-task-statuses', projectId] });

      // Snapshot previous value
      const previousStatuses = queryClient.getQueryData<ProjectTaskStatus[]>([
        'project-task-statuses',
        projectId,
      ]);

      // Optimistically update
      if (previousStatuses) {
        const reordered = statusIds
          .map((id) => previousStatuses.find((s) => s.id === id))
          .filter(Boolean) as ProjectTaskStatus[];

        queryClient.setQueryData(['project-task-statuses', projectId], reordered);
      }

      return { previousStatuses };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousStatuses) {
        queryClient.setQueryData(
          ['project-task-statuses', projectId],
          context.previousStatuses
        );
      }
      console.error('Error reordering statuses:', error);
      toast.error('Failed to reorder status columns');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-task-statuses', projectId] });
      toast.success('Status columns reordered successfully');
    },
  });

  // Mutation to set default status
  const setDefaultStatusMutation = useMutation({
    mutationFn: async (statusId: string) => {
      // First, unset all default flags for this project
      await supabase
        .from('project_task_statuses')
        .update({ is_default: false })
        .eq('project_id', projectId);

      // Then set the new default
      const { data, error } = await supabase
        .from('project_task_statuses')
        .update({ is_default: true })
        .eq('id', statusId)
        .select()
        .single();

      if (error) throw error;
      return data as ProjectTaskStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-task-statuses', projectId] });
      toast.success('Default status updated successfully');
    },
    onError: (error: Error) => {
      console.error('Error setting default status:', error);
      toast.error('Failed to set default status');
    },
  });

  // Mutation to sync with global dropdown options
  const syncWithGlobalStatusesMutation = useMutation({
    mutationFn: async () => {
      // 1. Fetch global dropdown options for 'task_status'
      const { data: globalOptions, error: globalError } = await supabase
        .from('dropdown_options')
        .select('*')
        .eq('category', 'task_status')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (globalError) throw globalError;
      if (!globalOptions || globalOptions.length === 0) return;

      // 2. Fetch existing project statuses
      const { data: existingStatuses, error: existingError } = await supabase
        .from('project_task_statuses')
        .select('slug, sort_order')
        .eq('project_id', projectId);

      if (existingError) throw existingError;
      
      const existingSlugs = new Set(existingStatuses?.map(s => s.slug) || []);
      
      // Calculate max sort_order
      let maxSortOrder = -1;
      existingStatuses?.forEach(s => {
        if (s.sort_order !== null && s.sort_order > maxSortOrder) {
          maxSortOrder = s.sort_order;
        }
      });

      // 3. Filter out options that already exist as project statuses
      const newStatuses = globalOptions
        .filter(opt => !existingSlugs.has(opt.value))
        .map((opt, index) => ({
          project_id: projectId,
          name: opt.label,
          slug: opt.value,
          color: opt.color || 'blue',
          sort_order: maxSortOrder + 1 + index,
          is_default: opt.is_default || false,
          is_system: true,
          is_completed: opt.value === 'completed',
          is_visible: true
        }));

      if (newStatuses.length === 0) return;

      // 4. Insert new statuses
      const { error: insertError } = await supabase
        .from('project_task_statuses')
        .insert(newStatuses);

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-task-statuses', projectId] });
      queryClient.invalidateQueries({ queryKey: ['architect-tasks', projectId] });
      toast.success('Project statuses synced with global options');
    },
    onError: (error: any) => {
      console.error('Error syncing statuses:', error);
      toast.error(error.message || 'Failed to sync statuses');
    },
  });

  // Helper function to get default status
  const getDefaultStatus = () => {
    return statuses?.find((s) => s.is_default);
  };

  // Helper function to get completed statuses
  const getCompletedStatuses = () => {
    return statuses?.filter((s) => s.is_completed) || [];
  };

  return {
    // Data
    statuses,
    isLoading,
    error,

    // Helpers
    getDefaultStatus,
    getCompletedStatuses,

    // Mutations
    createStatus: createStatusMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutateAsync,
    deleteStatus: deleteStatusMutation.mutateAsync,
    reorderStatuses: reorderStatusesMutation.mutateAsync,
    setDefaultStatus: setDefaultStatusMutation.mutateAsync,
    syncWithGlobalStatuses: syncWithGlobalStatusesMutation.mutateAsync,

    // Mutation states
    isCreating: createStatusMutation.isPending,
    isUpdating: updateStatusMutation.isPending,
    isDeleting: deleteStatusMutation.isPending,
    isReordering: reorderStatusesMutation.isPending,
    isSyncing: syncWithGlobalStatusesMutation.isPending,
  };
};
