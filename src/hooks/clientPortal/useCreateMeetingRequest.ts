import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export function useCreateMeetingRequest() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingData: any) => {
      const payload = { ...meetingData, project_id: projectId };
      const { data, error } = await supabase.from('client_meetings').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientMeetings', projectId] });
    },
  });
}
