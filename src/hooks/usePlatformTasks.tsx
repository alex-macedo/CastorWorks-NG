import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PlatformTask, PlatformTaskFormData } from '@/types/platform.types';

const QUERY_KEY = ['platform-tasks'] as const;

export const usePlatformTasks = () => {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PlatformTask[];
    },
  });
};

export const useCreatePlatformTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PlatformTaskFormData) => {
      const { data, error } = await supabase
        .from('platform_tasks')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data as PlatformTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Task created');
    },
    onError: (err: Error) => toast.error(`Failed to create task: ${err.message}`),
  });
};

export const useUpdatePlatformTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PlatformTaskFormData> }) => {
      const { data, error } = await supabase
        .from('platform_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as PlatformTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Task updated');
    },
    onError: (err: Error) => toast.error(`Failed to update task: ${err.message}`),
  });
};

export const useDeletePlatformTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('platform_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Task deleted');
    },
    onError: (err: Error) => toast.error(`Failed to delete task: ${err.message}`),
  });
};
