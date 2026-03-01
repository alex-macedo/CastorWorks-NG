import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useRoadmapTasks(phaseId?: string) {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ["office-tasks", phaseId],
    queryFn: async () => {
      let query = supabase
        .from("office_tasks" as any)
        .select(`
          *,
          phase:office_phases(phase_name, phase_number),
          assigned_user:user_profiles(display_name)
        `)
        .order("created_at");

      if (phaseId) {
        query = query.eq("phase_id", phaseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase
        .from("office_tasks" as any)
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office-tasks"] });
      toast.success("Task updated successfully");
    },
    onError: () => {
      toast.error("Failed to update task");
    },
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("office_tasks" as any)
        .update({ 
          status: 'completed', 
          completion_percentage: 100,
          completed_at: new Date().toISOString()
        })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office-tasks"] });
      toast.success("Task marked as completed");
    },
    onError: () => {
      toast.error("Failed to complete task");
    },
  });

  return {
    tasks: tasksQuery.data,
    isLoading: tasksQuery.isLoading,
    updateTask,
    completeTask,
  };
}
