import { z } from 'zod';

// ============================================================================
// PLATFORM TASK TYPES
// ============================================================================

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface PlatformTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const PlatformTaskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled'] as const).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const).default('medium'),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
});

export type PlatformTaskFormData = z.infer<typeof PlatformTaskFormSchema>;

// ============================================================================
// COMMUNICATION LOG TYPES
// ============================================================================

export type CommChannel = 'email' | 'whatsapp' | 'phone' | 'meeting';
export type CommDirection = 'inbound' | 'outbound';
export type CommStatus = 'logged' | 'follow_up' | 'resolved';

export interface CommunicationLogEntry {
  id: string;
  tenant_id: string | null;
  contact_name: string;
  channel: CommChannel;
  direction: CommDirection;
  subject: string | null;
  body: string | null;
  status: CommStatus;
  created_by: string | null;
  created_at: string;
}

export const CommLogFormSchema = z.object({
  contact_name: z.string().min(1, 'Contact name is required').max(200),
  channel: z.enum(['email', 'whatsapp', 'phone', 'meeting'] as const),
  direction: z.enum(['inbound', 'outbound'] as const),
  subject: z.string().max(300).optional().nullable(),
  body: z.string().max(5000).optional().nullable(),
  status: z.enum(['logged', 'follow_up', 'resolved'] as const).default('logged'),
  tenant_id: z.string().uuid().optional().nullable(),
});

export type CommLogFormData = z.infer<typeof CommLogFormSchema>;

// ============================================================================
// SUPPORT TICKET TYPES
// ============================================================================

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportTicket {
  id: string;
  tenant_id: string | null;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export interface SupportTicketWithMessages extends SupportTicket {
  platform_support_messages: SupportMessage[];
}

export const SupportTicketFormSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(300),
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const).default('medium'),
  tenant_id: z.string().uuid().optional().nullable(),
  initialMessage: z.string().min(1, 'Initial message is required').max(5000),
});

export type SupportTicketFormData = z.infer<typeof SupportTicketFormSchema>;

// ============================================================================
// GLOBAL TEMPLATE TYPES
// ============================================================================

export type TemplateFamily = 'phase' | 'wbs' | 'activity' | 'budget' | 'whatsapp';
export type TemplateStatus = 'draft' | 'published' | 'archived';

export interface GlobalTemplate {
  id: string;
  family: TemplateFamily;
  name: string;
  description: string | null;
  content: Record<string, unknown>;
  status: TemplateStatus;
  version: number;
  created_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export const GlobalTemplateFormSchema = z.object({
  family: z.enum(['phase', 'wbs', 'activity', 'budget', 'whatsapp'] as const),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  content: z.string().refine(
    (val) => { try { JSON.parse(val); return true; } catch { return false; } },
    { message: 'Content must be valid JSON' }
  ).default('{}'),
  status: z.enum(['draft', 'published', 'archived'] as const).default('draft'),
});

export type GlobalTemplateFormData = z.infer<typeof GlobalTemplateFormSchema>;

// ============================================================================
// TENANT (CUSTOMER) TYPES
// ============================================================================

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  max_projects: number | null;
  max_users: number | null;
  trial_ends_at: string | null;
  created_at: string;
}

export const TenantFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens'),
  status: z.enum(['active', 'inactive', 'trial', 'suspended'] as const).default('trial'),
  max_projects: z.number().int().positive().optional().nullable(),
  max_users: z.number().int().positive().optional().nullable(),
  trial_ends_at: z.string().optional().nullable(),
});

export type TenantFormData = z.infer<typeof TenantFormSchema>;
