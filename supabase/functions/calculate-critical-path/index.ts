import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, createServiceRoleClient, verifyProjectAdminAccess } from "../_shared/authorization.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Activity {
  id: string;
  name: string;
  sequence: number;
  days_for_activity: number;
  start_date: string | null;
  dependencies: Array<{
    activityId: string;
    type: 'FS' | 'SS' | 'FF' | 'SF';
    lag?: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId } = await req.json();

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    const { user } = await authenticateRequest(req);

    const supabaseClient = createServiceRoleClient();

    await verifyProjectAdminAccess(user.id, projectId, supabaseClient);

    console.log(`Calculating critical path for project ${projectId}`);

    // Fetch all activities for the project
    const { data: activities, error: activitiesError } = await supabaseClient
      .from('project_activities')
      .select('*')
      .eq('project_id', projectId)
      .order('sequence');

    if (activitiesError) throw activitiesError;
    if (!activities || activities.length === 0) {
      throw new Error('No activities found for this project');
    }

    // Create activity map
    const activityMap = new Map<string, Activity>();
    activities.forEach((act) => {
      activityMap.set(act.id, {
        id: act.id,
        name: act.name,
        sequence: act.sequence,
        days_for_activity: act.days_for_activity || 1,
        start_date: act.start_date,
        dependencies: act.dependencies || [],
      });
    });

    // Calculate Early Start and Early Finish (Forward Pass)
    const earlyDates = new Map<string, { earlyStart: number; earlyFinish: number }>();
    
    // Sort activities by sequence to process in order
    const sortedActivities = Array.from(activityMap.values()).sort((a, b) => a.sequence - b.sequence);

    for (const activity of sortedActivities) {
      let maxEarlyFinish = 0;

      // Check all dependencies
      if (activity.dependencies && activity.dependencies.length > 0) {
        for (const dep of activity.dependencies) {
          const predDates = earlyDates.get(dep.activityId);
          if (predDates) {
            // For now, we only handle Finish-to-Start (FS) dependencies
            if (dep.type === 'FS' || !dep.type) {
              const predFinish = predDates.earlyFinish + (dep.lag || 0);
              maxEarlyFinish = Math.max(maxEarlyFinish, predFinish);
            }
          }
        }
      }

      const earlyStart = maxEarlyFinish;
      const earlyFinish = earlyStart + activity.days_for_activity;
      earlyDates.set(activity.id, { earlyStart, earlyFinish });
    }

    // Find project completion time (max early finish)
    const projectDuration = Math.max(...Array.from(earlyDates.values()).map(d => d.earlyFinish));

    // Calculate Late Start and Late Finish (Backward Pass)
    const lateDates = new Map<string, { lateStart: number; lateFinish: number }>();
    
    // Start from the end
    const reversedActivities = [...sortedActivities].reverse();

    for (const activity of reversedActivities) {
      let minLateStart = projectDuration;

      // Find successors (activities that depend on this one)
      const successors = sortedActivities.filter(a => 
        a.dependencies?.some(d => d.activityId === activity.id)
      );

      if (successors.length > 0) {
        for (const successor of successors) {
          const succDates = lateDates.get(successor.id);
          if (succDates) {
            const dep = successor.dependencies?.find(d => d.activityId === activity.id);
            const lag = dep?.lag || 0;
            minLateStart = Math.min(minLateStart, succDates.lateStart - activity.days_for_activity - lag);
          }
        }
      } else {
        // No successors, use project duration
        minLateStart = projectDuration - activity.days_for_activity;
      }

      const lateStart = minLateStart;
      const lateFinish = lateStart + activity.days_for_activity;
      lateDates.set(activity.id, { lateStart, lateFinish });
    }

    // Calculate Float and identify Critical Path
    const results = [];
    const criticalPath = [];

    for (const activity of sortedActivities) {
      const early = earlyDates.get(activity.id)!;
      const late = lateDates.get(activity.id)!;
      const floatDays = late.lateStart - early.earlyStart;
      const isCritical = floatDays === 0;

      if (isCritical) {
        criticalPath.push({
          id: activity.id,
          name: activity.name,
          sequence: activity.sequence,
        });
      }

      results.push({
        activityId: activity.id,
        activityName: activity.name,
        earlyStart: early.earlyStart,
        earlyFinish: early.earlyFinish,
        lateStart: late.lateStart,
        lateFinish: late.lateFinish,
        floatDays,
        isCritical,
      });

      // Update activity in database
      await supabaseClient
        .from('project_activities')
        .update({
          early_start: null, // We're using day numbers, convert to dates if needed
          early_finish: null,
          late_start: null,
          late_finish: null,
          float_days: floatDays,
          is_critical: isCritical,
        })
        .eq('id', activity.id);
    }

    console.log(`Critical path calculated: ${criticalPath.length} critical activities`);

    return new Response(
      JSON.stringify({
        projectDuration,
        criticalPath,
        activities: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in calculate-critical-path:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = errorMessage === 'Unauthorized' ? 401 : errorMessage.includes('Access denied') || errorMessage.includes('Administrative access') ? 403 : 500;
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
