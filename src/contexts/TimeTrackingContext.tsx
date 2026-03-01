
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import {
  type TimeEntry,
  type TimeEntryInsert,
  createRunningEntry,
  updateRunningEntry,
  completeTimeEntry,
  deleteRunningEntry,
  useActiveTimeEntry,
} from '@/hooks/useTimeTracking';
import { useQueryClient } from '@tanstack/react-query';

type TimerState = {
  isRunning: boolean;
  isPaused: boolean;
  startTime: string | null;
  accumulatedSeconds: number;
  projectId: string | null;
  taskId: string | null;
  description: string;
};

type TimeTrackingContextType = {
  isRunning: boolean;
  isPaused: boolean;
  startTime: string | null;
  projectId: string | null;
  taskId: string | null;
  description: string;
  elapsedSeconds: number;
  formattedElapsed: string;
  activeEntryId: string | null;
  pendingResumeEntry: TimeEntry | null;
  startTimer: (projectId?: string | null, taskId?: string | null, description?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => Promise<TimeEntryInsert | null>;
  discardTimer: () => void;
  updateTimerContext: (projectId?: string | null, taskId?: string | null, description?: string) => void;
  confirmResumeEntry: () => void;
  discardResumeEntry: () => void;
};

const TimeTrackingContext = createContext<TimeTrackingContextType | null>(null);

const TIMER_KEY = 'castorworks_timer_state_v2'; // Bumped version for new structure
const ENTRY_ID_KEY = 'castorworks_timer_entry_id';
const AUTO_SAVE_INTERVAL_MS = 60_000; // 60 seconds

function loadTimerState(): TimerState {
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return { isRunning: false, isPaused: false, startTime: null, accumulatedSeconds: 0, projectId: null, taskId: null, description: '' };
    const parsed = JSON.parse(raw);
    if (parsed.isPaused === undefined) parsed.isPaused = false;
    if (parsed.accumulatedSeconds === undefined) parsed.accumulatedSeconds = 0;
    return parsed as TimerState;
  } catch {
    return { isRunning: false, isPaused: false, startTime: null, accumulatedSeconds: 0, projectId: null, taskId: null, description: '' };
  }
}

function saveTimerState(s: TimerState, entryId: string | null) {
  try {
    localStorage.setItem(TIMER_KEY, JSON.stringify(s));
    if (entryId) {
      localStorage.setItem(ENTRY_ID_KEY, entryId);
    } else {
      localStorage.removeItem(ENTRY_ID_KEY);
    }
  } catch {
    // Ignore storage write errors
  }
}

function loadEntryId(): string | null {
  try {
    return localStorage.getItem(ENTRY_ID_KEY);
  } catch {
    return null;
  }
}

function clearTimerState() {
  try {
    localStorage.removeItem(TIMER_KEY);
    localStorage.removeItem(ENTRY_ID_KEY);
  } catch {
    // Ignore storage removal errors
  }
}

