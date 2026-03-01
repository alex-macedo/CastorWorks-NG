export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // Format: "HH:mm"
  endTime: string; // Format: "HH:mm"
  date: string; // Format: "yyyy-MM-dd"
  participants: string[];
  meetingLink?: string;
  timezone?: string;
  source: "task" | "project" | "meeting"; // Track the source of the event
  sourceId?: string; // Original ID from source table
  color?: string; // Visual color for different sources
}

export type EventTypeFilter = "all" | "task" | "project" | "meeting";
export type ParticipantsFilter = "all" | "with-participants" | "without-participants";
