/**
 * useRecordMeeting - Meeting recording and notes hook
 *
 * Manages live meeting recording with:
 * - Audio capture state
 * - Recording toggle
 * - Notes sync
 * - Meeting metadata
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MeetingRecording {
  id: string;
  project_id: string;
  title: string;
  agenda_items?: string[];
  notes?: string;
  audio_url?: string;
  duration_seconds?: number;
  started_at: string;
  ended_at?: string;
  recorded_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMeetingInput {
  project_id: string;
  title: string;
  agenda_items?: string[];
}

export const useRecordMeeting = (projectId?: string) => {
  const queryClient = useQueryClient();

  const {
    data: meetings = [],
    isLoading,
  } = useQuery({
    queryKey: ['meeting_recordings', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      try {
        const { data, error: queryError } = await supabase
          .from('meeting_recordings')
          .select('*')
          .eq('project_id', projectId)
          .order('started_at', { ascending: false })
          .limit(20);

        if (queryError) {
          if (queryError.code === '42P01' || /does not exist/i.test(queryError.message)) {
            return [];
          }
          throw queryError;
        }

        return (data || []) as MeetingRecording[];
      } catch (err: any) {
        console.error('[useRecordMeeting] Query error:', err);
        throw err;
      }
    },
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateMeetingInput) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('meeting_recordings')
        .insert([
          {
            ...input,
            recorded_by: userId,
            started_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data as MeetingRecording;
    },
    onSuccess: (newMeeting) => {
      queryClient.setQueryData(
        ['meeting_recordings', projectId],
        (old: MeetingRecording[] = []) => [newMeeting, ...old]
      );
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { data, error } = await supabase
        .from('meeting_recordings')
        .update({ notes })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MeetingRecording;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ['meeting_recordings', projectId],
        (old: MeetingRecording[] = []) =>
          old.map((m) => (m.id === updated.id ? updated : m))
      );
    },
  });

  const updateMeetingMutation = useMutation({
    mutationFn: async ({ id, audio_url, duration_seconds }: { id: string; audio_url?: string; duration_seconds?: number }) => {
      const updates: Record<string, unknown> = { ended_at: new Date().toISOString() };
      if (audio_url) updates.audio_url = audio_url;
      if (duration_seconds != null) updates.duration_seconds = duration_seconds;

      const { data, error } = await supabase
        .from('meeting_recordings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MeetingRecording;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ['meeting_recordings', projectId],
        (old: MeetingRecording[] = []) =>
          old.map((m) => (m.id === updated.id ? updated : m))
      );
    },
  });

  const finishMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('meeting_recordings')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MeetingRecording;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(
        ['meeting_recordings', projectId],
        (old: MeetingRecording[] = []) =>
          old.map((m) => (m.id === updated.id ? updated : m))
      );
    },
  });

  const finishWithAudio = (params: { id: string; audio_url?: string; duration_seconds?: number }) => {
    updateMeetingMutation.mutate(params)
  }

  return {
    meetings,
    isLoading,
    createMeeting: createMutation.mutate,
    updateNotes: updateNotesMutation.mutate,
    updateMeeting: updateMeetingMutation.mutate,
    finishMeeting: finishMutation.mutate,
    finishWithAudio,
    isCreating: createMutation.isPending,
    isFinishing: finishMutation.isPending,
    isUpdatingMeeting: updateMeetingMutation.isPending,
  }
}
