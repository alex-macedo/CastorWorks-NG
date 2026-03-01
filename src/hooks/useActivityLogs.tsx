import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];

export const useActivityLogs = (limit: number = 10) => {
  const { data: activityLogs, isLoading } = useQuery({
    queryKey: ['activity_logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, projects(name)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as (ActivityLog & { projects: { name: string } | null })[];
    },
  });

  return {
    activityLogs,
    isLoading,
  };
};
