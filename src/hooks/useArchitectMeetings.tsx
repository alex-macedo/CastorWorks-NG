import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ArchitectMeeting = Database['public']['Tables']['architect_meetings']['Row'] & {
  projects?: {
    id: string;
    name: string;
    location?: string;
  };
  title?: string;
  end_time?: string;
  meeting_link?: string;
  location?: string;
};

type ArchitectMeetingInsert = Database['public']['Tables']['architect_meetings']['Insert'];
type ArchitectMeetingUpdate = Database['public']['Tables']['architect_meetings']['Update'];

const meetingKeys = {
  all: ['architect-meetings'] as const,
  lists: () => [...meetingKeys.all, 'list'] as const,
  list: (projectId?: string) => [...meetingKeys.lists(), { projectId }] as const,
  details: () => [...meetingKeys.all, 'detail'] as const,
  detail: (id: string) => [...meetingKeys.details(), id] as const,
};


// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const useArchitectMeetings = (projectId?: string) => {
  const queryClient = useQueryClient();

  const { data: meetings, isLoading, error } = useQuery({
    queryKey: meetingKeys.list(projectId),
    queryFn: async () => {
      // If projectId is provided but not a valid UUID, skip database query (likely mock data scenario)
      if (projectId && !isValidUUID(projectId)) {
        return [];
      }

      let query = supabase
        .from('architect_meetings')
        .select(`
          *,
          projects (
            id,
            name,
            location
          )
        `)
        .order('meeting_date', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ArchitectMeeting[];
    },
  });

  const saveMeeting = useMutation({
    mutationFn: async (meeting: ArchitectMeetingInsert | (ArchitectMeetingUpdate & { id: string })) => {
      if ('id' in meeting && meeting.id) {
        // Update existing meeting
        const { data, error } = await supabase
          .from('architect_meetings')
          .update(meeting)
          .eq('id', meeting.id)
          .select(`
            *,
            projects (
              id,
              name,
              location
            )
          `)
          .single();

        if (error) throw error;
        return data as ArchitectMeeting;
      } else {
        // Create new meeting
        const { data, error } = await supabase
          .from('architect_meetings')
          .insert(meeting as ArchitectMeetingInsert)
          .select(`
            *,
            projects (
              id,
              name,
              location
            )
          `)
          .single();

        if (error) throw error;
        return data as ArchitectMeeting;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('architect_meetings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });

  const updateParticipants = useMutation({
    mutationFn: async ({ id, participants }: { id: string; participants: any[] }) => {
      const { data, error } = await supabase
        .from('architect_meetings')
        .update({ participants })
        .eq('id', id)
        .select(`
          *,
          projects (
            id,
            name,
            location
          )
        `)
        .single();

      if (error) throw error;
      return data as ArchitectMeeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meetingKeys.all });
    },
  });

  return {
    meetings: meetings || [],
    isLoading,
    error,
    saveMeeting,
    deleteMeeting,
    updateParticipants,
  };
};