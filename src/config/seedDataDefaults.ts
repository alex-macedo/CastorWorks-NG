/**
 * Default Values and Constants for Demo Data Configuration
 *
 * This file contains default values, enums, and constants used throughout
 * the seeding process. It provides a single source of truth for default
 * configuration values.
 */

// ============================================================================
// Date & Time Defaults
// ============================================================================

/**
 * Get a demo date offset from today
 * @param offsetDays - Number of days to offset from current date (negative = past)
 * @returns Date object
 */
export function getDemoDate(offsetDays = 0): Date {
  const demoDate = new Date();
  demoDate.setMonth(demoDate.getMonth() - 1); // Start from last month
  demoDate.setDate(demoDate.getDate() + offsetDays);
  return demoDate;
}

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export function formatDateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format time to ISO string (HH:MM:SS)
 */
export function formatTimeOnly(date: Date): string {
  return date.toISOString().split('T')[1].split('.')[0];
}

// ============================================================================
// Default Values by Domain
// ============================================================================

/**
 * Default client status values
 */
export enum ClientStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

/**
 * Default supplier rating range
 */
export const DEFAULT_SUPPLIER_RATING_MIN = 4.0;
export const DEFAULT_SUPPLIER_RATING_MAX = 4.9;

/**
 * Default project budget values (in local currency)
 */
export const DEFAULT_PROJECT_BUDGET_MIN = 500000;
export const DEFAULT_PROJECT_BUDGET_MAX = 10000000;

/**
 * Default project duration values (in weeks)
 */
export const DEFAULT_PROJECT_DURATION_MIN = 12;
export const DEFAULT_PROJECT_DURATION_MAX = 52;

/**
 * Default phase duration (in weeks)
 */
export const DEFAULT_PHASE_DURATION_WEEKS = 4;

/**
 * Default meeting duration (in minutes)
 */
export const DEFAULT_MEETING_DURATION_MINUTES = 60;

/**
 * Default number of phases per project
 */
export const DEFAULT_PHASES_PER_PROJECT = 7;

/**
 * Default number of activities per phase
 */
export const DEFAULT_ACTIVITIES_PER_PHASE = 3;

/**
 * Default number of resources per project
 */
export const DEFAULT_RESOURCES_PER_PROJECT = 15;

/**
 * Default number of milestones per project
 */
export const DEFAULT_MILESTONES_PER_PROJECT = 9;

/**
 * Default number of meetings per project
 */
export const DEFAULT_MEETINGS_PER_PROJECT = 5;

/**
 * Default team size per project (client portal)
 */
export const DEFAULT_TEAM_SIZE_MIN = 2;
export const DEFAULT_TEAM_SIZE_MAX = 3;

// ============================================================================
// Enum Definitions
// ============================================================================

/**
 * Resource types
 */
export enum ResourceType {
  Labor = 'labor',
  Equipment = 'equipment',
  Material = 'material',
  Subcontractor = 'subcontractor',
}

/**
 * Project status
 */
export enum ProjectStatus {
  Planning = 'planning',
  InProgress = 'in_progress',
  OnHold = 'on_hold',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

/**
 * Phase status
 */
export enum PhaseStatus {
  NotStarted = 'not_started',
  InProgress = 'in_progress',
  Completed = 'completed',
  OnHold = 'on_hold',
}

/**
 * Activity status
 */
export enum ActivityStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
}

/**
 * Quote status
 */
export enum QuoteStatus {
  Draft = 'draft',
  Sent = 'sent',
  Approved = 'approved',
  Rejected = 'rejected',
  Expired = 'expired',
}

/**
 * Purchase order status
 */
export enum POStatus {
  Draft = 'draft',
  Sent = 'sent',
  Confirmed = 'confirmed',
  PartiallyReceived = 'partially_received',
  Received = 'received',
  Closed = 'closed',
}

/**
 * Payment status
 */
export enum PaymentStatus {
  Pending = 'pending',
  Processed = 'processed',
  Failed = 'failed',
  Refunded = 'refunded',
}

/**
 * Task priority
 */
export enum TaskPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent',
}

/**
 * Task status
 */
export enum TaskStatus {
  Todo = 'todo',
  InProgress = 'in_progress',
  Done = 'done',
  Blocked = 'blocked',
}

/**
 * Meeting status
 */
