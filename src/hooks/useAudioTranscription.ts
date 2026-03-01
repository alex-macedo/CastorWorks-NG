import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface TranscriptionState {
  status: 'idle' | 'processing' | 'completed' | 'failed'
  transcript: string | null
  notes: {
    key_decisions?: string[]
    action_items?: Array<{ task: string; owner?: string }>
    risks_issues?: string[]
    next_steps?: string[]
    metrics?: string[]
  } | null
  summary: string | null
  error: string | null
  completedAt: string | null
}

interface DailyLogWithTranscription {
  id: string
  transcript: string | null
  summary: string | null
  transcription_status: string
  transcription_error: string | null
  transcription_completed_at: string | null
}

/**
 * Hook to manage audio transcription pipeline
 * Triggers: transcribe-audio → extract-meeting-notes → summarize-meeting
 */
export function useAudioTranscription(dailyLogId: string | null) {
  const queryClient = useQueryClient()

  // Get current transcription state
  const { data: transcriptionState, isLoading: isLoadingState } = useQuery({
    queryKey: ['audio-transcription', dailyLogId],
    queryFn: async () => {
      if (!dailyLogId) return null

      const { data, error } = await supabase
        .from('daily_logs')
        .select('id, transcript, summary, transcription_status, transcription_error, transcription_completed_at')
        .eq('id', dailyLogId)
        .single()

      if (error) throw error

      const dailyLog = data as DailyLogWithTranscription

      // Get notes if they exist
      let notes = null
      const { data: notesData } = await supabase
        .from('daily_log_notes')
        .select('notes')
        .eq('daily_log_id', dailyLogId)
        .single()

      if (notesData) {
        notes = (notesData as any).notes
      }

      return {
        status: (dailyLog.transcription_status || 'idle') as TranscriptionState['status'],
        transcript: dailyLog.transcript,
        summary: dailyLog.summary,
        notes: notes,
        error: dailyLog.transcription_error,
        completedAt: dailyLog.transcription_completed_at,
      } as TranscriptionState
    },
    enabled: !!dailyLogId,
    refetchInterval: 5000, // Poll every 5 seconds (simple interval)
  })

  // Trigger transcription pipeline
  const startTranscription = useMutation({
    mutationFn: async (audioUrl: string) => {
      if (!dailyLogId) throw new Error('Daily log ID required')

      console.log('[Transcription] Starting pipeline for daily_log_id:', dailyLogId)

      // Get project_id from daily_logs
      const { data: dailyLog, error: dailyLogError } = await supabase
        .from('daily_logs')
        .select('project_id')
        .eq('id', dailyLogId)
        .single()

      if (dailyLogError) throw dailyLogError

      const projectId = (dailyLog as any).project_id

      // Step 1: Trigger transcribe-audio function
      console.log('[Transcription] Step 1: Calling transcribe-audio')
      const transcribeResult = await supabase.functions.invoke('transcribe-audio', {
        body: {
          daily_log_id: dailyLogId,
          project_id: projectId,
          audio_url: audioUrl,
        },
      })

      if (transcribeResult.error) {
        throw new Error(`Transcription failed: ${JSON.stringify(transcribeResult.error)}`)
      }

      const { transcript } = transcribeResult.data

      // Step 2: Trigger extract-meeting-notes function
      console.log('[Transcription] Step 2: Calling extract-meeting-notes')
      const notesResult = await supabase.functions.invoke('extract-meeting-notes', {
        body: {
          daily_log_id: dailyLogId,
          project_id: projectId,
          transcript: transcript,
        },
      })

      if (notesResult.error) {
        console.error('Notes extraction failed:', notesResult.error)
        // Don't throw - continue to summarization
      }

      // Step 3: Trigger summarize-meeting function
      console.log('[Transcription] Step 3: Calling summarize-meeting')
      const summaryResult = await supabase.functions.invoke('summarize-meeting', {
        body: {
          daily_log_id: dailyLogId,
          project_id: projectId,
          transcript: transcript,
        },
      })

      if (summaryResult.error) {
        console.error('Summary generation failed:', summaryResult.error)
        // Don't throw - we have the transcript
      }

      console.log('[Transcription] Pipeline complete')

      return {
        transcript,
        notes: notesResult.data?.notes,
        summary: summaryResult.data?.summary,
      }
    },

    onSuccess: () => {
      // Refetch transcription state
      queryClient.invalidateQueries({ queryKey: ['audio-transcription', dailyLogId] })
    },
  })

  return {
    state: transcriptionState,
    isLoading: isLoadingState,
    startTranscription: startTranscription.mutate,
    isTranscribing: startTranscription.isPending,
    error: startTranscription.error,
  }
}

/**
 * Hook to listen for transcription updates in real-time
 */
export function useTranscriptionUpdates(dailyLogId: string | null) {
  const queryClient = useQueryClient()

  // Subscribe to daily_logs changes
  useEffect(() => {
    if (!dailyLogId) return

    const subscription = supabase
      .from(`daily_logs:id=eq.${dailyLogId}`)
      .on('*', (payload) => {
        console.log('[Transcription] Real-time update:', payload)
        queryClient.invalidateQueries({ queryKey: ['audio-transcription', dailyLogId] })
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [dailyLogId, queryClient])
}

/**
 * Simple hook to check transcription status
 */
export function useTranscriptionStatus(dailyLogId: string | null) {
  return useQuery({
    queryKey: ['transcription-status', dailyLogId],
    queryFn: async () => {
      if (!dailyLogId) return null

      const { data, error } = await supabase
        .from('daily_logs')
        .select('transcription_status, transcript, summary')
        .eq('id', dailyLogId)
        .single()

      if (error) throw error

      return {
        isTranscribed: !!(data as any).transcript,
        isSummarized: !!(data as any).summary,
        status: (data as any).transcription_status,
      }
    },
    enabled: !!dailyLogId,
  })
}
