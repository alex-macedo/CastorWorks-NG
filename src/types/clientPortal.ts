/**
 * Client Portal TypeScript Type Definitions
 * 
 * This file contains all type definitions for the Client Portal module.
 * These types align with the database schema defined in the migrations.
 */

// =====================================================
// CLIENT PORTAL AUTHENTICATION
// =====================================================

export interface ClientPortalToken {
  id: string;
  project_id: string;
  client_id: string | null;
  token: string;
  expires_at: string | null;
  created_at: string;
  last_accessed_at: string | null;
  is_active: boolean;
}

export interface ClientPortalAuthContext {
  token: string | null; // Deprecated - kept for backward compatibility
  projectId: string;
  clientId: string | null;
  isValid: boolean;
  expiresAt: string | null;
  role?: string; // User's role in the project team
  userName?: string; // User's name from team members
  userEmail?: string; // User's email from team members
  avatarUrl?: string; // User's avatar URL from profile
  canViewDocuments?: boolean;
  canViewFinancials?: boolean;
  canDownloadReports?: boolean;
}

// =====================================================
// SCHEDULE & EVENTS
// =====================================================

export type EventType = 'milestone' | 'meeting' | 'inspection' | 'deadline';

export interface ScheduleEvent {
  id: string;
  project_id: string;
  title: string;
  type: EventType;
  event_date: string; // ISO date string
  event_time: string | null; // Time string (HH:MM:SS)
  all_day: boolean;
  description: string | null;
  location: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEventWithDetails extends ScheduleEvent {
  attendees?: string[];
  relatedMeeting?: ClientMeeting;
}

// =====================================================
// MEETINGS
// =====================================================

export type MeetingStatus = 'upcoming' | 'completed' | 'cancelled';

export interface ClientMeeting {
  id: string;
  project_id: string;
  title: string;
  meeting_date: string; // ISO datetime string
  duration: number | null; // minutes
  location: string | null;
  meeting_link: string | null;
  status: MeetingStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingAttendee {
  id: string;
  meeting_id: string;
  name: string;
  role: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface ClientMeetingWithAttendees extends ClientMeeting {
  attendees: MeetingAttendee[];
}

// =====================================================
// TEAM
// =====================================================

export interface ProjectTeamMember {
  id: string;
  project_id: string;
  user_id: string | null;
  name: string;
  role: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  sort_order: number;
  is_visible_to_client: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// TASKS
// =====================================================

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface ClientTask {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  status: string; // Keep as string for now, but it's deprecated
  status_id?: string; // New reference to project_task_statuses
  priority: TaskPriority;
  due_date: string | null; // ISO date string
  assigned_to: string | null; // team member id
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  task_status?: {
    id: string;
    name: string;
    color: string;
    is_completed: boolean;
  };
}

export interface ClientTaskWithAssignee extends ClientTask {
  assignee: {
    name: string;
    avatar_url: string | null;
  } | null;
}

// =====================================================
// COMMUNICATION
// =====================================================

export type CommunicationType = 'meeting' | 'email' | 'phone-call' | 'message';

export interface CommunicationLog {
  id: string;
  project_id: string;
  type: CommunicationType;
  date_time: string; // ISO datetime string
  subject: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationParticipant {
  id: string;
  communication_id: string;
  user_id: string | null;
  name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface CommunicationAttachment {
  id: string;
  communication_id: string;
  name: string;
  url: string;
  size: number | null;
  type: string | null;
  created_at: string;
}

export interface CommunicationLogWithDetails extends CommunicationLog {
  participants: CommunicationParticipant[];
  attachments: CommunicationAttachment[];
}

// =====================================================
// CHAT
// =====================================================

export interface ChatConversation {
  id: string;
  project_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string | null;
  is_client: boolean;
  joined_at: string;
  last_read_at: string | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  text: string;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  name: string;
  url: string;
  type: string | null;
  size: number | null;
  created_at: string;
}

export interface ChatMessageWithAttachments extends ChatMessage {
  attachments: MessageAttachment[];
  sender?: {
    name: string;
    avatar_url: string | null;
  };
}

export interface ChatConversationWithDetails extends ChatConversation {
  participants: ConversationParticipant[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

// =====================================================
// PAYMENTS & FINANCIAL (using existing types)
// =====================================================

// These types should already exist in the codebase
// Import them from their respective files when implementing

export interface Invoice {
  id: string;
  invoice_number: string;
  project_id: string;
  project_name: string;
  issue_date: string;
  due_date: string;
  amount: number;
  status: 'due' | 'paid' | 'overdue' | 'cancelled';
  pdf_url: string | null;
}

export interface ProjectBudget {
  id: string;
  project_id: string;
  total_budget: number;
  spent_to_date: number;
  categories: BudgetCategory[];
  last_updated: string;
}

export interface BudgetCategory {
  name: string;
  budgeted: number;
  spent: number;
  variance: number;
}

// =====================================================
// PHOTOS (using existing types)
// =====================================================

export type PhotoPhase = 'site-preparation' | 'foundation' | 'framing' | 'finishing';

export interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  thumbnail_url: string | null;
  title: string;
  description: string | null;
  upload_date: string;
  phase: PhotoPhase | null;
  tags: string[] | null;
  uploaded_by: string | null;
}

// =====================================================
// DASHBOARD
// =====================================================

export interface DashboardMetrics {
  upcomingEventsCount: number;
  nextEvent: string | null;
  pendingTasksCount: number;
  completedTasksCount: number;
  outstandingAmount: number;
  invoiceCount: number;
  newPhotosCount: number;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FilterParams {
  search?: string;
  type?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

// =====================================================
// API RESPONSE TYPES
// =====================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}
