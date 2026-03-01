/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type ProjectActivity = Database["public"]["Tables"]["project_activities"]["Row"];

interface ActivityCalendarData {
  activities: ProjectActivity[];
  projects: Array<{
    id: string;
    name: string;
  }>;
}

export function useActivityCalendar(
  selectedProjectId: string | null,
  modeType: "single" | "multi"
) {
  return useQuery<ActivityCalendarData>({
    queryKey: ["activityCalendar", selectedProjectId, modeType],
    queryFn: async () => {
      try {
        // Fetch projects
        let projectsQuery = supabase
          .from("projects")
          .select("id, name");

        if (modeType === "single" && selectedProjectId) {
          projectsQuery = projectsQuery.eq("id", selectedProjectId);
        }

        const { data: projectsData, error: projectsError } =
          await projectsQuery;

        if (projectsError) throw projectsError;

        const projectIds = (projectsData || []).map((p) => p.id);

        // Fetch activities from project_activities
        let activitiesQuery = supabase
          .from("project_activities")
          .select("*")
          .not("start_date", "is", null)
          .not("end_date", "is", null);

        if (projectIds.length > 0) {
          activitiesQuery = activitiesQuery.in("project_id", projectIds);
        }

        const { data: activitiesData, error: activitiesError } =
          await activitiesQuery;

        if (activitiesError) throw activitiesError;

        // Also fetch from project_wbs_items for projects using WBS, 
        // joining with project_activities to get dates
        const { data: wbsData, error: wbsError } = await (supabase
          .from("project_wbs_items")
          .select(`
            *,
            project_activities!project_activities_wbs_item_id_fkey (
              id,
              start_date,
              end_date,
              completion_percentage,
              status
            )
          `)
          .in("project_id", projectIds.length > 0 ? projectIds : [selectedProjectId].filter(Boolean) as string[]) as any);
        
        if (wbsError) throw wbsError;
        
        // Transform WBS items to match ProjectActivity shape
        const wbsActivities = (wbsData || []).map((item: any) => {
          const activity = Array.isArray(item.project_activities)
            ? item.project_activities[0]
            : item.project_activities;
            
          return {
            id: item.id,
            project_id: item.project_id,
            phase_id: item.parent_id,
            name: item.name,
            description: item.description,
            start_date: activity?.start_date,
            end_date: activity?.end_date,
            days_for_activity: item.duration || item.standard_duration_days || 0,
            completion_percentage: activity?.completion_percentage || item.progress_percentage || 0,
            created_at: item.created_at,
            updated_at: item.updated_at,
          };
        }).filter((a: any) => a.start_date && a.end_date) as any[];

        // Merge and sort
        const allActivities = [...(activitiesData || []), ...wbsActivities].sort((a, b) => 
          (a.start_date || '').localeCompare(b.start_date || '')
        );

        return {
          activities: allActivities,
          projects: projectsData || [],
        };
      } catch (error) {
        console.error("Error fetching activity calendar data:", error);
        throw error;
      }
    },
    enabled: modeType === "multi" || (modeType === "single" && !!selectedProjectId),
  });
}
