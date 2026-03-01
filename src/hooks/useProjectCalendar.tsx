/**
 * useProjectCalendar Hook
 *
 * Manages project calendar data including:
 * - Calendar enabled/disabled state
 * - Non-working days (holidays)
 * - Working days pattern
 * - CRUD operations on calendar entries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { clearCalendarCache } from '@/utils/workingDayCalculators';

export interface CalendarEntry {
  id: string;
  project_id: string;
  calendar_date: string;
  is_working_day: boolean;
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCalendarSettings {
  calendar_enabled: boolean;
  calendar_default_working_days: string;
}

/**
 * Fetch project calendar settings
 */
export function useProjectCalendarSettings(projectId: string) {
  return useQuery({
    queryKey: ['project-calendar-settings', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('calendar_enabled, calendar_default_working_days')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data as ProjectCalendarSettings;
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch calendar entries for a project
 */
export function useProjectCalendarEntries(projectId: string, options?: {
  startDate?: string;
  endDate?: string;
  isWorkingDay?: boolean;
}) {
  return useQuery({
    queryKey: ['project-calendar-entries', projectId, options],
    queryFn: async () => {
      let query = supabase
        .from('project_calendar')
        .select('*')
        .eq('project_id', projectId);

      if (options?.startDate) {
        query = query.gte('calendar_date', options.startDate);
      }

      if (options?.endDate) {
        query = query.lte('calendar_date', options.endDate);
      }

      if (options?.isWorkingDay !== undefined) {
        query = query.eq('is_working_day', options.isWorkingDay);
      }

      query = query.order('calendar_date', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return data as CalendarEntry[];
    },
    enabled: !!projectId,
  });
}

/**
 * Hook for calendar CRUD operations
 */
export function useProjectCalendar(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Toggle calendar enabled
  const toggleCalendarEnabled = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('projects')
        .update({ calendar_enabled: enabled })
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['project-calendar-settings', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      clearCalendarCache(projectId);

      toast({
        title: enabled ? 'Calendar Enabled' : 'Calendar Disabled',
        description: enabled
          ? 'Project will now use working day calculations'
          : 'Project will use calendar day calculations',
      });
    },
    onError: (error) => {
      console.error('Error toggling calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to update calendar setting',
        variant: 'destructive',
      });
    },
  });

  // Add single non-working day
  const addNonWorkingDay = useMutation({
    mutationFn: async ({ date, reason }: { date: string; reason: string }) => {
      const { error } = await supabase
        .from('project_calendar')
        .insert({
          project_id: projectId,
          calendar_date: date,
          is_working_day: false,
          reason,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-calendar-entries', projectId] });
      clearCalendarCache(projectId);

      toast({
        title: 'Holiday Added',
        description: 'Non-working day has been added to the calendar',
      });
    },
    onError: (error: any) => {
      console.error('Error adding non-working day:', error);
      toast({
        title: 'Error',
        description: error.message?.includes('duplicate')
          ? 'This date already exists in the calendar'
          : 'Failed to add non-working day',
        variant: 'destructive',
      });
    },
  });

  // Remove non-working day
  const removeNonWorkingDay = useMutation({
    mutationFn: async (date: string) => {
      const { error } = await supabase
        .from('project_calendar')
        .delete()
        .eq('project_id', projectId)
        .eq('calendar_date', date);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-calendar-entries', projectId] });
      clearCalendarCache(projectId);

      toast({
        title: 'Date Removed',
        description: 'Calendar entry has been removed',
      });
    },
    onError: (error) => {
      console.error('Error removing calendar entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove calendar entry',
        variant: 'destructive',
      });
    },
  });

  // Bulk add non-working days
  const bulkAddNonWorkingDays = useMutation({
    mutationFn: async (entries: Array<{ date: string; reason: string }>) => {
      const { error } = await supabase
        .from('project_calendar')
        .insert(
          entries.map(entry => ({
            project_id: projectId,
            calendar_date: entry.date,
            is_working_day: false,
            reason: entry.reason,
          }))
        );

      if (error) throw error;
    },
    onSuccess: (_, entries) => {
      queryClient.invalidateQueries({ queryKey: ['project-calendar-entries', projectId] });
      clearCalendarCache(projectId);

      toast({
        title: 'Holidays Added',
        description: `${entries.length} non-working days have been added`,
      });
    },
    onError: (error) => {
      console.error('Error bulk adding holidays:', error);
      toast({
        title: 'Error',
        description: 'Failed to add holidays. Some dates may already exist.',
        variant: 'destructive',
      });
    },
  });

  // Update calendar entry
  const updateCalendarEntry = useMutation({
    mutationFn: async ({ date, is_working_day, reason }: {
      date: string;
      is_working_day: boolean;
      reason?: string;
    }) => {
      const { error } = await supabase
        .from('project_calendar')
        .update({ is_working_day, reason })
        .eq('project_id', projectId)
        .eq('calendar_date', date);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-calendar-entries', projectId] });
      clearCalendarCache(projectId);

      toast({
        title: 'Calendar Updated',
        description: 'Calendar entry has been updated',
      });
    },
    onError: (error) => {
      console.error('Error updating calendar entry:', error);
      toast({
        title: 'Error',
        description: 'Failed to update calendar entry',
        variant: 'destructive',
      });
    },
  });

  return {
    toggleCalendarEnabled,
    addNonWorkingDay,
    removeNonWorkingDay,
    bulkAddNonWorkingDays,
    updateCalendarEntry,
  };
}
