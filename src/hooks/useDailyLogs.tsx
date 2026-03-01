import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type DailyLog = Database['public']['Tables']['daily_logs']['Row'];
type DailyLogInsert = Database['public']['Tables']['daily_logs']['Insert'];

export const useDailyLogs = (projectId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dailyLogs, isLoading } = useQuery({
    queryKey: ['daily_logs', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('project_id', projectId)
        .order('log_date', { ascending: false });

      if (error) throw error;
      return data as DailyLog[];
    },
    enabled: !!projectId,
  });

  const createDailyLog = useMutation({
    mutationFn: async (log: DailyLogInsert) => {
      const { data, error } = await supabase
        .from('daily_logs')
        .insert(log)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_logs', projectId] });
      toast({
        title: 'Daily log created',
        description: 'The daily log has been saved successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create daily log: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateDailyLog = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DailyLogInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from('daily_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_logs', projectId] });
      toast({
        title: 'Daily log updated',
        description: 'The daily log has been updated successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update daily log: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteDailyLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('daily_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_logs', projectId] });
      toast({
        title: 'Daily log deleted',
        description: 'The daily log has been deleted successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete daily log: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    dailyLogs,
    isLoading,
    createDailyLog,
    updateDailyLog,
    deleteDailyLog,
  };
};
