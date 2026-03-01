import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useProjectFinancialsCheck = (projectId: string | undefined) => {
  const { data: hasFinancials, isLoading } = useQuery({
    queryKey: ["project_financials_check", projectId],
    queryFn: async () => {
      if (!projectId) return false;

      const { count, error } = await supabase
        .from("project_financial_entries")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);

      if (error) {
        console.error("Error checking financial entries:", error);
        return false;
      }

      return (count || 0) > 0;
    },
    enabled: !!projectId,
  });

  return { hasFinancials, isLoading };
};
