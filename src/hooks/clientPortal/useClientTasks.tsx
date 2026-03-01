import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortalAuth } from './useClientPortalAuth';
import type { ClientTask } from '@/types/clientPortal';

export type ClientTaskWithAssignee = ClientTask & {
  assignee?: {
    name: string;
    avatar_url?: string;
  };
};

export const useClientTasks = (filters: any = {}) => {
  const { projectId } = useClientPortalAuth();

  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['clientTasks', projectId, filters],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase.rpc('get_portal_tasks', {
        p_project_id: projectId
      });

      if (error) {
        console.error('[useClientTasks] Error fetching portal tasks', error);
        throw error;
      }

      return (data || []) as any as ClientTaskWithAssignee[];
    },
    enabled: !!projectId,
  });

  return {
    tasks: tasks || [],
    isLoading,
    error,
  };
};
