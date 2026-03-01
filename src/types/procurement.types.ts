import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';

// Core database types
type QuoteRequestRow = Database['public']['Tables']['quote_requests']['Row'];
type QuoteRequestInsert = Database['public']['Tables']['quote_requests']['Insert'];
type QuoteRequestUpdate = Database['public']['Tables']['quote_requests']['Update'];
type SupplierRow = Database['public']['Tables']['suppliers']['Row'];

// Extended QuoteRequest type with joined supplier data for UI display
export interface QuoteRequest extends QuoteRequestRow {
  supplier?: SupplierRow | null;
}

// Export database types for use in hooks
export type { QuoteRequestInsert, QuoteRequestUpdate };

// Helper type for quote request with supplier join specifically for list displays
export interface QuoteRequestWithSupplier extends QuoteRequestRow {
  supplier: SupplierRow;
}

// Form input type for creating quote requests (bulk sending to multiple suppliers)
export interface QuoteRequestFormInput {
  purchase_request_id: string;
  supplier_ids: string[];
  response_deadline: string; // ISO date string
  tracking_code?: string;
}

// Zod validation schemas
export const QuoteRequestFormSchema = z.object({
  purchase_request_id: z.string().uuid('Purchase request ID must be a valid UUID'),
  supplier_ids: z.array(z.string().uuid('Supplier ID must be a valid UUID')).min(1, 'At least one supplier must be selected'),
  response_deadline: z.string().refine(
    (date) => {
      try {
        const deadline = new Date(date);
        const now = new Date();
        // Check if date is valid and in the future
        if (isNaN(deadline.getTime())) {
          return false;
        }
        // Add timezone-aware comparison with a small buffer for processing time
        const nowWithBuffer = new Date(now.getTime() + (5 * 60 * 1000)); // 5 minutes buffer
        return deadline > nowWithBuffer;
      } catch {
        return false;
      }
    },
    { message: 'Response deadline must be a valid future date' }
  ),
});

// Schema for individual quote request responses (if needed for response processing)
export const QuoteRequestResponseSchema = z.object({
  id: z.string(),
  purchase_request_id: z.string(),
  supplier_id: z.string(),
  response_deadline: z.string().optional(),
  status: z.string().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

// Export schema types for React Hook Form integration
export type QuoteRequestFormData = z.infer<typeof QuoteRequestFormSchema>;
export type QuoteRequestResponseData = z.infer<typeof QuoteRequestResponseSchema>;