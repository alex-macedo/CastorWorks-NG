import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditLog {
  id: string;
  event_key: string;
  payload: any;
  user_id: string;
  created_at: string;
  user_profiles?: {
    display_name: string;
  };
}

export interface AuditLogFilters {
  eventType?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export function useAuditLogs(filters?: AuditLogFilters) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      let query = supabase
        .from("admin_events")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.eventType && filters.eventType !== "all") {
        query = query.eq("event_key", filters.eventType);
      }

      if (filters?.startDate) {
        query = query.gte("created_at", filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte("created_at", filters.endDate);
      }

      if (filters?.userId && filters.userId !== "all") {
        query = query.eq("user_id", filters.userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user profiles separately
      const enrichedData = await Promise.all(
        (data || []).map(async (log) => {
          if (log.user_id) {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("display_name")
              .eq("user_id", log.user_id)
              .single();

            return {
              ...log,
              user_profiles: profile || undefined,
            };
          }
          return log;
        })
      );

      return enrichedData as AuditLog[];
    },
  });
}

export function useAuditLogUsers() {
  return useQuery({
    queryKey: ["audit-log-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_events")
        .select("user_id")
        .not("user_id", "is", null);

      if (error) throw error;

      // Get unique user IDs
      const uniqueUserIds = Array.from(new Set(data.map((item) => item.user_id)));

      // Fetch profiles for these users
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, display_name")
        .in("user_id", uniqueUserIds);

      return profiles || [];
    },
  });
}
