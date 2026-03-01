import type { Database } from "@/integrations/supabase/types";

export type ProjectWithSchedule = Database["public"]["Tables"]["projects"]["Row"] & {
  estimated_duration?: number | null;
  expected_end_date?: string | null;
  days_remaining?: number | null;
  completion_percentage?: number | null;
};
