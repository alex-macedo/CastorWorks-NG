import { create } from "zustand";
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  addDays,
} from "date-fns";
import { CalendarEvent, EventTypeFilter, ParticipantsFilter } from "@/types/calendar";

interface CalendarState {
  events: CalendarEvent[];
  currentWeekStart: Date;
  searchQuery: string;
  eventTypeFilter: EventTypeFilter;
  participantsFilter: ParticipantsFilter;
  goToNextWeek: () => void;
  goToPreviousWeek: () => void;
  goToToday: () => void;
  goToDate: (date: Date) => void;
  setSearchQuery: (query: string) => void;
  setEventTypeFilter: (filter: EventTypeFilter) => void;
  setParticipantsFilter: (filter: ParticipantsFilter) => void;
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (eventId: string) => void;
  getCurrentWeekEvents: () => CalendarEvent[];
  getWeekDays: () => Date[];
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  currentWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }),
  searchQuery: "",
  eventTypeFilter: "all",
  participantsFilter: "all",

  goToNextWeek: () =>
    set((state) => ({
      currentWeekStart: addWeeks(state.currentWeekStart, 1),
    })),

  goToPreviousWeek: () =>
    set((state) => ({
      currentWeekStart: subWeeks(state.currentWeekStart, 1),
    })),

  goToToday: () =>
    set({
      currentWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }),
    }),

  goToDate: (date: Date) =>
    set({
      currentWeekStart: startOfWeek(date, { weekStartsOn: 1 }),
    }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setEventTypeFilter: (filter: EventTypeFilter) =>
    set({ eventTypeFilter: filter }),

  setParticipantsFilter: (filter: ParticipantsFilter) =>
    set({ participantsFilter: filter }),

  setEvents: (events: CalendarEvent[]) => set({ events }),

  addEvent: (event: CalendarEvent) =>
    set((state) => ({
      events: [...state.events, event],
    })),

  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) =>
    set((state) => ({
      events: state.events.map((event) =>
        event.id === eventId ? { ...event, ...updates } : event
      ),
    })),

  deleteEvent: (eventId: string) =>
    set((state) => ({
      events: state.events.filter((event) => event.id !== eventId),
    })),

  getCurrentWeekEvents: () => {
    const state = get();
    const weekStart = state.currentWeekStart;
    const weekEnd = addDays(weekStart, 6);

    let filteredEvents = state.events.filter((event) => {
      const eventDate = new Date(event.date);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });

    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filteredEvents = filteredEvents.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.participants.some((p) => p.toLowerCase().includes(query))
      );
    }

    // Apply event type filter
    if (state.eventTypeFilter !== "all") {
      filteredEvents = filteredEvents.filter(
        (event) => event.source === state.eventTypeFilter
      );
    }

    // Apply participants filter
    if (state.participantsFilter === "with-participants") {
      filteredEvents = filteredEvents.filter(
        (event) => event.participants.length > 0
      );
    } else if (state.participantsFilter === "without-participants") {
      filteredEvents = filteredEvents.filter(
        (event) => event.participants.length === 0
      );
    }

    return filteredEvents;
  },

  getWeekDays: () => {
    const state = get();
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(state.currentWeekStart, i));
    }
    return days;
  },
}));
