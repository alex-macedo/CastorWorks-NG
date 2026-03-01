import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppProject } from '@/contexts/AppProjectContext'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'
import { useRecordMeeting } from '@/hooks/useRecordMeeting'
import { supabase } from '@/integrations/supabase/client'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export default function AppLiveMeeting() {
  const { t } = useTranslation('app')
  const { selectedProject } = useAppProject()
  const [showNewMeeting, setShowNewMeeting] = useState(false)
  const [meetingTitle, setMeetingTitle] = useState('')
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [pulseScale, setPulseScale] = useState(1)
  const [isWhisperVisible, setIsWhisperVisible] = useState(true)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [pauseOffsetMs, setPauseOffsetMs] = useState(0)
  const [pausedAt, setPausedAt] = useState<number | null>(null)
  const notesSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const {
    meetings,
    createMeeting,
    updateNotes,
    finishWithAudio,
    isCreating,
    isFinishing,
    isUpdatingMeeting,
    isLoading,
  } = useRecordMeeting(selectedProject?.id)

  const activeMeeting = meetings.find((m) => m.id === activeMeetingId && !m.ended_at)

  // Debounced notes sync - auto-save as user types
  const debouncedSaveNotes = useCallback(
    (notesText: string) => {
      if (!activeMeetingId || !notesText.trim()) return
      if (notesSaveTimeoutRef.current) clearTimeout(notesSaveTimeoutRef.current)
      notesSaveTimeoutRef.current = setTimeout(() => {
        updateNotes({ id: activeMeetingId, notes: notesText.trim() })
      }, 1000)
    },
    [activeMeetingId, updateNotes]
  )

  useEffect(() => () => {
    if (notesSaveTimeoutRef.current) clearTimeout(notesSaveTimeoutRef.current)
  }, [])

  const displayMeetings = meetings

  // Timer effect for active meeting (respects pause)
  useEffect(() => {
    if (!activeMeeting) {
      setElapsedSeconds(0)
      setPauseOffsetMs(0)
      setPausedAt(null)
      return
    }

    const startTime = new Date(activeMeeting.started_at).getTime()
    const updateTimer = () => {
      if (isPaused && pausedAt) return
      const now = Date.now()
      const elapsed = now - startTime - pauseOffsetMs
      setElapsedSeconds(Math.max(0, Math.floor(elapsed / 1000)))
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [activeMeeting, isPaused, pausedAt, pauseOffsetMs])

  // Sync notes from meeting when opening modal
  useEffect(() => {
    if (showNotesModal && activeMeeting) {
      setNotes(activeMeeting.notes || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNotesModal, activeMeeting?.id])

  // Pulse animation for visualizer
  useEffect(() => {
    if (!activeMeeting) return
    const interval = setInterval(() => {
      setPulseScale(1 + Math.random() * 0.15)
    }, 150)
    return () => clearInterval(interval)
  }, [activeMeeting])

  // Start/stop audio recording when meeting becomes active/inactive
  useEffect(() => {
    if (!activeMeeting || !selectedProject?.id) return

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaStreamRef.current = stream
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
        const recorder = new MediaRecorder(stream)
        audioChunksRef.current = []

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data)
        }

        recorder.start(5000)
        mediaRecorderRef.current = recorder
      } catch (err) {
        console.warn('[AppLiveMeeting] Microphone access denied or unavailable:', err)
      }
    }

    startRecording()
    return () => {
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
      }
      mediaRecorderRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMeeting?.id, selectedProject?.id])

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatFullTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartMeeting = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject?.id || !meetingTitle.trim()) return

    createMeeting(
      {
        project_id: selectedProject.id,
        title: meetingTitle.trim(),
      },
      {
        onSuccess: (meeting) => {
          setActiveMeetingId(meeting.id)
          setMeetingTitle('')
          setShowNewMeeting(false)
        },
      }
    )
  }

  const handleSaveNotes = () => {
    if (!activeMeetingId) return
    if (notesSaveTimeoutRef.current) {
      clearTimeout(notesSaveTimeoutRef.current)
      notesSaveTimeoutRef.current = null
    }
    updateNotes({ id: activeMeetingId, notes: notes.trim() })
    setShowNotesModal(false)
  }

  const handleNotesChange = (value: string) => {
    setNotes(value)
    debouncedSaveNotes(value)
  }

  const handleOpenNotesModal = () => {
    setNotes(activeMeeting?.notes ?? '')
    setShowNotesModal(true)
  }

  const handleEndMeeting = async () => {
    if (!activeMeetingId || !selectedProject?.id) return
    if (notes.trim()) {
      updateNotes({ id: activeMeetingId, notes: notes.trim() })
    }

    // Stop audio recording, wait for final chunks, then upload
    let audioUrl: string | undefined
    const recorder = mediaRecorderRef.current
    if (recorder?.state !== 'inactive') {
      const stopPromise = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve()
      })
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
      recorder.stop()
      await stopPromise
      const chunks = [...audioChunksRef.current]
      mediaRecorderRef.current = null
      audioChunksRef.current = []

      const blob = new Blob(chunks, { type: 'audio/webm' })
      if (blob.size > 0) {
        try {
          const fileName = `${selectedProject.id}/meetings/${activeMeetingId}/audio.webm`
          const { error } = await supabase.storage
            .from('project-documents')
            .upload(fileName, blob, { contentType: 'audio/webm', upsert: true })
          if (!error) {
            const { data } = supabase.storage.from('project-documents').getPublicUrl(fileName)
            audioUrl = data?.publicUrl
          }
        } catch (err) {
          console.warn('[AppLiveMeeting] Audio upload failed:', err)
        }
      }
    }

    finishWithAudio({
      id: activeMeetingId,
      ...(audioUrl && { audio_url: audioUrl }),
      duration_seconds: elapsedSeconds,
    })
    cleanupAfterEnd()
  }

  const cleanupAfterEnd = () => {
    setActiveMeetingId(null)
    setNotes('')
    setIsPaused(false)
    setIsMuted(false)
    setPauseOffsetMs(0)
    setPausedAt(null)
  }

  const handlePauseResume = () => {
    if (isPaused && pausedAt) {
      setPauseOffsetMs((prev) => prev + (Date.now() - pausedAt))
      setPausedAt(null)
      setIsPaused(false)
    } else {
      setPausedAt(Date.now())
      setIsPaused(true)
    }
  }

  const handleMuteToggle = () => {
    setIsMuted((prev) => !prev)
  }

  const formatDuration = (startedAt: string, endedAt?: string) => {
    const start = new Date(startedAt)
    const end = endedAt ? new Date(endedAt) : new Date()
    const diffMs = end.getTime() - start.getTime()
    const minutes = Math.floor(diffMs / 60000)
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  // Active meeting - full immersive view
  if (activeMeeting) {
    return (
      <MobileAppLayout fullImmersion customHeader>
        <div className="bg-[#0D1418] min-h-screen flex flex-col text-white overflow-hidden font-sans">
          {/* Header */}
          <header className="p-4 pt-12 flex items-center justify-between relative z-10">
            <button 
              onClick={() => {
                setActiveMeetingId(null)
                setNotes('')
              }}
              className="size-10 bg-white/5 rounded-full flex items-center justify-center active:scale-90 transition-transform"
              aria-label={t('common.back', 'Back')}
            >
              <span className="material-symbols-outlined text-slate-400">chevron_left</span>
            </button>
            <div className="text-center">
              <h2 className="text-[17px] font-bold tracking-tight">{activeMeeting.title}</h2>
              <div className="flex items-center gap-2 justify-center mt-1">
                <div className="size-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {t('meetings.whisperModeActive', 'Whisper Mode Active')}
                </span>
              </div>
            </div>
            <button
              onClick={handleMuteToggle}
              className={cn(
                'size-10 rounded-full flex items-center justify-center transition-colors',
                isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-slate-300'
              )}
              aria-label={isMuted ? t('meetings.unmute', 'Unmute') : t('meetings.mic', 'Microphone')}
            >
              <span className="material-symbols-outlined !text-xl">{isMuted ? 'mic_off' : 'mic'}</span>
            </button>
          </header>

          {/* Agenda Progress Section */}
          <div className="px-6 py-6 space-y-4">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
                  {t('meetings.currentAgenda', 'Current Agenda')}
                </p>
                <h4 className="font-bold text-[19px] tracking-tight">
                  {selectedProject?.name || t('meetings.generalDiscussion', 'General Discussion')}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-amber-400 font-mono text-[15px] font-bold tracking-tighter">
                  {formatFullTimer(elapsedSeconds)} <span className="text-slate-500">/ 45:00</span>
                </span>
              </div>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
              <div 
                className="h-full bg-amber-400 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.4)] transition-all duration-1000" 
                style={{ width: `${Math.min((elapsedSeconds / 2700) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col relative overflow-hidden">
            {/* Animated AI Pulse Visualizer */}
            <div className="flex items-center justify-center py-8">
              <div className="relative size-44 flex items-center justify-center">
                {/* Outer ripples */}
                <div className="absolute inset-0 rounded-full border border-amber-400/10 animate-ping opacity-20" />
                <div className="absolute inset-4 rounded-full border border-amber-400/20 animate-pulse opacity-40" />
                <div className="absolute inset-8 rounded-full border-2 border-amber-400/30 opacity-60" />
                
                {/* Main Pulse Circle */}
                <div 
                  className="size-28 rounded-full bg-amber-400 flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.5)] transition-transform duration-150 ease-out"
                  style={{ transform: `scale(${pulseScale})` }}
                >
                  <span className="material-symbols-outlined text-[42px] font-bold text-black">graphic_eq</span>
                </div>
              </div>
            </div>

            {/* Live Transcript / Notes Area */}
            <div className="w-full px-6 flex-1 space-y-6 overflow-y-auto no-scrollbar pb-32">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="size-2 bg-amber-400 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-amber-400/80 uppercase tracking-widest">
                  {t('meetings.liveTranscript', 'Live Transcript')} • {t('meetings.listening', 'Listening')}
                </span>
              </div>

              <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {t('meetings.participant', 'Participant')} • {formatTimer(elapsedSeconds)}
                </span>
                <p className="text-[16px] text-slate-400 leading-relaxed font-medium italic">
                  {t('meetings.transcriptPlaceholder', 'AI transcription will appear here when available. Use the Note button to add meeting notes.')}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="bg-[#0B1114]/95 backdrop-blur-2xl border-t border-white/5 px-6 pb-12 pt-8 z-20">
            <div className="grid grid-cols-4 gap-4 mb-8">
              <button
                onClick={handlePauseResume}
                className="flex flex-col items-center gap-2 group"
                aria-label={isPaused ? t('meetings.resume', 'Resume') : t('meetings.pause', 'Pause')}
              >
                <div className={cn(
                  'size-13 rounded-2xl flex items-center justify-center border transition-all group-active:scale-90',
                  isPaused ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-white/5 border-white/10 text-slate-400'
                )}>
                  <span className="material-symbols-outlined !text-2xl">{isPaused ? 'play_arrow' : 'pause'}</span>
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {isPaused ? t('meetings.resume', 'Resume') : t('meetings.pause', 'Pause')}
                </span>
              </button>
              <button 
                onClick={handleOpenNotesModal}
                className="flex flex-col items-center gap-2 group"
                aria-label={t('meetings.quickNote', 'Quick Note')}
              >
                <div className="size-13 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-active:scale-90 transition-all">
                  <span className="material-symbols-outlined text-slate-400 !text-2xl">edit_note</span>
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('meetings.note', 'Note')}</span>
              </button>
              <button
                onClick={handleMuteToggle}
                className="flex flex-col items-center gap-2 group"
                aria-label={isMuted ? t('meetings.unmute', 'Unmute') : t('meetings.mute', 'Mute')}
              >
                <div className={cn(
                  'size-13 rounded-2xl flex items-center justify-center border transition-all group-active:scale-90',
                  isMuted ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-slate-400'
                )}>
                  <span className="material-symbols-outlined !text-2xl">{isMuted ? 'mic_off' : 'mic'}</span>
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {isMuted ? t('meetings.unmute', 'Unmute') : t('meetings.mute', 'Mute')}
                </span>
              </button>
              <button 
                onClick={() => setIsWhisperVisible(!isWhisperVisible)}
                className="flex flex-col items-center gap-2 group"
                aria-label={isWhisperVisible ? t('meetings.hideWhisper', 'Hide Whisper') : t('meetings.showWhisper', 'Show Whisper')}
              >
                <div className={cn(
                  'size-13 rounded-2xl flex items-center justify-center border transition-all group-active:scale-90',
                  isWhisperVisible 
                    ? 'bg-purple-900/20 border-purple-500/30 text-purple-400' 
                    : 'bg-white/5 border-white/10 text-slate-500'
                )}>
                  <span className="material-symbols-outlined !text-2xl">visibility_off</span>
                </div>
                <span className={cn(
                  'text-[10px] font-black uppercase tracking-widest transition-colors',
                  isWhisperVisible ? 'text-purple-400' : 'text-slate-500'
                )}>
                  {isWhisperVisible ? t('meetings.hide', 'Hide') : t('meetings.show', 'Show')}
                </span>
              </button>
            </div>
            
            <button 
              onClick={handleEndMeeting}
              disabled={isFinishing || isUpdatingMeeting}
              className="w-full h-15 bg-amber-400 hover:brightness-110 text-black font-black rounded-2xl flex items-center justify-center gap-3 shadow-[0_12px_30px_-10px_rgba(251,191,36,0.5)] active:scale-[0.98] transition-all uppercase tracking-[0.2em] text-[15px] disabled:opacity-50"
            >
              <span className="material-symbols-outlined !text-[24px]">auto_awesome</span>
              {isFinishing || isUpdatingMeeting ? t('common.saving', 'Saving...') : t('meetings.finishAndSummarize', 'Finish & Summarize')}
            </button>
          </div>
        </div>

        {/* Notes Modal */}
        <Dialog open={showNotesModal} onOpenChange={setShowNotesModal}>
          <DialogContent className="bg-[#121A1E] border-white/10 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">{t('meetings.quickNote', 'Quick Note')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                className="bg-[#1C2A31] border-white/5 min-h-[120px] text-white placeholder:text-slate-500"
                placeholder={t('meetings.notesPlaceholder', 'Add meeting notes...')}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNotesModal(false)}
                  className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl font-bold text-slate-300"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="flex-1 h-12 bg-amber-400 text-black font-bold rounded-xl"
                >
                  {t('common.save', 'Save')}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </MobileAppLayout>
    )
  }

  // No active meeting - show meeting list
  return (
    <MobileAppLayout showProjectSelector>
      <div className="bg-black min-h-screen text-white pb-32">
        <main className="px-5 py-6 space-y-6">
          {/* Start Meeting Card */}
          <section className="bg-gradient-to-br from-[#121619] to-[#0A0D0F] border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="size-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                <span className="material-symbols-outlined !text-3xl">videocam</span>
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">{t('meetings.startNewMeeting', 'Start New Meeting')}</h2>
                <p className="text-sm text-slate-500">{t('meetings.recordWithAI', 'Record with AI-powered transcription')}</p>
              </div>
            </div>
            <button
              onClick={() => setShowNewMeeting(true)}
              className="w-full h-14 bg-amber-400 text-black rounded-2xl font-black uppercase tracking-widest text-[13px] flex items-center justify-center gap-3 shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined !text-xl">videocam</span>
              {t('meetings.startMeeting', 'Start Meeting')}
            </button>
          </section>

          {/* Past Meetings */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">
                {t('meetings.pastMeetings', 'Past Meetings')}
              </h3>
              <span className="text-amber-400 text-[11px] font-black uppercase tracking-widest">
                {displayMeetings.filter(m => m.ended_at).length} {t('meetings.total', 'total')}
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="size-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : displayMeetings.filter(m => m.ended_at).length === 0 ? (
              <div className="bg-[#1c1c1e] rounded-3xl p-8 border border-white/5 text-center">
                <div className="size-16 rounded-2xl bg-amber-400/10 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-amber-400 !text-3xl">event_note</span>
                </div>
                <h3 className="text-lg font-bold mb-1">{t('meetings.noMeetings', 'No past meetings')}</h3>
                <p className="text-sm text-slate-500">{t('meetings.startFirst', 'Start your first meeting')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayMeetings
                  .filter(m => m.ended_at)
                  .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
                  .map(meeting => (
                    <div key={meeting.id} className="bg-[#1c1c1e] rounded-3xl p-5 border border-white/5">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <div className={cn(
                            'size-10 rounded-xl flex items-center justify-center border',
                            meeting.notes 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-slate-800/50 border-white/5 text-slate-500'
                          )}>
                            <span className="material-symbols-outlined !text-xl">
                              {meeting.notes ? 'description' : 'videocam'}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-[15px] font-bold">{meeting.title}</h4>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                              {new Date(meeting.started_at).toLocaleDateString()} • {formatDuration(meeting.started_at, meeting.ended_at)}
                            </p>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-600">chevron_right</span>
                      </div>
                      {meeting.notes && (
                        <p className="text-sm text-slate-400 mt-3 pt-3 border-t border-white/5 line-clamp-2">
                          {meeting.notes}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* New Meeting Dialog */}
      <Dialog open={showNewMeeting} onOpenChange={setShowNewMeeting}>
        <DialogContent className="bg-[#121A1E] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t('meetings.newMeeting', 'New Meeting')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStartMeeting} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-300">{t('meetings.meetingTitle', 'Meeting Title')}</Label>
              <Input
                id="title"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="bg-[#1C2A31] border-white/5 text-white placeholder:text-slate-500"
                placeholder={t('meetings.titlePlaceholder', 'Weekly sync, Site visit...')}
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowNewMeeting(false)}
                className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl font-bold text-slate-300 active:scale-95 transition-all"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isCreating || !meetingTitle.trim()}
                className="flex-1 h-12 bg-amber-400 text-black font-bold rounded-xl shadow-lg shadow-amber-400/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined mr-1 align-middle">videocam</span>
                {t('meetings.start', 'Start')}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MobileAppLayout>
  )
}
