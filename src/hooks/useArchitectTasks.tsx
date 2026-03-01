/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const markMigrationError = (supabaseError: any) => {
  const err = new Error(supabaseError?.message || 'Backend data is not available');
  // Codes we’ve seen from Postgres/PostgREST when tables/relations aren't present yet
  // - 42P01: undefined_table
  // - PGRST200: relationship not found in schema cache
  const code = supabaseError?.code;
  const message = String(supabaseError?.message || '');
  if (code === '42P01' || code === 'PGRST200' || /does not exist/i.test(message) || /schema cache/i.test(message)) {
    (err as any).isMigrationError = true;
  }
  return err;
};

export const useArchitectTasks = (projectId?: string) => {
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['architect_tasks', projectId],
    queryFn: async () => {
      try {
        // If projectId is provided but not a valid UUID, skip database query
        // (likely mock data scenario)
        if (projectId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
          return [];
        }

        let query = supabase
          .from('architect_tasks')
          .select(`
            *,
            projects:projects!architect_tasks_project_id_fkey (id, name),
            phase:project_phases!architect_tasks_phase_id_fkey (id, phase_name),
            assignee:user_profiles!architect_tasks_assignee_id_fkey (user_id, display_name, email, avatar_url),
            team_member:project_team_members!architect_tasks_team_member_id_fkey (id, user_name, role, email, avatar_url),
            task_status:project_task_statuses!architect_tasks_status_id_fkey (*)
          `);

        if (projectId) {
          query = query.eq('project_id', projectId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []) as any[];
      } catch (e: any) {
        // Re-throw migration errors, but allow other errors to propagate
        throw markMigrationError(e);
      }
    },
    enabled: true,
    retry: false,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const { data, error } = await supabase
        .from('architect_tasks')
        .insert([taskData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetch();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (updated: any) => {
      const { data, error } = await supabase
        .from('architect_tasks')
        .update(updated)
        .eq('id', updated.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetch();
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('architect_tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetch();
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      status_id 
    }: { 
      id: string; 
      status?: string; 
      status_id?: string;
    }) => {
      const updates: any = { updated_at: new Date().toISOString() };
      
      // Prefer status_id if provided, otherwise use legacy status
      if (status_id) {
        updates.status_id = status_id;
      } else if (status) {
        updates.status = status;
      }
      
      const { data, error } = await supabase
        .from('architect_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetch();
    },
  });

  const updateTaskChecklistMutation = useMutation({
    mutationFn: async ({ id, checklist_items }: { id: string; checklist_items: any[] }) => {
      const { data, error } = await supabase
        .from('architect_tasks')
        .update({ checklist_items, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetch();
    },
  });

  return {
    tasks,
    isLoading,
    error,
    createTask: {
      mutate: (taskData: any) => createTaskMutation.mutate(taskData),
      mutateAsync: (taskData: any) => createTaskMutation.mutateAsync(taskData),
      isPending: createTaskMutation.isPending,
    },
    updateTask: {
      mutate: (updated: any) => updateTaskMutation.mutate(updated),
      mutateAsync: (updated: any) => updateTaskMutation.mutateAsync(updated),
      isPending: updateTaskMutation.isPending,
    },
    deleteTask: {
      mutate: (id: string) => deleteTaskMutation.mutate(id),
      mutateAsync: (id: string) => deleteTaskMutation.mutateAsync(id),
      isPending: deleteTaskMutation.isPending,
    },
    updateTaskStatus: {
      mutate: ({ id, status, status_id }: { id: string; status?: string; status_id?: string }) => 
        updateTaskStatusMutation.mutate({ id, status, status_id }),
      mutateAsync: ({ id, status, status_id }: { id: string; status?: string; status_id?: string }) => 
        updateTaskStatusMutation.mutateAsync({ id, status, status_id }),
      isPending: updateTaskStatusMutation.isPending,
    },
    updateTaskChecklist: {
      mutate: ({ id, checklist_items }: { id: string; checklist_items: any[] }) => updateTaskChecklistMutation.mutate({ id, checklist_items }),
      mutateAsync: ({ id, checklist_items }: { id: string; checklist_items: any[] }) => updateTaskChecklistMutation.mutateAsync({ id, checklist_items }),
      isPending: updateTaskChecklistMutation.isPending,
    },
    // Legacy names kept for compatibility
    saveTask: {
      mutate: (taskData: any) => createTaskMutation.mutate(taskData),
      mutateAsync: (taskData: any) => createTaskMutation.mutateAsync(taskData),
      isPending: createTaskMutation.isPending,
    },
    updateStatus: {
      mutate: ({ id, status, status_id }: { id: string; status?: string; status_id?: string }) => 
        updateTaskStatusMutation.mutate({ id, status, status_id }),
      mutateAsync: ({ id, status, status_id }: { id: string; status?: string; status_id?: string }) => 
        updateTaskStatusMutation.mutateAsync({ id, status, status_id }),
      isPending: updateTaskStatusMutation.isPending,
    },
  };
};
