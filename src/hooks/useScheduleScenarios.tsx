import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocalization } from "@/contexts/LocalizationContext";

export function useScheduleScenarios(projectId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ["schedule-scenarios", projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("schedule_scenarios")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  const activateScenario = useMutation({
    mutationFn: async (scenarioId: string) => {
      // Get scenario activities
      const { data: scenarioActivities, error: fetchError } = await supabase
        .from("scenario_activities")
        .select("activity_data")
        .eq("scenario_id", scenarioId);

      if (fetchError) throw fetchError;

      if (!scenarioActivities || scenarioActivities.length === 0) {
        throw new Error("No activities found in scenario");
      }

      // Update project activities with scenario data
      const updates = scenarioActivities.map(async (sa) => {
        const activityData = sa.activity_data as {
          id: string;
          start_date: string;
          end_date: string;
          days_for_activity: number;
        };

        return supabase
          .from("project_activities")
          .update({
            start_date: activityData.start_date,
            end_date: activityData.end_date,
            days_for_activity: activityData.days_for_activity,
          })
          .eq("id", activityData.id);
      });

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) throw errors[0].error;

      // Mark this scenario as active and others as inactive
      await supabase
        .from("schedule_scenarios")
        .update({ is_active: false })
        .eq("project_id", projectId);

      await supabase
        .from("schedule_scenarios")
        .update({ is_active: true })
        .eq("id", scenarioId);

      return scenarioId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
      queryClient.invalidateQueries({ queryKey: ["schedule-scenarios", projectId] });
      toast({ title: t('toast.scenarioActivatedSuccessfully') });
    },
    onError: (error) => {
      toast({
        title: "Error activating scenario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteScenario = useMutation({
    mutationFn: async (scenarioId: string) => {
      const { error } = await supabase
        .from("schedule_scenarios")
        .delete()
        .eq("id", scenarioId);

      if (error) throw error;
      return scenarioId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-scenarios", projectId] });
      toast({ title: t('toast.scenarioDeletedSuccessfully') });
    },
    onError: (error) => {
      toast({
        title: "Error deleting scenario",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsBaseline = useMutation({
    mutationFn: async (scenarioId: string) => {
      // Unmark all other scenarios as baseline
      await supabase
        .from("schedule_scenarios")
        .update({ is_baseline: false })
        .eq("project_id", projectId);

      // Mark this one as baseline
      const { error } = await supabase
        .from("schedule_scenarios")
        .update({ is_baseline: true })
        .eq("id", scenarioId);

      if (error) throw error;
      return scenarioId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule-scenarios", projectId] });
      toast({ title: t('toast.scenarioMarkedAsBaseline') });
    },
    onError: (error) => {
      toast({
        title: "Error marking scenario as baseline",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    scenarios,
    isLoading,
    activateScenario,
    deleteScenario,
    markAsBaseline,
  };
}
