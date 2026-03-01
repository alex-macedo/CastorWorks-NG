/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { DEFAULT_CONSTRUCTION_ACTIVITIES } from "@/constants/defaultActivities";
import { addDays, differenceInCalendarDays } from "date-fns";
import { calculateActivityDates, calculateOverallProgress } from "@/utils/timelineCalculators";
import { useLocalization } from "@/contexts/LocalizationContext";

type ProjectActivity = Database["public"]["Tables"]["project_activities"]["Row"];
type ProjectActivityInsert = Database["public"]["Tables"]["project_activities"]["Insert"];
type ProjectActivityUpdate = Database["public"]["Tables"]["project_activities"]["Update"];

let lastActivityNetworkErrorToastAt = 0;

function getReadableErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message?.trim()) return error.message;
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    const message = err.message ?? err.error ?? err.details ?? err.hint;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Unknown error";
}

function isNetworkFetchError(error: unknown): boolean {
  const message = getReadableErrorMessage(error).toLowerCase();
  return message.includes("failed to fetch") || message.includes("networkerror");
}

export const useProjectActivities = (projectId?: string) => {
  const { toast } = useToast();
  const { t } = useLocalization();
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["project-activities", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from("project_activities")
        .select("*")
        .eq("project_id", projectId)
        .order("phase_order", { ascending: true, nullsFirst: false })
        .order("sequence", { ascending: true });

      if (error) throw error;
      return data as ProjectActivity[];
    },
    enabled: !!projectId,
  });

  const createActivity = useMutation({
    mutationFn: async (newActivity: ProjectActivityInsert) => {
      // Database trigger will calculate end_date automatically
      const { data, error } = await supabase
        .from("project_activities")
        .insert(newActivity)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Trigger handles phase sync, just invalidate both queries
      queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project_phases", projectId] });
      toast({ title: t('toast.activityCreatedSuccessfully') });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating activity",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const updateActivity = useMutation({
    mutationFn: async (activityUpdate: ProjectActivityUpdate & { id: string; silent?: boolean }) => {
      const { id, silent, ...updates } = activityUpdate;
      
      // Try to update by ID first
      const { data, error } = await supabase
        .from("project_activities")
        .update(updates)
        .eq("id", id)
        .select();

      if (error) throw error;
      
      // If no rows were updated, try by wbs_item_id (for WBS projects)
      if (!data || data.length === 0) {
        const { data: wbsData, error: wbsError } = await supabase
          .from("project_activities")
          .update(updates)
          .eq("wbs_item_id", id)
          .select();
        
        if (wbsError) throw wbsError;
        return { data: wbsData?.[0], silent };
      }
      
      return { data: data[0], silent };
    },
    onSuccess: (result) => {
      // Trigger handles phase sync, just invalidate both queries
      queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project_phases", projectId] });
      
      if (!result.silent) {
        toast({ title: t('toast.activityUpdatedSuccessfully') });
      }
    },
    onError: (error, variables) => {
      if (variables?.silent) {
        return;
      }

      if (isNetworkFetchError(error)) {
        // Avoid spamming the same offline/network toast in rapid update loops.
        const now = Date.now();
        if (now - lastActivityNetworkErrorToastAt < 10000) {
          return;
        }
        lastActivityNetworkErrorToastAt = now;
      }

      toast({
        title: "Error updating activity",
        description: getReadableErrorMessage(error),
        variant: "destructive"
      });
    },
  });

  const deleteActivity = useMutation({
    mutationFn: async (id: string) => {
      // Database trigger will sync phase after deletion
      const { error } = await supabase
        .from("project_activities")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Trigger handles phase sync, just invalidate both queries
      queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project_phases", projectId] });
      toast({ title: t('toast.activityDeletedSuccessfully') });
    },
    onError: (error) => {
      toast({
        title: "Error deleting activity",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const initializeDefaultActivities = useMutation({
    mutationFn: async (startDate: Date) => {
      if (!projectId) throw new Error("Project ID is required");

      // Try to get a phase for this project - check both project_phases and project_wbs_items
      let phaseId: string | null = null;
      
      // First, try project_phases (schedule phases only)
      const { data: phases, error: phaseError } = await supabase
        .from("project_phases")
        .select("id")
        .eq("project_id", projectId)
        .eq("type", "schedule")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("start_date", { ascending: true })
        .limit(1);

      if (phaseError) throw phaseError;
      
      if (phases && phases.length > 0) {
        phaseId = phases[0].id;
      } else {
        // Try project_wbs_items (item_type = 'phase')
        const { data: wbsPhases, error: wbsError } = await supabase
          .from("project_wbs_items")
          .select("id")
          .eq("project_id", projectId)
          .eq("item_type", "phase")
          .order("sort_order", { ascending: true, nullsFirst: false })
          .limit(1);
          
        if (wbsError) throw wbsError;
        
        if (wbsPhases && wbsPhases.length > 0) {
          phaseId = wbsPhases[0].id;
        }
      }
      
      // If no phase exists, create a default one
      if (!phaseId) {
        const { data: newPhase, error: createPhaseError } = await supabase
          .from("project_phases")
          .insert({
            project_id: projectId,
            phase_name: "Default Phase",
            start_date: startDate.toISOString().split('T')[0],
            type: "schedule",
            sort_order: 1,
          })
          .select("id")
          .single();
          
        if (createPhaseError) throw createPhaseError;
        phaseId = newPhase.id;
      }

      const calculatedActivities = calculateActivityDates(
        DEFAULT_CONSTRUCTION_ACTIVITIES.map(act => ({
          sequence: act.sequence,
          name: act.name,
          days_for_activity: act.defaultDays,
          completion_percentage: 0,
        })),
        startDate,
        true
      );

      const activitiesToInsert = calculatedActivities.map(act => ({
        project_id: projectId,
        phase_id: phaseId,
        sequence: act.sequence,
        name: act.name,
        start_date: act.start_date,
        end_date: act.end_date,
        days_for_activity: act.days_for_activity,
        completion_percentage: 0,
      }));

      const { data, error } = await supabase
        .from("project_activities")
        .insert(activitiesToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
      toast({ title: t('toast.defaultActivitiesInitializedSuccessfully') });
    },
    onError: (error) => {
      toast({
        title: "Error initializing activities",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const initializeActivitiesForPhases = useMutation({
    mutationFn: async ({ startDate, phases }: { startDate: Date; phases: any[] }) => {
      if (!projectId) throw new Error("Project ID is required");
      if (!phases || phases.length === 0) throw new Error("Phases are required");

      // Calculate all activity dates first
      const calculatedActivities = calculateActivityDates(
        DEFAULT_CONSTRUCTION_ACTIVITIES.map(act => ({
          sequence: act.sequence,
          name: act.name,
          days_for_activity: act.defaultDays,
          completion_percentage: 0,
        })),
        startDate,
        true
      );

      // Sort phases by start date
      const sortedPhases = [...phases].sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );

      // Distribute activities across phases based on dates
      const activitiesWithPhases = calculatedActivities.map((act, index) => {
        const actStartDate = new Date(act.start_date);
        
        // Find the phase that contains this activity's start date
        let assignedPhase = sortedPhases.find(phase => {
          const phaseStart = new Date(phase.start_date);
          const phaseEnd = new Date(phase.end_date);
          return actStartDate >= phaseStart && actStartDate <= phaseEnd;
        });

        // Fallback: distribute evenly if no date match
        if (!assignedPhase) {
          const activitiesPerPhase = Math.ceil(calculatedActivities.length / sortedPhases.length);
          const phaseIndex = Math.floor(index / activitiesPerPhase);
          assignedPhase = sortedPhases[Math.min(phaseIndex, sortedPhases.length - 1)];
        }

        return {
          ...act,
          phase_id: assignedPhase.id,
        };
      });

      // Group by phase and assign sequence numbers per phase
      const phaseGroups = new Map<string, typeof activitiesWithPhases>();
      activitiesWithPhases.forEach(act => {
        const phaseId = act.phase_id;
        if (!phaseGroups.has(phaseId)) {
          phaseGroups.set(phaseId, []);
        }
        phaseGroups.get(phaseId)!.push(act);
      });

      // Assign sequence numbers within each phase
      let globalSequence = 1;
      const activitiesToInsert = sortedPhases.flatMap(phase => {
        const phaseActivities = phaseGroups.get(phase.id) || [];
        return phaseActivities.map((act, index) => ({
          project_id: projectId,
          phase_id: act.phase_id,
          sequence: globalSequence++,
          name: act.name,
          start_date: act.start_date,
          end_date: act.end_date,
          days_for_activity: act.days_for_activity,
          completion_percentage: 0,
        }));
      });

      const { data, error } = await supabase
        .from("project_activities")
        .insert(activitiesToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project_phases", projectId] });
      toast({ title: t('toast.activitiesDistributedAcrossPhases') });
    },
    onError: (error) => {
      toast({
        title: "Error initializing activities for phases",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const deleteAllActivities = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("Project ID is required");

      const { error } = await supabase
        .from("project_activities")
        .delete()
        .eq("project_id", projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
      toast({ title: t("toast.activitiesDeleted", { defaultValue: "Activities deleted successfully" }) });
    },
    onError: (error) => {
      toast({
        title: t("common.errorTitle", { defaultValue: "Error" }),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const autoScheduleActivities = useMutation({
    mutationFn: async (params: {
      startDate: Date;
      area?: number;
      baseline?: number;
      saveScenario?: boolean;
      scenarioName?: string;
      shiftByDelta?: boolean;
      currentStartDate?: Date | string | null;
    }) => {
      const {
        startDate,
        area = 100,
        baseline = 100,
        saveScenario = false,
        scenarioName = 'Auto-Schedule Scenario',
        shiftByDelta = false,
        currentStartDate = null,
      } = params;

      if (!projectId || activities.length === 0) {
        throw new Error("Project ID and activities are required");
      }

      if (shiftByDelta) {
        const referenceDate = currentStartDate
          ? new Date(currentStartDate)
          : activities
              .map(act => act.start_date)
              .filter(Boolean)
              .map(dateString => new Date(dateString as string))
              .sort((a, b) => a.getTime() - b.getTime())[0];

        if (!referenceDate || Number.isNaN(referenceDate.getTime())) {
          throw new Error("Existing activity start dates are required");
        }

        const deltaDays = differenceInCalendarDays(startDate, referenceDate);

        const updates = activities.map(act => ({
          id: act.id!,
          start_date: act.start_date
            ? addDays(new Date(act.start_date), deltaDays).toISOString().split('T')[0]
            : null,
          end_date: act.end_date
            ? addDays(new Date(act.end_date), deltaDays).toISOString().split('T')[0]
            : null,
        }));

        const results = await Promise.all(
          updates.map(update =>
            supabase
              .from("project_activities")
              .update({
                start_date: update.start_date,
                end_date: update.end_date,
              })
              .eq("id", update.id)
          )
        );
        const errors = results.filter(r => r.error);
        if (errors.length > 0) throw errors[0].error;

        return updates;
      }

      // Apply area-based scaling to days_for_activity
      const scalingFactor = area / baseline;
      const scaledActivities = activities.map(act => ({
        id: act.id,
        sequence: act.sequence,
        name: act.name,
        days_for_activity: Math.max(1, Math.round(act.days_for_activity * scalingFactor)),
        completion_percentage: act.completion_percentage,
        phase_id: act.phase_id,
      }));

      const calculatedActivities = calculateActivityDates(
        scaledActivities,
        startDate,
        true
      );

      const updates = calculatedActivities.map(act => ({
        id: act.id!,
        start_date: act.start_date,
        end_date: act.end_date,
        days_for_activity: act.days_for_activity,
      }));

      // Save scenario if requested
      if (saveScenario && projectId) {
        const { data: scenarioData, error: scenarioError } = await supabase
          .from("schedule_scenarios")
          .insert({
            project_id: projectId,
            scenario_name: scenarioName,
            description: `Area: ${area}m², Baseline: ${baseline}m², Scaling: ${scalingFactor.toFixed(2)}x`,
            is_active: false,
            is_baseline: false,
          })
          .select()
          .single();

        if (scenarioError) {
          // console.error('Failed to create scenario:', scenarioError);
          throw scenarioError;
        }

        if (scenarioData) {
          // Save activity snapshots to scenario_activities
          const activitySnapshots = calculatedActivities.map(act => ({
            scenario_id: scenarioData.id,
            activity_data: {
              id: act.id,
              name: act.name,
              sequence: act.sequence,
              phase_id: act.phase_id,
              start_date: act.start_date,
              end_date: act.end_date,
              days_for_activity: act.days_for_activity,
              completion_percentage: act.completion_percentage,
            },
          }));

          const { error: activitiesError } = await supabase
            .from("scenario_activities")
            .insert(activitySnapshots);

          if (activitiesError) {
            // console.error('Failed to save scenario activities:', activitiesError);
            throw activitiesError;
          }
        }
      }

      // Update all activities with new dates and scaled durations
      const promises = updates.map(update =>
        supabase
          .from("project_activities")
          .update({
            start_date: update.start_date,
            end_date: update.end_date,
            days_for_activity: update.days_for_activity
          })
          .eq("id", update.id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) throw errors[0].error;

      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project_phases", projectId] });
      queryClient.invalidateQueries({ queryKey: ["schedule-scenarios", projectId] });
      toast({ title: t('toast.timelineAutoScheduledSuccessfully') });
    },
    onError: (error) => {
      toast({
        title: "Error auto-scheduling timeline",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const markAsComplete = useMutation({
    mutationFn: async (activityId: string) => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("project_activities")
        .update({
          completion_percentage: 100,
          completion_date: today,
        })
        .eq("id", activityId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] });
      toast({ title: t('toast.activityMarkedAsComplete') });
    },
    onError: (error) => {
      toast({
        title: "Error marking activity as complete",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const createActivitiesFromTemplate = useMutation({
    mutationFn: async ({ 
      projectId, 
      templateActivities, 
      startDate,
      phaseId: providedPhaseId 
    }: { 
      projectId: string; 
      templateActivities: Array<{sequence: number; name: string; defaultDays: number}>; 
      startDate: Date;
      phaseId?: string;
    }) => {
      // Build targetPhases list if no phaseId provided
      let targetPhases: Array<{id: string}> = [];
      
      if (!providedPhaseId) {
        // Fetch all schedule phases for this project. 
        // We order by sort_order and start_date to get the natural project sequence.
        const { data: phases, error: phaseError } = await supabase
          .from("project_phases")
          .select("id, phase_name, wbs_item_id")
          .eq("project_id", projectId)
          .eq("type", "schedule")
          .order("sort_order", { ascending: true, nullsFirst: false });

        if (phaseError) throw phaseError;

        if (phases && phases.length > 0) {
          targetPhases = phases;
          // console.log(`[createActivitiesFromTemplate] Found ${phases.length} target phases for distribution:`, phases.map(p => p.phase_name));
        }
      }
      
      let phaseId: string | null = providedPhaseId || null;
      
      // If no phase exists and no phaseId provided, create a default one
      if (!phaseId && targetPhases.length === 0) {
        const { data: newPhase, error: createPhaseError } = await supabase
          .from("project_phases")
          .insert({
            project_id: projectId,
            phase_name: t("projectPhases.defaultPhaseName", { defaultValue: "Project Activities" }),
            start_date: startDate.toISOString().split('T')[0],
            type: "schedule",
            sort_order: 1,
          })
          .select("id")
          .single();
          
        if (createPhaseError) throw createPhaseError;
        phaseId = newPhase.id;
        targetPhases = [newPhase];
      }

      // Get the maximum existing sequence number for this project
      const { data: existingActivities, error: seqError } = await supabase
        .from("project_activities")
        .select("sequence")
        .eq("project_id", projectId)
        .order("sequence", { ascending: false })
        .limit(1);

      if (seqError) throw seqError;
      
      // Calculate sequence offset to avoid duplicates
      const maxExistingSequence = existingActivities && existingActivities.length > 0 
        ? existingActivities[0].sequence 
        : 0;
      const sequenceOffset = maxExistingSequence;

      // Detect template mode: offset-based or duration-based
      const isOffsetMode = templateActivities.length > 0 && 
        'startOffset' in templateActivities[0] && 
        templateActivities[0].startOffset !== undefined;

      let activitiesForCalculation;
      
      if (isOffsetMode) {
        // Offset-based template: pass offset fields
        activitiesForCalculation = templateActivities.map(act => ({
          sequence: act.sequence,
          name: act.name || act.description,
          startOffset: act.startOffset,
          endOffset: act.endOffset,
          duration: act.duration,
          days_for_activity: act.duration, // Use duration as days
          completion_percentage: 0,
        }));
      } else {
        // Duration-based template (legacy): use defaultDays
        activitiesForCalculation = templateActivities.map(act => ({
          sequence: act.sequence,
          name: act.name,
          days_for_activity: act.defaultDays,
          completion_percentage: 0,
        }));
      }

      const calculatedActivities = calculateActivityDates(
        activitiesForCalculation,
        startDate,
        true
      );

      const activitiesToInsert = calculatedActivities.map((act, index) => {
        let assignedPhaseId = phaseId;
        
        // If no phase was provided, distribute based on targetPhases
        if (!assignedPhaseId && targetPhases.length > 0) {
          const actsPerPhase = Math.ceil(calculatedActivities.length / targetPhases.length);
          const phaseIdx = Math.floor(index / actsPerPhase);
          assignedPhaseId = targetPhases[Math.min(phaseIdx, targetPhases.length - 1)].id;
        }

        return {
          project_id: projectId,
          phase_id: assignedPhaseId,
          sequence: act.sequence + sequenceOffset,
          name: act.name,
          start_date: act.start_date,
          end_date: act.end_date,
          days_for_activity: act.days_for_activity,
          completion_percentage: 0,
          activity_type: act.isMilestone ? 'milestone' : 'task',
        };
      });

      const { data, error } = await supabase
        .from("project_activities")
        .insert(activitiesToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-activities", variables.projectId] });
      toast({ title: t('toast.activitiesCreatedFromTemplate') });
    },
    onError: (error) => {
      toast({
        title: "Error creating activities from template",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const projectCompletion = calculateOverallProgress(
    activities.map(a => ({
      sequence: a.sequence,
      name: a.name,
      completion_percentage: a.completion_percentage,
      days_for_activity: a.days_for_activity,
      status: a.status,
    }))
  );

  return {
    activities,
    isLoading,
    createActivity,
    updateActivity,
    deleteActivity,
    initializeDefaultActivities,
    initializeActivitiesForPhases,
    deleteAllActivities,
    autoScheduleActivities,
    markAsComplete,
    projectCompletion,
    createActivitiesFromTemplate,
  };
};
