import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientPortalAuth } from './useClientPortalAuth';
import { logger } from '@/lib/logger';
import type { ClientMeeting, MeetingAttendee, MeetingStatus } from '@/types/clientPortal';

export type ClientMeetingWithAttendees = ClientMeeting & {
  attendees: MeetingAttendee[];
};

export const useClientMeetings = () => {
  const { projectId } = useClientPortalAuth();

  // Get upcoming meetings
  const { data: upcomingMeetings, isLoading: isLoadingUpcoming, error: upcomingError } = useQuery({
    queryKey: ['clientMeetings', projectId, 'upcoming'],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          attendees:meeting_attendees(
            id,
            meeting_id,
            user_id,
            name,
            role,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .gte('meeting_date', new Date().toISOString())
        .neq('status', 'cancelled')
        .order('meeting_date', { ascending: true });

      if (error) {
        logger.error('[useClientMeetings] Error fetching upcoming meetings', { error });
        throw error;
      }

      return (data || []) as any as ClientMeetingWithAttendees[];
    },
    enabled: !!projectId,
  });

  // Get past meetings
  const { data: pastMeetings, isLoading: isLoadingPast, error: pastError } = useQuery({
    queryKey: ['clientMeetings', projectId, 'past'],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          attendees:meeting_attendees(
            id,
            meeting_id,
            user_id,
            name,
            role,
            avatar_url
          )
        `)
        .eq('project_id', projectId)
        .lt('meeting_date', new Date().toISOString())
        .order('meeting_date', { ascending: false });

      if (error) {
        logger.error('[useClientMeetings] Error fetching past meetings', { error });
        throw error;
      }

      return (data || []) as any as ClientMeetingWithAttendees[];
    },
    enabled: !!projectId,
  });

  return {
    upcomingMeetings: upcomingMeetings || [],
    pastMeetings: pastMeetings || [],
    isLoadingUpcoming,
    isLoadingPast,
    isLoading: isLoadingUpcoming || isLoadingPast,
    error: upcomingError || pastError
  };
};

export const useClientMeeting = (meetingId: string) => {
  return useQuery({
    queryKey: ['clientMeeting', meetingId],
    queryFn: async () => {
      if (!meetingId) return null;

      const { data, error } = await supabase
        .from('meetings')
        .select(`
          *,
          attendees:meeting_attendees(
            id,
            meeting_id,
            user_id,
            name,
            role,
            avatar_url
          )
        `)
        .eq('id', meetingId)
        .single();

      if (error) {
        logger.error('[useClientMeeting] Error fetching meeting', { meetingId, error });
        throw error;
      }

      return data as any as ClientMeetingWithAttendees;
    },
    enabled: !!meetingId,
  });
};

export const useRequestMeeting = () => {
  const queryClient = useQueryClient();
  const { projectId, userName } = useClientPortalAuth();

  return useMutation({
    mutationFn: async (meetingData: any) => {
      if (!projectId) throw new Error('Project ID is required');

      // 1. Create meeting
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          project_id: projectId,
          title: meetingData.title,
          description: meetingData.description || '',
          meeting_date: meetingData.meeting_date,
          duration: meetingData.duration || 60,
          meeting_type: meetingData.meeting_type || 'virtual',
          status: 'upcoming' as MeetingStatus,
          created_by_name: userName || 'Client'
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // 2. Add attendees (requester)
      const { error: attendeeError } = await supabase
        .from('meeting_attendees')
        .insert({
          meeting_id: (meeting as any).id,
          name: userName || 'Client',
          role: 'client'
        });

      if (attendeeError) throw attendeeError;

      return meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientMeetings'] });
    },
  });
};
