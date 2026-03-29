import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CommunicationLogEntry, CommLogFormData } from '@/types/platform.types';

const QUERY_KEY = ['platform-communication-log'] as const;

export const usePlatformCommunicationLog = () => {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_communication_log')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CommunicationLogEntry[];
    },
  });
};

export const useCreateCommunicationLogEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CommLogFormData) => {
      const { data, error } = await supabase
        .from('platform_communication_log')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      return data as CommunicationLogEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Interaction logged');
    },
    onError: (err: Error) => toast.error(`Failed to log interaction: ${err.message}`),
  });
};

export const useDeleteCommunicationLogEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('platform_communication_log')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Log entry deleted');
    },
    onError: (err: Error) => toast.error(`Failed to delete log entry: ${err.message}`),
  });
};