export function TimeTrackingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [timerState, setTimerState] = useState<TimerState>(loadTimerState);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(loadEntryId);
  const [pendingResumeEntry, setPendingResumeEntry] = useState<TimeEntry | null>(null);
  const [hasCheckedForResume, setHasCheckedForResume] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Query for any active entry in the database (for crash recovery)
  const { data: activeDbEntry, isLoading: isLoadingActiveEntry } = useActiveTimeEntry();

  // Check for resume on mount (only once)
  useEffect(() => {
    if (hasCheckedForResume || isLoadingActiveEntry) return;
    
    // If we have an active entry in DB but no local state, show resume dialog
    if (activeDbEntry && !timerState.isRunning) {
      setPendingResumeEntry(activeDbEntry);
    }
    setHasCheckedForResume(true);
  }, [activeDbEntry, isLoadingActiveEntry, timerState.isRunning, hasCheckedForResume]);

  // Sync state changes to localStorage
  useEffect(() => {
    if (timerState.isRunning) {
      saveTimerState(timerState, activeEntryId);
    } else {
      clearTimerState();
    }
  }, [timerState, activeEntryId]);

  // Listen for storage changes to sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TIMER_KEY) {
        setTimerState(loadTimerState());
      }
      if (e.key === ENTRY_ID_KEY) {
        setActiveEntryId(loadEntryId());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateElapsed = useCallback(() => {
    let currentSegment = 0;
    if (timerState.isRunning && !timerState.isPaused && timerState.startTime) {
      const start = new Date(timerState.startTime).getTime();
      currentSegment = Math.floor((Date.now() - start) / 1000);
    }
    setElapsedSeconds(timerState.accumulatedSeconds + currentSegment);
  }, [timerState.isRunning, timerState.isPaused, timerState.startTime, timerState.accumulatedSeconds]);

  // Timer tick effect
  useEffect(() => {
    if (timerState.isRunning && !timerState.isPaused) {
      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 1000);
    } else {
      updateElapsed();
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerState.isRunning, timerState.isPaused, updateElapsed]);

  // Auto-save effect - save to Supabase every 60 seconds
  useEffect(() => {
    if (!timerState.isRunning || !activeEntryId) {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
        autoSaveRef.current = null;
      }
      return;
    }

    const performAutoSave = async () => {
      if (!activeEntryId) return;
      
      // Calculate current elapsed
      let currentSeconds = timerState.accumulatedSeconds;
      if (!timerState.isPaused && timerState.startTime) {
        const start = new Date(timerState.startTime).getTime();
        currentSeconds += Math.floor((Date.now() - start) / 1000);
      }

      try {
        await updateRunningEntry(activeEntryId, {
          accumulated_seconds: currentSeconds,
          duration_minutes: Math.max(1, Math.ceil(currentSeconds / 60)),
          description: timerState.description || undefined,
        });
        console.log('[TimeTracker] Auto-saved at', new Date().toLocaleTimeString(), '- elapsed:', currentSeconds, 'seconds');
      } catch (error) {
        console.error('[TimeTracker] Auto-save failed:', error);
        // Don't throw - we'll try again on next interval
      }
    };

    // Initial save after 60 seconds, then every 60 seconds
    autoSaveRef.current = setInterval(performAutoSave, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
        autoSaveRef.current = null;
      }
    };
  }, [timerState.isRunning, timerState.isPaused, timerState.startTime, timerState.accumulatedSeconds, timerState.description, activeEntryId]);

  const startTimer = useCallback(async (projectId?: string | null, taskId?: string | null, description?: string) => {
    const now = new Date().toISOString();
    
    try {
      // Create entry in Supabase immediately
      const entry = await createRunningEntry({
        project_id: projectId || null,
        task_id: taskId || null,
        description: description || '',
        start_time: now,
        billable: true,
      });
      
      setActiveEntryId(entry.id);
      setTimerState({ 
        isRunning: true, 
        isPaused: false,
        startTime: now, 
        accumulatedSeconds: 0,
        projectId: projectId || null, 
        taskId: taskId || null, 
        description: description || '' 
      });
      
      console.log('[TimeTracker] Started and saved to Supabase, entry ID:', entry.id);
    } catch (error) {
      console.error('[TimeTracker] Failed to create entry in Supabase:', error);
      // Still start the timer locally - it will be saved when stopped
      setTimerState({ 
        isRunning: true, 
        isPaused: false,
        startTime: now, 
        accumulatedSeconds: 0,
        projectId: projectId || null, 
        taskId: taskId || null, 
        description: description || '' 
      });
    }
  }, []);

  const pauseTimer = useCallback(() => {
    if (!timerState.isRunning || timerState.isPaused || !timerState.startTime) return;
    
    const now = new Date();
    const start = new Date(timerState.startTime);
    const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
    
    setTimerState(prev => ({
      ...prev,
      isPaused: true,
      startTime: null,
      accumulatedSeconds: prev.accumulatedSeconds + diff
    }));
  }, [timerState]);

  const resumeTimer = useCallback(() => {
    if (!timerState.isRunning || !timerState.isPaused) return;
    
    setTimerState(prev => ({
      ...prev,
      isPaused: false,
      startTime: new Date().toISOString()
    }));
  }, [timerState]);

  const stopTimer = useCallback(async () => {
    if (!timerState.isRunning) return null;
    
    let totalSeconds = timerState.accumulatedSeconds;
    
    // If running, add current segment
    if (!timerState.isPaused && timerState.startTime) {
      const endTime = new Date();
      const startMs = new Date(timerState.startTime).getTime();
      totalSeconds += Math.floor((endTime.getTime() - startMs) / 1000);
    }

    const durationMinutes = Math.max(1, Math.round(totalSeconds / 60));
    const endTimeIso = new Date().toISOString();
    const startTimeIso = new Date(new Date().getTime() - totalSeconds * 1000).toISOString();

    // If we have an active entry, complete it
    if (activeEntryId) {
      try {
        await completeTimeEntry(activeEntryId, {
          end_time: endTimeIso,
          duration_minutes: durationMinutes,
          accumulated_seconds: totalSeconds,
          project_id: timerState.projectId,
          task_id: timerState.taskId,
          description: timerState.description || undefined,
        });
        console.log('[TimeTracker] Completed and saved entry:', activeEntryId);
        
        // Invalidate queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      } catch (error) {
        console.error('[TimeTracker] Failed to complete entry:', error);
        // Return the entry data so caller can try to save it
      }
    }

    const entry: TimeEntryInsert = {
      start_time: startTimeIso,
      end_time: endTimeIso,
      duration_minutes: durationMinutes,
      project_id: timerState.projectId || null,
      task_id: timerState.taskId || null,
      description: timerState.description || undefined,
      billable: true,
    };

    setTimerState({ isRunning: false, isPaused: false, startTime: null, accumulatedSeconds: 0, projectId: null, taskId: null, description: '' });
    setElapsedSeconds(0);
    setActiveEntryId(null);
    
    return entry;
  }, [timerState, activeEntryId, queryClient]);

  const discardTimer = useCallback(async () => {
    // If we have an active entry, delete it from Supabase
    if (activeEntryId) {
      try {
        await deleteRunningEntry(activeEntryId);
        console.log('[TimeTracker] Discarded and deleted entry:', activeEntryId);
        queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
      } catch (error) {
        console.error('[TimeTracker] Failed to delete entry:', error);
      }
    }
    
    setTimerState({ isRunning: false, isPaused: false, startTime: null, accumulatedSeconds: 0, projectId: null, taskId: null, description: '' });
    setElapsedSeconds(0);
    setActiveEntryId(null);
  }, [activeEntryId, queryClient]);

  const updateTimerContext = useCallback((projectId?: string | null, taskId?: string | null, description?: string) => {
    setTimerState(prev => ({
      ...prev,
      projectId: projectId !== undefined ? (projectId || null) : prev.projectId,
      taskId: taskId !== undefined ? (taskId || null) : prev.taskId,
      description: description !== undefined ? description : prev.description,
    }));
  }, []);

  // Resume a pending entry from crash recovery
  const confirmResumeEntry = useCallback(() => {
    if (!pendingResumeEntry) return;
    
    // Calculate elapsed time since the entry was last saved
    const accumulatedSeconds = pendingResumeEntry.accumulated_seconds || 0;
    
    setActiveEntryId(pendingResumeEntry.id);
    setTimerState({
      isRunning: true,
      isPaused: false,
      startTime: new Date().toISOString(),
      accumulatedSeconds,
      projectId: pendingResumeEntry.project_id || null,
      taskId: pendingResumeEntry.task_id || null,
      description: pendingResumeEntry.description || '',
    });
    setPendingResumeEntry(null);
    
    console.log('[TimeTracker] Resumed entry from crash recovery:', pendingResumeEntry.id);
  }, [pendingResumeEntry]);

  // Discard a pending entry from crash recovery
  const discardResumeEntry = useCallback(async () => {
    if (!pendingResumeEntry) return;
    
    try {
      await deleteRunningEntry(pendingResumeEntry.id);
      console.log('[TimeTracker] Discarded orphaned entry:', pendingResumeEntry.id);
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] });
    } catch (error) {
      console.error('[TimeTracker] Failed to delete orphaned entry:', error);
    }
    
    setPendingResumeEntry(null);
  }, [pendingResumeEntry, queryClient]);

  const formattedElapsed = (() => {
    const h = Math.floor(elapsedSeconds / 3600);
    const m = Math.floor((elapsedSeconds % 3600) / 60);
    const s = elapsedSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  })();

  return (
    <TimeTrackingContext.Provider value={{
      isRunning: timerState.isRunning,
      isPaused: timerState.isPaused,
      startTime: timerState.startTime,
      projectId: timerState.projectId,
      taskId: timerState.taskId,
      description: timerState.description,
      elapsedSeconds,
      formattedElapsed,
      activeEntryId,
      pendingResumeEntry,
      startTimer,
      pauseTimer,
      resumeTimer,
      stopTimer,
      discardTimer,
      updateTimerContext,
      confirmResumeEntry,
      discardResumeEntry,
    }}>
      {children}
    </TimeTrackingContext.Provider>
  );
}

export const useTimerContext = () => {
  const context = useContext(TimeTrackingContext);
  if (!context) {
    throw new Error('useTimerContext must be used within a TimeTrackingProvider');
  }
  return context;
};
