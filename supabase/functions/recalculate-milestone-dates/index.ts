import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { authenticateRequest, createServiceRoleClient, verifyProjectAdminAccess } from "../_shared/authorization.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Milestone {
  id: string;
  project_id: string;
  milestone_name: string;
  target_date: string;
  adjusted_target_date: string | null;
}

interface Dependency {
  id: string;
  predecessor_id: string;
  successor_id: string;
  dependency_type: 'FS' | 'SS' | 'FF' | 'SF';
  lag_days: number;
}

interface Delay {
  milestone_id: string;
  delay_days: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, force } = await req.json();

    if (!projectId) {
      throw new Error('Project ID is required');
    }

    const { user } = await authenticateRequest(req);
    const supabaseClient = createServiceRoleClient();

    // Verify access
    await verifyProjectAdminAccess(user.id, projectId, supabaseClient);

    // 1. Check if auto-cascade is enabled (unless forced manually)
    const { data: project, error: pError } = await supabaseClient
      .from('projects')
      .select('auto_cascade')
      .eq('id', projectId)
      .single();

    if (pError) throw pError;

    if (!project?.auto_cascade && !force) {
      console.log(`[Cascade] Automatic recalculation skipped: auto_cascade is disabled for project ${projectId}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Automatic recalculation skipped (disabled for this project)',
          skipped: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Cascade] Recalculating milestone dates for project: ${projectId}${force ? ' (FORCED)' : ''}`);

    // 2. Fetch Milestones
    const { data: milestones, error: mError } = await supabaseClient
      .from('project_milestone_definitions')
      .select('id, project_id, milestone_name, target_date, adjusted_target_date')
      .eq('project_id', projectId);

    if (mError) throw mError;
    if (!milestones) throw new Error('No milestones found');

    // 2. Fetch Dependencies
    const { data: dependencies, error: dError } = await supabaseClient
      .from('milestone_dependencies')
      .select('*')
      .eq('project_id', projectId);

    if (dError) throw dError;

    // 3. Fetch Delays (summed per milestone)
    const { data: delays, error: delError } = await supabaseClient
      .from('milestone_delays')
      .select('milestone_id, delay_days')
      .eq('project_id', projectId);

    if (delError) throw delError;

    const delayMap = new Map<string, number>();
    delays?.forEach(d => {
      const current = delayMap.get(d.milestone_id) || 0;
      delayMap.set(d.milestone_id, current + d.delay_days);
    });

    // 4. Build Graph and calculate in-degrees for topological sort
    const adj = new Map<string, Dependency[]>();
    const inDegree = new Map<string, number>();
    
    milestones.forEach(m => {
      adj.set(m.id, []);
      inDegree.set(m.id, 0);
    });

    dependencies?.forEach(dep => {
      const neighbors = adj.get(dep.predecessor_id) || [];
      neighbors.push(dep);
      adj.set(dep.predecessor_id, neighbors);
      
      const count = inDegree.get(dep.successor_id) || 0;
      inDegree.set(dep.successor_id, count + 1);
    });

    // 5. Topological Sort (Kahn's algorithm)
    const queue: string[] = [];
    inDegree.forEach((degree, id) => {
      if (degree === 0) queue.push(id);
    });

    const sortedIds: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      sortedIds.push(u);

      adj.get(u)?.forEach(dep => {
        const v = dep.successor_id;
        const newDegree = inDegree.get(v)! - 1;
        inDegree.set(v, newDegree);
        if (newDegree === 0) queue.push(v);
      });
    }

    if (sortedIds.length < milestones.length) {
      console.warn('[Cascade] Circular dependency detected or disconnected graph issues. Proceeding with partial sort.');
    }

    // 6. Forward Pass calculation
    const calculatedDates = new Map<string, Date>();
    const milestoneMap = new Map(milestones.map(m => [m.id, m]));

    for (const mId of sortedIds) {
      const milestone = milestoneMap.get(mId);
      if (!milestone) continue;

      const baseDate = new Date(milestone.target_date);
      const delayDays = delayMap.get(mId) || 0;
      
      // Minimum starting date = Target + Delay
      let earliestDate = new Date(baseDate);
      earliestDate.setDate(earliestDate.getDate() + delayDays);

      // Check predecessors
      const predecessors = dependencies?.filter(d => d.successor_id === mId);
      predecessors?.forEach(dep => {
        const predDate = calculatedDates.get(dep.predecessor_id);
        if (predDate) {
          const constraintDate = new Date(predDate);
          constraintDate.setDate(constraintDate.getDate() + dep.lag_days);
          
          if (constraintDate > earliestDate) {
            earliestDate = constraintDate;
          }
        }
      });

      calculatedDates.set(mId, earliestDate);
    }

    // 7. Update Database
    const updates = Array.from(calculatedDates.entries()).map(([id, date]) => ({
      id,
      adjusted_target_date: date.toISOString().split('T')[0]
    }));

    // Perform updates in batches or sequentially
    // Supabase JS doesn't support bulk update with different values per row easily via .update()
    // but we can use an RPC or a loop for now (since milestones are usually < 50)
    for (const update of updates) {
      const { error: uError } = await supabaseClient
        .from('project_milestone_definitions')
        .update({ adjusted_target_date: update.adjusted_target_date })
        .eq('id', update.id);
      
      if (uError) {
        console.error(`[Cascade] Failed to update milestone ${update.id}:`, uError);
      }
    }

    console.log(`[Cascade] Success: Recalculated ${updates.length} milestones for project ${projectId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updatedCount: updates.length,
        milestones: updates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Recalculate Cascade Error]:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
