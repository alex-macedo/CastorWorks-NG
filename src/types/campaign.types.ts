/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { z } from 'zod';

// ============================================================================
// CAMPAIGN TYPES
// ============================================================================

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled' | 'failed';
export type AudienceType = 'all' | 'filtered' | 'manual';
export type ContactType = 'client' | 'supplier' | 'contractor';
export type RecipientStatus = 'pending' | 'personalizing' | 'sending' | 'sent' | 'delivered' | 'failed';
export type LogLevel = 'info' | 'warning' | 'error' | 'success';

// Audience filter configuration
export interface AudienceFilter {
  contactTypes?: ContactType[];
  tags?: string[];
  vipOnly?: boolean;
  excludeIds?: string[];
}

// Personalization context (data used to personalize messages)
export interface PersonalizationContext {
  contactName: string;
  contactType: ContactType;
  isVip: boolean;
  pastProjects?: Array<{
    id: string;
    name: string;
    completedAt?: string;
    value?: number;
    location?: string;
  }>;
  lastInteraction?: string;
  totalProjectsCount?: number;
  companyName: string;
}

// Campaign database types
export interface OutboundCampaign {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  status: CampaignStatus;
  audience_type: AudienceType;
  audience_filter: AudienceFilter;
  message_template?: string | null;
  include_voice_for_vip: boolean;
  company_name?: string | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_failed: number;
  voice_messages_sent: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  contact_type: ContactType;
  contact_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email?: string | null;
  is_vip: boolean;
  status: RecipientStatus;
  personalized_message?: string | null;
  personalization_context: PersonalizationContext;
  voice_message_url?: string | null;
  voice_message_duration?: number | null;
  twilio_message_sid?: string | null;
  error_message?: string | null;
  error_code?: string | null;
  personalized_at?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  failed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignLog {
  id: string;
  campaign_id: string;
  recipient_id?: string | null;
  log_level: LogLevel;
  event_type: string;
  message: string;
  metadata: Record<string, any>;
  created_at: string;
}

// Extended types with joined data
export interface CampaignWithRecipients extends OutboundCampaign {
  recipients?: CampaignRecipient[];
}

export interface CampaignWithStats extends OutboundCampaign {
  success_rate?: number;
  delivery_rate?: number;
  completion_percentage?: number;
}

// ============================================================================
// FORM TYPES AND SCHEMAS
// ============================================================================

// Contact selection type
export interface ContactSelection {
  id: string;
  type: ContactType;
  name: string;
  phone: string;
  email?: string;
  isVip: boolean;
  tags?: string[];
}

// Campaign creation form
export const CampaignCreateFormSchema = z.object({
  name: z.string().min(3, 'Campaign name must be at least 3 characters').max(100, 'Campaign name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  audience_type: z.enum(['all', 'filtered', 'manual'] as const, {
    required_error: 'Please select an audience type',
  }),
  audience_filter: z.object({
    contactTypes: z.array(z.enum(['client', 'supplier', 'contractor'])).optional(),
    tags: z.array(z.string()).optional(),
    vipOnly: z.boolean().optional(),
    excludeIds: z.array(z.string()).optional(),
  }).optional(),
  message_template: z.string()
    .min(10, 'Message template must be at least 10 characters')
    .max(1000, 'Message template is too long (max 1000 characters)'),
  include_voice_for_vip: z.boolean().default(false),
  company_name: z.string().min(2, 'Company name is required').max(100),
  scheduled_at: z.string().datetime().optional().nullable(),
  selected_contacts: z.array(z.string()).optional(), // Only used when audience_type = 'manual'
});

export type CampaignCreateFormData = z.infer<typeof CampaignCreateFormSchema>;

// Campaign update form (allows updating draft or scheduled campaigns)
export const CampaignUpdateFormSchema = CampaignCreateFormSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['draft', 'scheduled', 'cancelled'] as const).optional(),
});

export type CampaignUpdateFormData = z.infer<typeof CampaignUpdateFormSchema>;

