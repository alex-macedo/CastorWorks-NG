import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';
import { 
  parseLocalDate, 
  calculateCalendarDuration, 
  calculateBusinessDays,
  calculateParentSummary 
} from '@/utils/scheduleCalculators';
import type { Database } from '@/integrations/supabase/types';

type ProjectPhase = Database['public']['Tables']['project_phases']['Row'];
type ProjectPhaseUpdate = Database['public']['Tables']['project_phases']['Update'];

export interface WbsItem {
  id: string;
  project_id: string;
  name: string;
  wbs_code: string | null;
  parent_id: string | null;
  source_template_item_id?: string | null;
  item_type?: 'phase' | 'deliverable' | 'work_package' | 'control_account';
  description?: string | null;
  sort_order?: number | null;
  code_path?: string | null;
  standard_duration_days?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  duration?: number | null;
  progress_percentage?: number | null;
  status?: 'pending' | 'in_progress' | 'completed' | 'blocked' | string | null;
  level?: number;
  duration_days?: number | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useProjectWbsItems = (projectId: string | undefined) => {
  const { t } = useLocalization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wbsItems, isLoading, error } = useQuery({
    queryKey: ['projectWbsItems', projectId],
    queryFn: async () => {
      if (!projectId) return [];
        // Join with project_phases to get schedule data (start_date, end_date, progress_percentage)
        // Join with project_activities to get task schedule data
        // Note: wbs_item_id has a unique constraint, so this is a one-to-one relationship
        const { data, error } = await supabase
          .from('project_wbs_items')
          .select(`
            *,
            project_phases!project_phases_wbs_item_id_fkey (
              id,
              start_date,
              end_date,
              progress_percentage,
              status,
              budget_allocated,
              budget_spent
            ),
            project_activities!project_activities_wbs_item_id_fkey (
              id,
              start_date,
              end_date,
              completion_percentage,
              status
            )
          `)
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('wbs_code', { ascending: true });

        if (error) throw error;
        
        // Merge phase and activity data into WBS items
        // Handle both array and single object responses (Supabase may return either)
        const rawItems = (data || []).map((item: any) => {
          // Handle one-to-one relationship: could be array or single object
          const phase = Array.isArray(item.project_phases) 
            ? item.project_phases[0] 
            : item.project_phases;
          
          const activity = Array.isArray(item.project_activities)
            ? item.project_activities[0]
            : item.project_activities;
          
          const startDate = phase?.start_date || activity?.start_date || item.start_date || null;
          const endDate = phase?.end_date || activity?.end_date || item.end_date || null;
          
          // Calculate duration from dates if available (business days), 
          // otherwise use stored duration fields
          let calculatedDuration: number | null = null;
          if (startDate && endDate) {
            calculatedDuration = calculateBusinessDays(startDate, endDate);
          }
          
          const finalDuration = item.standard_duration_days || item.duration_days || calculatedDuration || null;
          
          return {
            ...item,
            start_date: startDate,
            end_date: endDate,
            progress_percentage: phase?.progress_percentage || activity?.completion_percentage || item.progress_percentage || 0,
            status: phase?.status || activity?.status || item.status || 'pending',
            duration: finalDuration,
            activity_id: activity?.id || null,
            phase_id: phase?.id || null,
          };
        });
      
        // For phase-type items with children, derive status and progress from child tasks
        // (DB trigger skips WBS phases, so stored phase status is stale)
        const items = rawItems.map((item: any) => {
          if (item.item_type !== 'phase') return item;
          const children = rawItems.filter((c: any) => c.parent_id === item.id);
          if (children.length === 0) return item;
          const childScheduleItems = children.map((c: any) => ({
            id: c.id,
            start_date: c.start_date,
            end_date: c.end_date,
            duration: c.duration,
            days_for_activity: c.duration || c.standard_duration_days,
            completion_percentage: c.progress_percentage,
            progress_percentage: c.progress_percentage,
            status: c.status,
          }));
          const summary = calculateParentSummary(childScheduleItems);
          return {
            ...item,
            progress_percentage: summary.progress,
            status: summary.status,
          };
        });
      
      return items as any as WbsItem[];
    },
    enabled: !!projectId,
  });

