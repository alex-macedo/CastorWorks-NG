import type { Database } from '@/integrations/supabase/types';

export type ContentHubRow = Database['public']['Tables']['content_hub']['Row'];
export type ContentHubInsert = Database['public']['Tables']['content_hub']['Insert'];
export type ContentHubUpdate = Database['public']['Tables']['content_hub']['Update'];

export type ContentType = Database['public']['Enums']['content_type'];
export type ContentStatus = Database['public']['Enums']['content_status'];

export type ContentHubFilters = {
  type?: ContentType;
  status?: ContentStatus;
  search?: string;
  visibility?: string[];
  includeArchived?: boolean;
};

export type ContentWorkflowAction = 'submit' | 'approve' | 'archive' | 'restore';
