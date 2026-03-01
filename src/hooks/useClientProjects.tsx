import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface ClientProjectSummary {
  id: string;
  project_name: string;
  /** Normalized from project_name for UI (Select, etc.) */
  name?: string;
  status: string;
  start_date: string;
  end_date: string;
  client_name: string;
  user_id: string;
  can_view_documents: boolean;
  can_view_financials: boolean;
  can_download_reports: boolean;
  document_count: number;
  phase_count: number;
  completed_phases: number;
}

export const useClientProjects = () => {
  return useQuery({
    queryKey: ["client-projects"],
    queryFn: async () => {
      const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      logger.info("[useClientProjects] Fetching client project summary");
      const timeoutId = setTimeout(() => {
        logger.warn("[useClientProjects] Client project summary still loading after 10s");
      }, 10000);
      // Call the new SECURITY INVOKER function instead of querying the view
      const { data, error } = await supabase
        .rpc("get_client_project_summary");

      clearTimeout(timeoutId);
      if (error) throw error;
      const elapsedMs = (typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt;
      logger.info("[useClientProjects] Client project summary fetched", {
        count: data?.length ?? 0,
        elapsedMs: Math.round(elapsedMs),
      });
      // Normalize: RPC returns project_name; UI expects name
      return (data || []).map((row: ClientProjectSummary) => ({
        ...row,
        name: row.project_name ?? row.name,
      })) as ClientProjectSummary[];
    },
    onError: (queryError) => {
      logger.error("[useClientProjects] Failed to fetch client project summary", {
        error: queryError,
      });
    },
  });
};

export const useClientProjectDocuments = (projectId: string) => {
  return useQuery({
    queryKey: ["client-project-documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });
};