  // Compute wbsPhases: filter phase-type items and convert to phase format
  // Preserve sort_order from template to maintain correct phase order
  const wbsPhases = useMemo(() => {
    if (!wbsItems) return [];
    
    return wbsItems
      .filter(item => item.item_type === 'phase')
      .map((item): ProjectPhase => ({
        id: item.id,
        project_id: item.project_id,
        phase_name: item.name,
        start_date: item.start_date || null,
        end_date: item.end_date || null,
        progress_percentage: item.progress_percentage || 0,
        status: item.status || 'pending' as const,
        budget_allocated: 0,
        budget_spent: 0,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString(),
        type: 'schedule' as const,
        sort_order: item.sort_order || 0,
        parent_id: item.parent_id || null,
        duration: item.duration,
      } as any) as ProjectPhase)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [wbsItems]);

  // Helper function to get children of a WBS item
  const getChildrenOf = useMemo(() => {
    return (parentId: string | null): WbsItem[] => {
      if (!wbsItems) return [];
      if (parentId === null) {
        // Return root items (no parent)
        return wbsItems.filter(item => !item.parent_id);
      }
      return wbsItems.filter(item => item.parent_id === parentId);
    };
  }, [wbsItems]);

  const wbsHierarchy = useMemo(() => {
    const map = new Set<string>();
    if (!wbsItems) return map;
    wbsItems.forEach(item => {
      if (item.parent_id) map.add(item.parent_id);
    });
    return map;
  }, [wbsItems]);

  const createWbsItem = useMutation({
    mutationFn: async (item: Partial<WbsItem>) => {
      const { data, error } = await supabase
        .from('project_wbs_items')
        .insert([{ ...item, project_id: projectId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectWbsItems', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project_phases', projectId] });
      toast({ title: t('common.success') });
    },
  });

  // Mutation to initialize schedule dates
  const initializeScheduleDates = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('Project ID is required');
      
      const { data, error } = await supabase.rpc('initialize_wbs_schedule_dates', {
        _project_id: projectId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectWbsItems', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project_phases', projectId] });
      toast({ 
        title: t('common.success'),
        description: t('toast.scheduleInitialized', { defaultValue: 'Schedule dates initialized successfully' })
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.errorTitle'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation to update WBS item
  const updateWbsItem = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WbsItem> }) => {
      const { data, error } = await supabase
        .from('project_wbs_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectWbsItems', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project_phases', projectId] });
      toast({ title: t('common.success') });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.errorTitle'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Find original template ID from existing WBS items
  const { data: originalTemplateId } = useQuery({
    queryKey: ['projectWbsOriginalTemplate', projectId],
    queryFn: async () => {
      if (!projectId || !wbsItems || wbsItems.length === 0) return null;
      
      // Get any WBS item with a source_template_item_id
      const itemWithTemplate = wbsItems.find(item => item.source_template_item_id);
      if (!itemWithTemplate?.source_template_item_id) return null;
      
      // Query the template_item to get template_id
      const { data, error } = await supabase
        .from('project_wbs_template_items')
        .select('template_id')
        .eq('id', itemWithTemplate.source_template_item_id)
        .maybeSingle();
      
      if (error) throw error;
      return data?.template_id || null;
    },
    enabled: !!projectId && !!wbsItems && wbsItems.length > 0,
  });

  // Mutation to bulk delete WBS items (phases)
  const bulkDeleteWbsPhases = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!projectId) throw new Error('Project ID is required');
      if (ids.length === 0) return;

      // Delete WBS items - cascade will delete linked project_phases
      const { error } = await supabase
        .from('project_wbs_items')
        .delete()
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['projectWbsItems', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project_phases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] });
      toast({
        title: t('common.success'),
        description: t('toast.phasesDeleted', {
          defaultValue: `Successfully deleted ${ids.length} phase(s)`,
          count: ids.length
        })
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.errorTitle'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation to rebuild schedule (delete and re-apply template)
  const rebuildSchedule = useMutation({
    mutationFn: async (templateId: string) => {
      if (!projectId) throw new Error('Project ID is required');
      
      console.log(`[rebuildSchedule] Starting rebuild for project ${projectId} using template ${templateId}`);
      
      // Step 1: Delete all WBS items (cascade will delete linked project_phases)
      const { error: deleteWbsError } = await supabase
        .from('project_wbs_items')
        .delete()
        .eq('project_id', projectId);
      
      if (deleteWbsError) throw deleteWbsError;

      // Step 2: Delete all project_activities for this project to ensure a clean slate
      const { error: deleteActError } = await supabase
        .from('project_activities')
        .delete()
        .eq('project_id', projectId);
      
      if (deleteActError) throw deleteActError;

      // Step 3: Delete project_phases that are not linked to WBS items but belong to schedule
      // (Linked ones are already deleted by cascade from project_wbs_items)
      const { error: deletePhaseError } = await supabase
        .from('project_phases')
        .delete()
        .eq('project_id', projectId)
        .eq('type', 'schedule');
      
      if (deletePhaseError) throw deletePhaseError;
      
      // Step 4: Re-apply the template
      const { error: applyError } = await supabase.rpc(
        'apply_wbs_template_to_project_internal',
        {
          _project_id: projectId,
          _template_id: templateId,
        }
      );
      
      if (applyError) throw applyError;
      
      // Step 5: Rebuild schedule with calendar awareness (skips weekends/holidays when calendar_enabled)
      const { error: rebuildError } = await supabase.rpc('rebuild_project_schedule_for_calendar', {
        p_project_id: projectId,
      });
      if (rebuildError) {
        // Non-fatal: schedule may still be usable, log but don't throw
        console.warn('[rebuildSchedule] rebuild_project_schedule_for_calendar failed:', rebuildError);
      }
      
      console.log(`[rebuildSchedule] Successfully applied template ${templateId} to project ${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectWbsItems', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project_phases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projectWbsOriginalTemplate', projectId] });
      toast({ 
        title: t('common.success'),
        description: t('toast.scheduleRebuilt', { defaultValue: 'Schedule rebuilt successfully' })
      });
    },
    onError: (error: Error) => {
      console.error('[rebuildSchedule] Error:', error);
      toast({
        title: t('common.errorTitle'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation to update linked project_phases record
  const updateLinkedPhase = useMutation({
    mutationFn: async ({ 
      wbsItemId, 
      updates 
    }: { 
      wbsItemId: string; 
      updates: {
        start_date?: string;
        end_date?: string;
        duration?: number;
        progress_percentage?: number;
      }
    }) => {
      // Find the linked phase by wbs_item_id
      const { data: phase, error: phaseError } = await supabase
        .from('project_phases')
        .select('id')
        .eq('wbs_item_id', wbsItemId)
        .maybeSingle();

      if (phaseError) throw phaseError;

      if (!phase) {
        // If no phase exists, create one
        const wbsItem = wbsItems?.find(item => item.id === wbsItemId);
        if (!wbsItem) {
          throw new Error('WBS item not found');
        }

        const phaseData: ProjectPhaseUpdate & { wbs_item_id?: string } = {
          project_id: projectId!,
          phase_name: wbsItem.name,
          wbs_item_id: wbsItemId, // wbs_item_id exists in DB but may not be in generated types
          start_date: updates.start_date || null,
          end_date: updates.end_date || null,
          progress_percentage: updates.progress_percentage || 0,
          status: 'pending',
          type: 'schedule',
          sort_order: wbsItem.sort_order || 0,
        };

        const { data: newPhase, error: createError } = await supabase
          .from('project_phases')
          .insert(phaseData)
          .select()
          .single();

        if (createError) throw createError;
        return newPhase;
      }

      // Update existing phase
      const phaseUpdates: ProjectPhaseUpdate = {};
      if (updates.start_date !== undefined) phaseUpdates.start_date = updates.start_date;
      if (updates.end_date !== undefined) phaseUpdates.end_date = updates.end_date;
      if (updates.progress_percentage !== undefined) phaseUpdates.progress_percentage = updates.progress_percentage;

      const { data: updatedPhase, error: updateError } = await supabase
        .from('project_phases')
        .update(phaseUpdates)
        .eq('id', phase.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedPhase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectWbsItems', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project_phases', projectId] });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.errorTitle'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    wbsItems: wbsItems || [],
    phases: wbsPhases,
    wbsPhases, // Alias for compatibility
    getChildrenOf,
    wbsHierarchy,
    initializeScheduleDates,
    updateWbsItem,
    updateLinkedPhase,
    originalTemplateId: originalTemplateId || null,
    rebuildSchedule,
    bulkDeleteWbsPhases,
    isLoading,
    error,
    createWbsItem,
  };
};
