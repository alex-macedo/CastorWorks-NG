import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRoadmapTaskUpdates(taskId: string) {
  return useQuery({
    queryKey: ["office-task-updates", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("office_task_updates" as any)
        .select(`
          *,
          user:user_profiles(display_name)
        `)
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!taskId,
  });
}