export enum MeetingStatus {
  Scheduled = 'scheduled',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

/**
 * Opportunity status
 */
export enum OpportunityStatus {
  Lead = 'lead',
  Prospect = 'prospect',
  Proposal = 'proposal',
  Negotiation = 'negotiation',
  ClosedWon = 'closed_won',
  ClosedLost = 'closed_lost',
}

/**
 * Communication type
 */
export enum CommunicationType {
  Email = 'email',
  Phone = 'phone',
  Meeting = 'meeting',
  Chat = 'chat',
  Document = 'document',
}

// ============================================================================
// Default Seed Configuration
// ============================================================================

/**
 * Seed configuration options
 */
export interface SeedConfiguration {
  includeExpenses: boolean;
  includeMaterials: boolean;
  includeDocuments: boolean;
  includePhotos: boolean;
  includeOpportunities: boolean;
  includeArchitectTasks: boolean;
  includePortalTasks: boolean;
}

/**
 * Default seed configuration
 */
export const DEFAULT_SEED_CONFIG: SeedConfiguration = {
  includeExpenses: true,
  includeMaterials: true,
  includeDocuments: true,
  includePhotos: true,
  includeOpportunities: true,
  includeArchitectTasks: true,
  includePortalTasks: true,
};

// ============================================================================
// Seed Statistics Configuration
// ============================================================================

/**
 * Expected counts for each table when fully seeded
 */
export const EXPECTED_SEED_COUNTS = {
  clients: 6,
  suppliers: 6,
  contractors: 4,
  projects: 4,
  project_phases: 28, // 4 projects * 7 phases
  project_activities: 84, // 28 phases * 3 activities
  project_resources: 60, // 4 projects * 15 resources
  project_milestones: 36, // 4 projects * 9 milestones
  project_budget_items: 28, // 4 projects * 7 budget categories
  quote_requests: 12, // 3 per project
  quotes: 24, // 2 quotes per request
  quote_approvals: 12, // 50% of quotes approved
  purchase_orders: 12, // 2-3 per project
  payments: 20, // Multiple payments per project
  opportunities: 8, // 2 per business manager
  opportunity_briefings: 8,
  opportunity_meetings: 12, // 1-2 per opportunity
  meeting_agendas: 20, // Multiple agendas across meetings
  meeting_decisions: 16, // Multiple decisions per meeting
  meeting_action_items: 40, // Multiple actions per meeting
  architect_opportunities: 6,
  architect_briefings: 6,
  architect_meetings: 12,
  architect_tasks: 40, // Multiple tasks per briefing
  architect_task_comments: 60, // Multiple comments per task
  architect_site_diary: 10,
  project_documents: 30, // Multiple per project
  project_photos: 40, // Multiple per project
  photo_comments: 20,
  schedule_events: 20,
  client_tasks: 20,
  client_meetings: 12,
  communication_logs: 15,
  chat_conversations: 8,
  chat_messages: 100, // Multiple per conversation
};

// ============================================================================
// Table Tracking Configuration
// ============================================================================

/**
 * Tables to track in seed statistics
 */
export const TRACKED_TABLES = [
  { name: 'clients', label: 'Clients' },
  { name: 'projects', label: 'Projects' },
  { name: 'project_phases', label: 'Project Phases' },
  { name: 'project_team_members', label: 'Project Team Members' },
  { name: 'project_activities', label: 'Project Activities' },
  { name: 'project_resources', label: 'Project Resources' },
  { name: 'project_assignments', label: 'Project Assignments' },
  { name: 'project_materials', label: 'Project Materials' },
  { name: 'project_milestones', label: 'Project Milestones' },
  { name: 'project_income', label: 'Project Income' },
  { name: 'project_expenses', label: 'Project Expenses' },
  { name: 'project_budget_items', label: 'Budget Items' },
  { name: 'suppliers', label: 'Suppliers' },
  { name: 'quote_requests', label: 'Quote Requests' },
  { name: 'quotes', label: 'Quotes' },
  { name: 'quote_approvals', label: 'Quote Approvals' },
  { name: 'purchase_orders', label: 'Purchase Orders' },
  { name: 'deliveries', label: 'Deliveries' },
  { name: 'payments', label: 'Payments' },
  { name: 'opportunities', label: 'Opportunities' },
  { name: 'opportunity_briefings', label: 'Opportunity Briefings' },
  { name: 'opportunity_meetings', label: 'Opportunity Meetings' },
  { name: 'meeting_agendas', label: 'Meeting Agendas' },
  { name: 'meeting_decisions', label: 'Meeting Decisions' },
  { name: 'meeting_action_items', label: 'Meeting Action Items' },
  { name: 'architect_opportunities', label: 'Architect Opportunities (Sales Pipeline)' },
  { name: 'architect_briefings', label: 'Architect Briefings' },
  { name: 'architect_meetings', label: 'Architect Meetings' },
  { name: 'architect_tasks', label: 'Architect Tasks' },
  { name: 'architect_task_comments', label: 'Architect Task Comments' },
  { name: 'architect_site_diary', label: 'Architect Site Diary' },
  { name: 'project_documents', label: 'Project Documents' },
  { name: 'project_photos', label: 'Project Photos' },
  { name: 'photo_comments', label: 'Photo Comments' },
  { name: 'project_time_logs', label: 'Project Time Logs' },
  { name: 'project_daily_logs', label: 'Project Daily Logs' },
  { name: 'roadmap_items', label: 'Roadmap Items' },
  { name: 'sprints', label: 'Sprints' },
  { name: 'project_estimates', label: 'Project Estimates' },
  { name: 'project_calendar_events', label: 'Calendar Events' },
  { name: 'quality_inspections', label: 'Quality Inspections' },
  { name: 'site_issues', label: 'Site Issues' },
  { name: 'cost_predictions', label: 'Cost Predictions' },
  { name: 'exchange_rates', label: 'Exchange Rates' },
  { name: 'client_tasks', label: 'Client Tasks' },
  { name: 'schedule_events', label: 'Client Schedule Events' },
  { name: 'client_meetings', label: 'Client Meetings' },
  { name: 'meeting_attendees', label: 'Meeting Attendees' },
  { name: 'communication_logs', label: 'Communication Logs' },
  { name: 'communication_participants', label: 'Communication Participants' },
  { name: 'communication_attachments', label: 'Communication Attachments' },
  { name: 'chat_conversations', label: 'Chat Conversations' },
  { name: 'conversation_participants', label: 'Conversation Participants' },
  { name: 'chat_messages', label: 'Chat Messages' },
  { name: 'message_attachments', label: 'Message Attachments' },
  { name: 'project_folders', label: 'Project Folders' },
  { name: 'notifications', label: 'Notifications' },
  { name: 'invoices', label: 'Invoices' },
  { name: 'contacts', label: 'Contacts' },
  { name: 'project_wbs_nodes', label: 'Project WBS Nodes' },
  { name: 'project_budgets', label: 'Project Budgets' },
  { name: 'recurring_expense_patterns', label: 'Recurring Expense Patterns' },
  { name: 'proposals', label: 'Proposals' },
  { name: 'schedule_scenarios', label: 'Schedule Scenarios' },
  { name: 'estimate_files', label: 'Estimate Files' },
];

// ============================================================================
// Seeded Names for Data Cleanup
// ============================================================================

/**
 * Seeded client names used to identify demo data
 */
export const SEEDED_CLIENT_NAMES = [
  'Construtora Acme Ltda',
  'Construtora Metro S.A.',
  'Greenfield Empreendimentos',
  'Espaços Urbanos Construções',
  'Grupo Construções Costeiras',
  'Construtora Patrimônio',
  'Alex Macedo (CLI)',
];

/**
 * Seeded supplier names used to identify demo data
 */
export const SEEDED_SUPPLIER_NAMES = [
  'Aço e Concreto Materiais',
  'Soluções Premium em Ferragens',
  'Componentes Elétricos Ltda',
  'Especialistas em Hidráulica',
  'Tintas e Acabamentos Pro',
  'Materiais para Telhados Plus',
];

/**
 * Seeded project names used to identify demo data
 */
export const SEEDED_PROJECT_NAMES = [
  'Corporate Office Building',
  'Residential Complex',
  'Shopping Center Renovation',
  'Hotel Development',
  'Complexo Residencial - Fase 1',
  'Edifício Comercial Centro',
  'Expansão Shopping Center',
  'Hotel e Resort',
  'Reforma Hospitalar',
  'Torre de Condomínio de Luxo',
  'Galpão Industrial',
  'Complexo Escolar',
  'Residencial Familia Macedo',
];