// Test message form (send test message to a phone number)
export const TestMessageFormSchema = z.object({
  campaign_id: z.string().uuid(),
  test_phone: z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number is too long')
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (use E.164 format, e.g., +1234567890)'),
  include_voice: z.boolean().default(false),
});

export type TestMessageFormData = z.infer<typeof TestMessageFormSchema>;

// Recipient filter for viewing campaign recipients
export const RecipientFilterSchema = z.object({
  campaign_id: z.string().uuid(),
  status: z.enum(['pending', 'personalizing', 'sending', 'sent', 'delivered', 'failed']).optional(),
  contact_type: z.enum(['client', 'supplier', 'contractor']).optional(),
  is_vip: z.boolean().optional(),
  search: z.string().optional(),
});

export type RecipientFilterData = z.infer<typeof RecipientFilterSchema>;

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// Request to create a campaign
export interface CreateCampaignRequest {
  name: string;
  description?: string;
  audience_type: AudienceType;
  audience_filter?: AudienceFilter;
  message_template: string;
  include_voice_for_vip: boolean;
  company_name: string;
  scheduled_at?: string | null;
  selected_contact_ids?: string[];
}

// Request to execute/send a campaign
export interface ExecuteCampaignRequest {
  campaign_id: string;
  send_now?: boolean; // Override scheduled_at and send immediately
}

// Request to personalize messages for a campaign
export interface PersonalizeMessagesRequest {
  campaign_id: string;
  recipient_ids?: string[]; // If not provided, personalize all pending
}

// Response from personalization
export interface PersonalizeMessagesResponse {
  success: boolean;
  personalized_count: number;
  failed_count: number;
  errors?: Array<{
    recipient_id: string;
    error: string;
  }>;
}

// Request to generate voice message
export interface GenerateVoiceMessageRequest {
  recipient_id: string;
  message_text: string;
  voice_config?: {
    voice?: string;
    model?: string;
    speed?: number;
  };
}

// Response from voice generation
export interface GenerateVoiceMessageResponse {
  success: boolean;
  voice_message_url?: string;
  duration?: number;
  error?: string;
}

// Campaign statistics
export interface CampaignStatistics {
  campaign_id: string;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  messages_failed: number;
  voice_messages_sent: number;
  success_rate: number;
  delivery_rate: number;
  completion_percentage: number;
  average_delivery_time?: number; // in seconds
}

// Campaign execution status
export interface CampaignExecutionStatus {
  campaign_id: string;
  status: CampaignStatus;
  progress: {
    total: number;
    pending: number;
    personalizing: number;
    sending: number;
    sent: number;
    delivered: number;
    failed: number;
  };
  started_at?: string;
  estimated_completion?: string;
  current_phase: 'idle' | 'personalizing' | 'generating_voice' | 'sending' | 'completed';
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface CampaignSummary {
  id: string;
  name: string;
  status: CampaignStatus;
  total_recipients: number;
  messages_sent: number;
  success_rate: number;
  scheduled_at?: string | null;
  created_at: string;
}

export interface RecipientSummary {
  contact_name: string;
  contact_phone: string;
  contact_type: ContactType;
  is_vip: boolean;
  status: RecipientStatus;
  sent_at?: string | null;
}

// Error types
export class CampaignError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'CampaignError';
  }
}

export class PersonalizationError extends CampaignError {
  constructor(message: string, details?: any) {
    super(message, 'PERSONALIZATION_ERROR', details);
    this.name = 'PersonalizationError';
  }
}

export class DeliveryError extends CampaignError {
  constructor(message: string, details?: any) {
    super(message, 'DELIVERY_ERROR', details);
    this.name = 'DeliveryError';
  }
}

export class VoiceGenerationError extends CampaignError {
  constructor(message: string, details?: any) {
    super(message, 'VOICE_GENERATION_ERROR', details);
    this.name = 'VoiceGenerationError';
  }
}