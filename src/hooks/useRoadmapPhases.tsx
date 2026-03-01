import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRoadmapPhases() {
  return useQuery({
    queryKey: ["office-phases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("office_phases" as any)
        .select("*")
        .order("phase_number");

      if (error) throw error;
      return data as any[];
    },
  });
}
