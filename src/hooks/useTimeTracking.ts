import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTimerContext } from '@/contexts/TimeTrackingContext';

// Minimal local types
export type TimeEntryStatus = 'running' | 'paused' | 'completed';

export type TimeEntry = {
  id: string;
  user_id: string;
  project_id?: string | null;
  task_id?: string | null;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  duration_minutes: number;
  billable?: boolean;
  hourly_rate?: number | null;
  status: TimeEntryStatus;
  accumulated_seconds: number;
};

export type TimeEntryInsert = Partial<TimeEntry> & { user_id?: string };


export const useTimeEntries = (projectId?: string) => {
  const queryKey = projectId ? ['timeEntries', projectId] : ['timeEntries', 'all'];
  return useQuery<TimeEntry[]>({
    queryKey,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return [];

      let q = supabase.from('architect_time_entries').select('*').eq('user_id', userId).order('start_time', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as TimeEntry[];
    },
    retry: false,
  });
};

export const useCreateTimeEntry = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation<TimeEntry, any, TimeEntryInsert>({
    mutationFn: async (payload) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.from('architect_time_entries').insert({
        ...payload,
        user_id: user.id
      }).select().single();
      
      if (error) throw error;
      return data as TimeEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeEntries'] });
      toast({ title: 'Time entry saved' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err?.message || 'Failed to save time entry', variant: 'destructive' });
    },
  });
};

export const useUpdateTimeEntry = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation<TimeEntry, any, Partial<TimeEntry> & { id: string }>({
    mutationFn: async (payload) => {
      const { id, ...rest } = payload;
      const { data, error } = await supabase.from('architect_time_entries').update(rest).eq('id', id).select().single();
      if (error) throw error;
      return data as TimeEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeEntries'] });
      toast({ title: 'Time entry updated' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err?.message || 'Failed to update time entry', variant: 'destructive' });
    },
  });
};

export const useDeleteTimeEntry = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation<string, any, string>({
    mutationFn: async (id) => {
      const { error } = await supabase.from('architect_time_entries').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeEntries'] });
      toast({ title: 'Time entry deleted' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err?.message || 'Failed to delete time entry', variant: 'destructive' });
    },
  });
};

// Re-export hook that uses GLOBAL Context state
export const useTimer = () => {
  return useTimerContext();
};

export function computeTotalHours(entries: TimeEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / 60;
}

export function computeTotalBillable(entries: TimeEntry[]): number {
  return entries
    .filter(e => e.billable && typeof e.hourly_rate === 'number')
    .reduce((sum, e) => sum + ((e.duration_minutes / 60) * (e.hourly_rate || 0)), 0);
}

// ============================================================================
// Auto-Save Functions for Time Tracker
// ============================================================================

/**
 * Hook to fetch any active (running/paused) time entry for the current user.
 * Used to resume tracking after browser crash/reload.
 */
export const useActiveTimeEntry = () => {
  return useQuery<TimeEntry | null>({
    queryKey: ['timeEntries', 'active'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return null;

      const { data, error } = await supabase
        .from('architect_time_entries')
        .select('*')
        .eq('user_id', userData.user.id)
        .in('status', ['running', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as TimeEntry | null;
    },
    staleTime: 0, // Always refetch on mount
    retry: false,
  });
};

/**
 * Create a new running entry immediately when timer starts.
 * This ensures data is saved to Supabase from the beginning.
 */
export async function createRunningEntry(entry: Omit<TimeEntryInsert, 'user_id' | 'status'>): Promise<TimeEntry> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('architect_time_entries')
    .insert({
      ...entry,
      user_id: user.id,
      status: 'running',
      accumulated_seconds: 0,
      duration_minutes: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as TimeEntry;
}

/**
 * Update a running entry with current elapsed time.
 * Called periodically (every 60 seconds) during active tracking.
 */
export async function updateRunningEntry(
  id: string,
  updates: { accumulated_seconds: number; duration_minutes: number; description?: string }
): Promise<void> {
  const { error } = await supabase
    .from('architect_time_entries')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Failed to auto-save time entry:', error);
    // Don't throw - we don't want to interrupt the user's work
    // The entry will be saved on next interval or when stopped
  }
}

/**
 * Mark a running entry as completed with final end_time.
 */
export async function completeTimeEntry(
  id: string,
  finalData: {
    end_time: string;
    duration_minutes: number;
    accumulated_seconds: number;
    project_id?: string | null;
    task_id?: string | null;
    description?: string;
  }
): Promise<TimeEntry> {
  const { data, error } = await supabase
    .from('architect_time_entries')
    .update({
      ...finalData,
      status: 'completed',
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as TimeEntry;
}

/**
 * Delete an in-progress entry (when user discards the timer).
 */
export async function deleteRunningEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('architect_time_entries')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

