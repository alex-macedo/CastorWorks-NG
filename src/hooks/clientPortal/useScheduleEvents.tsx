/**
 * useScheduleEvents Hook
 * 
 * Manages schedule events for the Client Portal
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ScheduleEvent, EventType } from '@/types/clientPortal';
import { useClientPortalAuth } from './useClientPortalAuth';

interface UseScheduleEventsOptions {
  type?: EventType;
  startDate?: string;
  endDate?: string;
}

export function useScheduleEvents(options: UseScheduleEventsOptions = {}) {
  const { projectId, isAuthenticated, token } = useClientPortalAuth();
  const queryClient = useQueryClient();

  // Fetch schedule events
  const {
    data: events,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['scheduleEvents', projectId, options],
    queryFn: async () => {
      if (!projectId) return [];

      // Use RPC function for secure fetching with project ID
      const { data, error } = await supabase
        .rpc('get_portal_schedule', { p_project_id: projectId });

      if (error) throw error;
      
      let filteredData = data as ScheduleEvent[];

      // Apply filters client-side since RPC returns all for project
      if (options.type) {
        filteredData = filteredData.filter(e => e.type === options.type);
      }

      if (options.startDate) {
        filteredData = filteredData.filter(e => e.event_date >= options.startDate!);
      }

      if (options.endDate) {
        filteredData = filteredData.filter(e => e.event_date <= options.endDate!);
      }

      return filteredData;
    },
    enabled: isAuthenticated && !!projectId,
  });

  // Get upcoming events (next 30 days)
  const {
    data: upcomingEvents,
    isLoading: isLoadingUpcoming,
  } = useQuery({
    queryKey: ['scheduleEvents', 'upcoming', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const endDate = thirtyDaysFromNow.toISOString().split('T')[0];

      const { data, error } = await supabase
        .rpc('get_portal_schedule', { p_project_id: projectId });

      if (error) throw error;
      
      const events = data as ScheduleEvent[];
      
      return events
        .filter(e => e.event_date >= today && e.event_date <= endDate)
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
        .slice(0, 10);
    },
    enabled: isAuthenticated && !!projectId,
  });

  // Get events by month
  const useEventsByMonth = (year: number, month: number) => {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    return useQuery({
      queryKey: ['scheduleEvents', 'month', projectId, year, month],
      queryFn: async () => {
        if (!projectId) return [];

        const { data, error } = await supabase
          .from('schedule_events')
          .select('*')
          .eq('project_id', projectId)
          .gte('event_date', startDate)
          .lte('event_date', endDate)
          .order('event_date', { ascending: true });

        if (error) throw error;
        return data as ScheduleEvent[];
      },
      enabled: isAuthenticated && !!projectId,
    });
  };

  // Get event by ID
  const useEventById = (eventId: string) => {
    return useQuery({
      queryKey: ['scheduleEvent', eventId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('schedule_events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (error) throw error;
        return data as ScheduleEvent;
      },
      enabled: !!eventId,
    });
  };

  // Create event mutation (for team members)
  const createEvent = useMutation({
    mutationFn: async (event: Omit<ScheduleEvent, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('schedule_events')
        .insert(event)
        .select()
        .single();

      if (error) throw error;
      return data as ScheduleEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleEvents'] });
    },
  });

  // Update event mutation (for team members)
  const updateEvent = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ScheduleEvent> }) => {
      const { data, error } = await supabase
        .from('schedule_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ScheduleEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleEvents'] });
    },
  });

  // Delete event mutation (for team members)
  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('schedule_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleEvents'] });
    },
  });

  // Group events by type
  const eventsByType = events?.reduce((acc, event) => {
    if (!acc[event.type]) {
      acc[event.type] = [];
    }
    acc[event.type].push(event);
    return acc;
  }, {} as Record<EventType, ScheduleEvent[]>);

  // Get event counts by type
  const eventCounts = {
    milestone: events?.filter(e => e.type === 'milestone').length || 0,
    meeting: events?.filter(e => e.type === 'meeting').length || 0,
    inspection: events?.filter(e => e.type === 'inspection').length || 0,
    deadline: events?.filter(e => e.type === 'deadline').length || 0,
  };

  return {
    events: events || [],
    upcomingEvents: upcomingEvents || [],
    eventsByType,
    eventCounts,
    isLoading,
    isLoadingUpcoming,
    error,
    useEventsByMonth,
    useEventById,
    createEvent: createEvent.mutateAsync,
    updateEvent: updateEvent.mutateAsync,
    deleteEvent: deleteEvent.mutateAsync,
    isCreating: createEvent.isPending,
    isUpdating: updateEvent.isPending,
    isDeleting: deleteEvent.isPending,
  };
}

/**
 * Hook to get next upcoming event
 */
export function useNextEvent() {
  const { upcomingEvents, isLoadingUpcoming } = useScheduleEvents();

  return {
    nextEvent: upcomingEvents?.[0] || null,
    isLoading: isLoadingUpcoming,
  };
}
