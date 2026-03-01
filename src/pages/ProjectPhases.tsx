import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { useProjectActivities } from "@/hooks/useProjectActivities";
import { useMilestones } from "@/hooks/useMilestones";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useProjectCalendarSettings, useProjectCalendarEntries } from "@/hooks/useProjectCalendar";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { exportRowsToCsv, parseCSV } from "@/utils/dataExport";
import { 
  parseLocalDate, 
  formatDateLocal, 
  calculateParentSummary,
  calculateScheduleStatus,
  calculateEndDateFromBusinessDays,
  calculateBusinessDays,
  getNextWorkDay,
  scheduleItems,
  ScheduleItem,
  performProjectScheduling
} from "@/utils/scheduleCalculators";
import { ScheduleScenariosPanel } from "@/components/Schedule/ScheduleScenariosPanel";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Layers, 
  CalendarRange, 
  List, 
  BarChart3, 
  Zap, 
  Activity
} from "lucide-react";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { TimelineSummary } from "@/components/Schedule/TimelineSummary";
import { AutoScheduleButton } from "@/components/Schedule/AutoScheduleButton";
import { ProjectPlanView } from "@/components/ProjectPhases/ProjectPlanView";
import { MicrosoftProjectLike, MSProjectTask } from "@/components/Projects/MicrosoftProjectLike";
import ProfessionalGanttChart from "@/components/Gantt/ProfessionalGanttChart";
import { ActivityCalendar } from "@/components/ActivityCalendar/ActivityCalendar";
import {
  MilestoneReport,
  MilestoneSummaryCards,
} from "@/components/ProjectPhases/MilestoneReport";
import { PhasesImportDialog } from "@/components/ProjectPhases/PhasesImportDialog";
import { CreateFromTemplateDialog } from "@/components/ProjectPhases/CreateFromTemplateDialog";
import { MilestoneEntryTable } from "@/components/ProjectPhases/MilestoneEntryTable";
import { 
  calculateTotalDuration, 
  calculateProjectEndDate, 
  getDaysRemaining, 
  getScheduleHealth 
} from "@/utils/timelineCalculators";
import { addDays, differenceInDays } from "date-fns";
import { useProjectWbsItems } from "@/hooks/useProjectWbsItems";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { ProjectWithSchedule } from "@/types/projects";
import { getProjectScheduleStatus } from "@/types/projectScheduleStatus";

interface ProjectPhasesProps {
  isWidget?: boolean;
  projectId?: string;
}

const ProjectPhases = ({ isWidget = false, projectId: propProjectId }: ProjectPhasesProps) => {
  const { t } = useLocalization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get("projectId");
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    propProjectId || projectIdFromUrl || undefined
  );
  const [activeTab, setActiveTab] = useState<'schedule' | 'baseline' | 'milestones'>('schedule');
  const [scheduleView, setScheduleView] = useState<'calendar' | 'list' | 'gantt' | 'gantt-new'>('list');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [csvImportFile, setCsvImportFile] = useState<File | null>(null);
  const [isCsvImporting, setIsCsvImporting] = useState(false);
  const [isCreateFromTemplateOpen, setIsCreateFromTemplateOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const ganttRef = useRef<any>(null);

  const { projects, isLoading: projectsLoading, updateProject } = useProjects();
  
  const { 
    wbsItems, 
    phases: wbsPhases, 
    isLoading: wbsItemsLoading, 
    initializeScheduleDates,
    rebuildSchedule,
    originalTemplateId,
    updateLinkedPhase,
    bulkDeleteWbsPhases,
    updateWbsItem
  } = useProjectWbsItems(selectedProjectId || undefined);

  const { phases: legacyPhases, isLoading: legacyPhasesLoading, deleteAllPhases, updatePhase } = useProjectPhases(selectedProjectId || undefined);
  
  const wbsChildrenAsActivities = useMemo(() => {
    if (!wbsItems || !wbsPhases) return [];
    
    const itemMap = new Map(wbsItems.map(i => [i.id, i]));

    return wbsItems
      .filter(item => item.item_type !== 'phase')
      .map((item, index) => {
        return {
          id: item.id,
          project_id: item.project_id,
          phase_id: item.parent_id,
          sequence: item.sort_order || index + 1,
          name: item.name,
          description: item.description || null,
          start_date: item.start_date || null,
          end_date: item.end_date || null,
          days_for_activity: item.duration || item.standard_duration_days || 0,
          completion_percentage: item.progress_percentage || 0,
          completion_date: null,
          dependencies: [],
          is_critical: false,
          status: item.status || 'pending',
          metadata: {
            wbs_code: item.wbs_code,
            item_type: item.item_type,
            code_path: item.code_path,
            isWbsItem: true,
          },
          created_at: item.created_at,
          updated_at: item.updated_at,
        };
      });
  }, [wbsItems, wbsPhases]);
  
  const isWbsProject = wbsItems && wbsItems.length > 0;

  const phases = useMemo(() => {
    return isWbsProject ? wbsPhases : (legacyPhases || []);
  }, [isWbsProject, wbsPhases, legacyPhases]);

  const milestonePhases = useMemo(() => {
    if (!isWbsProject) return phases || [];

    // project_milestones.phase_id references project_phases.id (not project_wbs_items.id)
    return (legacyPhases || []).filter((phase) => {
      const type = (phase as any).type;
      return !type || type === 'schedule';
    });
  }, [isWbsProject, phases, legacyPhases]);

  const phasesLoading = wbsItemsLoading;

  const { 
    activities, 
    isLoading: activitiesLoading,
    updateActivity, 
    initializeActivitiesForPhases,
    deleteAllActivities,
    autoScheduleActivities,
    projectCompletion 
  } = useProjectActivities(selectedProjectId || undefined);

  const {
    milestones,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    sendMilestoneNotifications,
  } = useMilestones(selectedProjectId || undefined);
  const { data: calendarSettings } = useProjectCalendarSettings(selectedProjectId || '');
  const { data: calendarEntries } = useProjectCalendarEntries(selectedProjectId || '', {
    startDate: '2024-01-01',
    endDate: '2025-12-31',
  });
  const { data: rolesData } = useUserRoles();
  const roles = rolesData?.map(r => r.role);

  const projectCalendar = useMemo(() => {
    if (!calendarSettings) return undefined;
    return {
      enabled: calendarSettings.calendar_enabled,
      workingDays: calendarSettings.calendar_default_working_days?.split(',').map(d => d.trim()) || [],
      holidays: calendarEntries?.map(entry => ({
        date: entry.calendar_date,
        reason: entry.reason || 'Holiday'
      })) || []
    };
  }, [calendarSettings, calendarEntries]);

  const selectedProject = useMemo(() => {
    return (projects?.find(p => p.id === selectedProjectId) || null) as ProjectWithSchedule | null;
  }, [projects, selectedProjectId]);

  const canEdit = roles?.includes('admin') || roles?.includes('project_manager') || roles?.includes('architect');

  // Handler for starting tasks - works with both regular activities and WBS items
  const handleStartTask = useCallback(async (id: string, isWbsItem?: boolean) => {
    if (isWbsItem && updateWbsItem) {
      // Update the WBS item status and progress
      await updateWbsItem.mutateAsync({ 
        id, 
        updates: { 
          status: 'in_progress',
          progress_percentage: 1  // Set initial progress when starting
        } 
      });
      
      // Find the parent phase and update it to 'in_progress' as well
      const item = wbsItems?.find(w => w.id === id);
      if (item?.parent_id) {
        const parentPhase = wbsItems?.find(w => w.id === item.parent_id);
        if (parentPhase && parentPhase.status !== 'in_progress' && parentPhase.status !== 'completed') {
          await updateWbsItem.mutateAsync({
            id: item.parent_id,
            updates: { status: 'in_progress' }
          });
        }
      }
    } else {
      await updateActivity.mutateAsync({ id, status: 'in_progress', completion_percentage: 1 });
    }
  }, [updateWbsItem, updateActivity, wbsItems]);

  // Handler for completing tasks - marks task as 100% and recalculates phase progress
  const handleCompleteTask = useCallback(async (id: string, isWbsItem?: boolean) => {
    if (isWbsItem && updateWbsItem && wbsItems) {
      // Update the task to completed with 100% progress
      await updateWbsItem.mutateAsync({ 
        id, 
        updates: { 
          status: 'completed',
          progress_percentage: 100
        } 
      });
      
      // Find the parent phase and recalculate its progress
      const item = wbsItems.find(w => w.id === id);
      if (item?.parent_id) {
        // Get all sibling tasks under the same parent phase
        const siblingTasks = wbsItems.filter(w => 
          w.parent_id === item.parent_id && 
          w.item_type !== 'phase'
        );
        
        // Calculate average progress (the task we just updated is now 100%)
        const totalProgress = siblingTasks.reduce((sum, task) => {
          if (task.id === id) return sum + 100; // This task is now 100%
          return sum + (task.progress_percentage || 0);
        }, 0);
        const avgProgress = Math.round(totalProgress / siblingTasks.length);
        
        // Check if all tasks are completed
        const allCompleted = siblingTasks.every(task => 
          task.id === id || task.progress_percentage === 100
        );
        
        // Update parent phase progress and status
        await updateWbsItem.mutateAsync({
          id: item.parent_id,
          updates: { 
            progress_percentage: avgProgress,
            status: allCompleted ? 'completed' : 'in_progress'
          }
        });
      }
    } else {
      await updateActivity.mutateAsync({ id, status: 'completed', completion_percentage: 100 });
    }
  }, [updateWbsItem, updateActivity, wbsItems]);

  // WBS-aware handlers for Phase/Task edit form (ProjectPlanView)
  const handleUpdatePhaseForWbs = useCallback(async (id: string, updates: Record<string, unknown>) => {
    if (!updateWbsItem || !updateLinkedPhase) throw new Error('WBS update not available');
    const wbsUpdates: Record<string, unknown> = {};
    if (updates.phase_name != null) wbsUpdates.name = updates.phase_name;
    if (updates.progress_percentage !== undefined) wbsUpdates.progress_percentage = updates.progress_percentage;
    if (updates.status !== undefined) wbsUpdates.status = updates.status;
    if (Object.keys(wbsUpdates).length > 0) {
      await updateWbsItem.mutateAsync({ id, updates: wbsUpdates as any });
    }
    if (updates.start_date !== undefined || updates.end_date !== undefined || updates.progress_percentage !== undefined) {
      await updateLinkedPhase.mutateAsync({
        wbsItemId: id,
        updates: {
          start_date: updates.start_date as string | undefined,
          end_date: updates.end_date as string | undefined,
          progress_percentage: updates.progress_percentage as number | undefined,
        },
      });
    }
  }, [updateWbsItem, updateLinkedPhase]);

  const handleUpdateActivityForWbs = useCallback(async (id: string, updates: Record<string, unknown>) => {
    if (!updateWbsItem) throw new Error('WBS update not available');
    const wbsUpdates: Record<string, unknown> = {};
    if (updates.name != null) wbsUpdates.name = updates.name;
    if (updates.description !== undefined) wbsUpdates.description = updates.description;
    if (updates.status !== undefined) wbsUpdates.status = updates.status;
    if (updates.completion_percentage !== undefined) wbsUpdates.progress_percentage = updates.completion_percentage;
    if (updates.days_for_activity !== undefined) wbsUpdates.standard_duration_days = updates.days_for_activity;
    if (Object.keys(wbsUpdates).length > 0) {
      await updateWbsItem.mutateAsync({ id, updates: wbsUpdates as any });
    }
    const activityUpdates: Record<string, unknown> = {};
    if (updates.start_date !== undefined) activityUpdates.start_date = updates.start_date;
    if (updates.end_date !== undefined) activityUpdates.end_date = updates.end_date;
    if (updates.days_for_activity !== undefined) activityUpdates.days_for_activity = updates.days_for_activity;
    if (Object.keys(activityUpdates).length > 0) {
      await updateActivity.mutateAsync({ id, ...activityUpdates, silent: true } as any);
    }
  }, [updateWbsItem, updateActivity]);

  const csvPhaseValue = t("projectPhases.csv.values.phase");
  const csvTaskValue = t("projectPhases.csv.values.task");

  const csvColumns = useMemo(
    () => [
      { key: "record_type", label: t("projectPhases.csv.headers.recordType") },
      { key: "phase_id", label: t("projectPhases.csv.headers.phaseId") },
      { key: "phase_name", label: t("projectPhases.csv.headers.phaseName") },
      { key: "phase_start_date", label: t("projectPhases.csv.headers.phaseStartDate") },
      { key: "phase_end_date", label: t("projectPhases.csv.headers.phaseEndDate") },
      { key: "phase_progress_percentage", label: t("projectPhases.csv.headers.phaseProgress") },
      { key: "phase_sort_order", label: t("projectPhases.csv.headers.phaseSortOrder") },
      { key: "task_id", label: t("projectPhases.csv.headers.taskId") },
      { key: "task_name", label: t("projectPhases.csv.headers.taskName") },
      { key: "task_start_date", label: t("projectPhases.csv.headers.taskStartDate") },
      { key: "task_end_date", label: t("projectPhases.csv.headers.taskEndDate") },
      { key: "task_duration_days", label: t("projectPhases.csv.headers.taskDuration") },
      { key: "task_progress_percentage", label: t("projectPhases.csv.headers.taskProgress") },
      { key: "task_sequence", label: t("projectPhases.csv.headers.taskSequence") },
      { key: "task_phase_id", label: t("projectPhases.csv.headers.taskPhaseId") },
    ],
    [t]
  );

  const csvHeaderLabels = useMemo(() => csvColumns.map(column => column.label).join(", "), [csvColumns]);

  const sanitizeFileName = (value: string) => value.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "");

  const handleInitializeSchedule = async () => {
    try {
      await deleteAllPhases.mutateAsync();
      await deleteAllActivities.mutateAsync();
      await initializeScheduleDates.mutateAsync();
      toast({
        title: t("common.success"),
        description: t("projectPhases.initScheduleSuccess", { defaultValue: "Schedule initialized successfully" }),
      });
    } catch (error: any) {
      toast({
        title: t("common.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportCsv = () => {
    if (!selectedProjectId) return;

    const phaseRows = effectivePhases.map(phase => ({
      record_type: csvPhaseValue,
      phase_id: phase.id,
      phase_name: phase.phase_name,
      phase_start_date: phase.start_date ?? '',
      phase_end_date: phase.end_date ?? '',
      phase_progress_percentage: phase.progress_percentage ?? 0,
      phase_sort_order: phase.sort_order ?? '',
      task_id: '',
      task_name: '',
      task_start_date: '',
      task_end_date: '',
      task_duration_days: '',
      task_progress_percentage: '',
      task_sequence: '',
      task_phase_id: '',
    }));

    const phaseNameById = new Map<string, string>(
      effectivePhases.map(phase => [phase.id, phase.phase_name] as [string, string])
    );

    const taskRows = effectiveActivities.map(activity => ({
      record_type: csvTaskValue,
      phase_id: activity.phase_id ?? '',
      phase_name: activity.phase_id ? phaseNameById.get(activity.phase_id) ?? '' : '',
      phase_start_date: '',
      phase_end_date: '',
      phase_progress_percentage: '',
      phase_sort_order: '',
      task_id: activity.id,
      task_name: activity.name,
      task_start_date: activity.start_date ?? '',
      task_end_date: activity.end_date ?? '',
      task_duration_days: activity.days_for_activity ?? '',
      task_progress_percentage: activity.completion_percentage ?? 0,
      task_sequence: activity.sequence ?? '',
      task_phase_id: activity.phase_id ?? '',
    }));

    const rows = [...phaseRows, ...taskRows];

    if (rows.length === 0) {
      toast({
        title: t("common.info"),
        description: t("projectPhases.csv.empty"),
      });
      return;
    }

    const baseName = selectedProject?.name ? sanitizeFileName(selectedProject.name) : selectedProjectId;
    const fileName = `${t("projectPhases.csv.fileName")}-${baseName}.csv`;
    exportRowsToCsv(rows, csvColumns, fileName);
  };

  const buildCsvRow = (row: Record<string, any>) => {
    return csvColumns.reduce((acc, column) => {
      acc[column.key] = row[column.label] ?? row[column.key];
      return acc;
    }, {} as Record<string, any>);
  };

  const handleCsvImport = async () => {
    if (!csvImportFile) {
      toast({
        title: t("common.errorTitle"),
        description: t("projectPhases.csv.noFile"),
        variant: "destructive",
      });
      return;
    }

    if (!selectedProjectId) {
      toast({
        title: t("common.errorTitle"),
        description: t("projectPhases.csv.noProject"),
        variant: "destructive",
      });
      return;
    }

    setIsCsvImporting(true);

    try {
      const text = await csvImportFile.text();
      const parsedRows = parseCSV(text).map(buildCsvRow);
      const phaseRows = parsedRows.filter(row => {
        const type = String(row.record_type || '').toLowerCase();
        return type === String(csvPhaseValue).toLowerCase() || type === 'phase';
      });
      const taskRows = parsedRows.filter(row => {
        const type = String(row.record_type || '').toLowerCase();
        return type === String(csvTaskValue).toLowerCase() || type === 'task';
      });

      const phaseUpdates = phaseRows.filter(row => row.phase_id);
      const taskUpdates = taskRows.filter(row => row.task_id);

      if (phaseUpdates.length === 0 && taskUpdates.length === 0) {
        toast({
          title: t("common.info"),
          description: t("projectPhases.csv.noUpdates"),
        });
        setIsCsvImportOpen(false);
        setCsvImportFile(null);
        return;
      }

      if (isWbsProject) {
        await Promise.all(
          phaseUpdates.map(async (row) => {
            const wbsUpdates: Record<string, any> = {};
            if (row.phase_name !== undefined) wbsUpdates.name = row.phase_name;
            if (row.phase_sort_order !== undefined && row.phase_sort_order !== '') {
              wbsUpdates.sort_order = Number(row.phase_sort_order);
            }

            if (Object.keys(wbsUpdates).length > 0) {
              const { error } = await supabase
                .from('project_wbs_items')
                .update(wbsUpdates)
                .eq('id', row.phase_id);

              if (error) throw error;
            }

            const phaseLinkedUpdates: Record<string, any> = {};
            if (row.phase_start_date !== undefined) phaseLinkedUpdates.start_date = row.phase_start_date || null;
            if (row.phase_end_date !== undefined) phaseLinkedUpdates.end_date = row.phase_end_date || null;
            if (row.phase_progress_percentage !== undefined && row.phase_progress_percentage !== '') {
              phaseLinkedUpdates.progress_percentage = Number(row.phase_progress_percentage);
            }

            if (Object.keys(phaseLinkedUpdates).length > 0) {
              await updateLinkedPhase.mutateAsync({ wbsItemId: row.phase_id, updates: phaseLinkedUpdates });
            }
          })
        );

        await Promise.all(
          taskUpdates.map(async (row) => {
            const wbsUpdates: Record<string, any> = {};
            if (row.task_name !== undefined) wbsUpdates.name = row.task_name;
            if (row.task_duration_days !== undefined && row.task_duration_days !== '') {
              wbsUpdates.standard_duration_days = Number(row.task_duration_days);
            }
            if (row.task_progress_percentage !== undefined && row.task_progress_percentage !== '') {
              wbsUpdates.progress_percentage = Number(row.task_progress_percentage);
            }

            if (Object.keys(wbsUpdates).length > 0) {
              const { error } = await supabase
                .from('project_wbs_items')
                .update(wbsUpdates)
                .eq('id', row.task_id);

              if (error) throw error;
            }
          })
        );

        queryClient.invalidateQueries({ queryKey: ['projectWbsItems', selectedProjectId] });
        queryClient.invalidateQueries({ queryKey: ['project_phases', selectedProjectId] });
        queryClient.invalidateQueries({ queryKey: ['project-activities', selectedProjectId] });
      } else {
        await Promise.all(
          phaseUpdates.map(async (row) => {
            const updates: Record<string, any> = {};
            if (row.phase_name !== undefined) updates.phase_name = row.phase_name;
            if (row.phase_start_date !== undefined) updates.start_date = row.phase_start_date || null;
            if (row.phase_end_date !== undefined) updates.end_date = row.phase_end_date || null;
            if (row.phase_progress_percentage !== undefined && row.phase_progress_percentage !== '') {
              updates.progress_percentage = Number(row.phase_progress_percentage);
            }
            if (row.phase_sort_order !== undefined && row.phase_sort_order !== '') {
              updates.sort_order = Number(row.phase_sort_order);
            }

            if (Object.keys(updates).length === 0) return;

            const { error } = await supabase
              .from('project_phases')
              .update(updates)
              .eq('id', row.phase_id);

            if (error) throw error;
          })
        );

        await Promise.all(
          taskUpdates.map(async (row) => {
            const updates: Record<string, any> = {};
            if (row.task_name !== undefined) updates.name = row.task_name;
            if (row.task_start_date !== undefined) updates.start_date = row.task_start_date || null;
            if (row.task_end_date !== undefined) updates.end_date = row.task_end_date || null;
            if (row.task_duration_days !== undefined && row.task_duration_days !== '') {
              updates.days_for_activity = Number(row.task_duration_days);
            }
            if (row.task_progress_percentage !== undefined && row.task_progress_percentage !== '') {
              updates.completion_percentage = Number(row.task_progress_percentage);
            }
            if (row.task_sequence !== undefined && row.task_sequence !== '') {
              updates.sequence = Number(row.task_sequence);
            }
            if (row.task_phase_id !== undefined && row.task_phase_id !== '') {
              updates.phase_id = row.task_phase_id;
            }

            if (Object.keys(updates).length === 0) return;

            const { error } = await supabase
              .from('project_activities')
              .update(updates)
              .eq('id', row.task_id);

            if (error) throw error;
          })
        );
      }

      queryClient.invalidateQueries({ queryKey: ['project_phases', selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ['project-activities', selectedProjectId] });

      toast({
        title: t("common.success"),
        description: t("projectPhases.csv.importSuccess", {
          phases: phaseUpdates.length,
          tasks: taskUpdates.length,
        }),
      });

      setIsCsvImportOpen(false);
      setCsvImportFile(null);
    } catch (error: any) {
      toast({
        title: t("common.errorTitle"),
        description: error.message || t("projectPhases.csv.importError"),
        variant: "destructive",
      });
    } finally {
      setIsCsvImporting(false);
    }
  };


  const effectiveActivities = useMemo(() => isWbsProject ? wbsChildrenAsActivities : (activities || []), [isWbsProject, wbsChildrenAsActivities, activities]);
  const effectivePhases = useMemo(() => phases || [], [phases]);

  const projectStartDate = useMemo(() => selectedProject?.start_date ? parseLocalDate(selectedProject.start_date) : null, [selectedProject]);

  const timelineMetrics = useMemo(() => {
    if (!effectiveActivities || effectiveActivities.length === 0 || !projectStartDate) {
      return { totalDuration: 0, expectedEndDate: "", daysRemaining: 0, scheduleHealth: "on_track" as const };
    }

    // Use the exact same hierarchical scheduling logic as the List view
    const { activities: scheduled, phases: scheduledPhases } = performProjectScheduling(
      formatDateLocal(projectStartDate),
      phases || [],
      effectiveActivities
    );
    
    // Find the latest end date across all scheduled items
    const allEndDates = [
      ...scheduled.map(a => parseLocalDate(a.end_date)),
      ...scheduledPhases.map(p => parseLocalDate(p.end_date))
    ].filter((d): d is Date => d !== null && !isNaN(d.getTime()));

    const maxEnd = allEndDates.length > 0 
      ? new Date(Math.max(...allEndDates.map(d => d.getTime()))) 
      : projectStartDate;

    const totalDuration = scheduled.reduce((sum, a) => {
      // Only sum leaf activities (or top-level if no nesting) to avoid double counting
      const hasChildren = scheduled.some(child => child.phase_id === a.id);
      return hasChildren ? sum : sum + (a.days_for_activity || 1);
    }, 0);

    const expectedEndDate = maxEnd;
    const daysRemaining = getDaysRemaining(expectedEndDate, true);
    
    const scheduleHealthResult = getScheduleHealth(scheduled.map(a => ({
      sequence: a.sequence,
      name: a.name,
      start_date: a.start_date,
      end_date: a.end_date,
      completion_percentage: a.completion_percentage || 0,
      days_for_activity: a.days_for_activity || 1,
      status: a.status,
    })));

    return {
      totalDuration,
      expectedEndDate: formatDateLocal(expectedEndDate),
      daysRemaining,
      scheduleHealth: scheduleHealthResult.status,
    };
  }, [effectiveActivities, projectStartDate, phases]);


  const summaryMetrics = useMemo(() => {
    const fallback = {
      totalDuration: timelineMetrics.totalDuration,
      expectedEndDate: timelineMetrics.expectedEndDate,
      daysRemaining: timelineMetrics.daysRemaining,
      completionPercentage: projectCompletion,
      startDate: "",
      endDate: "",
    };
    if (!selectedProject) return fallback;
    return {
      // Prioritize calculated metrics over potentially stale project record values
      totalDuration: timelineMetrics.totalDuration || selectedProject.estimated_duration || 0,
      expectedEndDate: timelineMetrics.expectedEndDate || selectedProject.expected_end_date || "",
      daysRemaining: timelineMetrics.daysRemaining ?? selectedProject.days_remaining ?? 0,
      completionPercentage: projectCompletion > 0 ? projectCompletion : (selectedProject.completion_percentage ?? 0),
      startDate: selectedProject.start_date ?? "",
      endDate: timelineMetrics.expectedEndDate || selectedProject.end_date || "",
    };
  }, [selectedProject, timelineMetrics, projectCompletion]);

  const projectScheduleHealth = useMemo(() => {
    const scheduleStatus = getProjectScheduleStatus(selectedProject || {})

    switch (scheduleStatus) {
      case 'delayed':
        return 'delayed' as const
      case 'at_risk':
        return 'at_risk' as const
      case 'not_started':
      case 'on_schedule':
      default:
        return 'on_track' as const
    }
  }, [selectedProject]);

  const projectUpdateInProgressRef = useRef(false);

  // Background sync: Update project table with latest metrics
  useEffect(() => {
    if (!selectedProject || !timelineMetrics.expectedEndDate || projectUpdateInProgressRef.current) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    // ONLY update columns that actually exist in the 'projects' table
    const needsUpdate = 
      timelineMetrics.expectedEndDate.length >= 10 &&
      selectedProject.end_date !== timelineMetrics.expectedEndDate;

    if (needsUpdate) {
      /*
      console.log('[ProjectPhases] Syncing project end date:', {
        id: selectedProject.id,
        current: selectedProject.end_date,
        new: timelineMetrics.expectedEndDate,
      });
      */

      projectUpdateInProgressRef.current = true;
      updateProject.mutate({
        id: selectedProject.id,
        end_date: timelineMetrics.expectedEndDate,
        silent: true,
      }, {
        onSettled: () => {
          projectUpdateInProgressRef.current = false;
        }
      });
    }
  }, [selectedProject, timelineMetrics, updateProject]);

  const handleCalendarActivityClick = (activity: any) => {
    // console.log("Activity clicked:", activity);
  };

  const handleAutoSchedule = (params: {
    startDate: Date;
    area?: number;
    baseline?: number;
    saveScenario?: boolean;
    scenarioName?: string;
  }) => {
    autoScheduleActivities.mutate(params);
  };

  const handleSyncSchedule = async () => {
    if (!selectedProjectId) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase.rpc('sync_project_schedule', { _project_id: selectedProjectId });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project-activities", selectedProjectId] });
      toast({
        title: t("projectPhases.syncSuccessTitle"),
        description: t("projectPhases.syncSuccessMessage"),
      });
    } catch (error: any) {
      toast({
        title: t("common.errorTitle"),
        description: error?.message || t("projectPhases.syncErrorMessage"),
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGanttTaskEdit = async (task: MSProjectTask) => {
    if (!selectedProjectId) return;
    const activity = activities?.find(a => a.id === task.id);
    const phase = phases?.find(p => p.id === task.id);
    const wbsItem = wbsItems?.find(item => item.id === task.id);

    try {
      const bizDays = calculateBusinessDays(task.startDate, task.endDate);
      if (wbsItem) {
        await updateLinkedPhase.mutateAsync({
          wbsItemId: String(task.id),
          updates: {
            start_date: typeof task.startDate === 'string' ? task.startDate : formatDateLocal(task.startDate),
            end_date: typeof task.endDate === 'string' ? task.endDate : formatDateLocal(task.endDate),
            duration: bizDays,
          },
        });
        queryClient.invalidateQueries({ queryKey: ["project-wbs-items", selectedProjectId] });
      } else if (activity) {
        await updateActivity.mutateAsync({
          id: String(task.id),
          start_date: typeof task.startDate === 'string' ? task.startDate : formatDateLocal(task.startDate),
          end_date: typeof task.endDate === 'string' ? task.endDate : formatDateLocal(task.endDate),
          days_for_activity: bizDays,
        });
        queryClient.invalidateQueries({ queryKey: ["project-activities", selectedProjectId] });
      } else if (phase) {
        const oldStart = parseLocalDate((phase as any).start_date);
        const newStart = typeof task.startDate === 'string' ? parseLocalDate(task.startDate) : task.startDate;
        if (newStart && oldStart) {
          const daysDelta = differenceInDays(newStart, oldStart);
          const oldEndStr = (phase as any).end_date;
          const oldEnd = parseLocalDate(oldEndStr) || oldStart;
          const newEnd = addDays(oldEnd, daysDelta);
          await updatePhase.mutateAsync({
            id: String(task.id),
            updates: { start_date: formatDateLocal(newStart), end_date: formatDateLocal(newEnd) },
          });
        }
      }
      // toast({ title: t("common.success") });
    } catch (error: any) {
      // console.error('Failed to update task:', error);
    }
  };

  const msProjectTasks = useMemo(() => {
    if (!effectiveActivities || !effectivePhases) return [];
    const allItems = [
      ...effectivePhases.map(p => ({ ...p, isPhase: true, name: (p as any).phase_name || (p as any).name })),
      ...effectiveActivities.map(a => ({ ...a, isPhase: false }))
    ];
    const wbsItemsForTaskMap = isWbsProject && wbsItems ? wbsItems.map(item => ({
        id: item.id,
        name: item.name,
        phase_name: item.name,
        start_date: item.start_date || null,
        end_date: item.end_date || null,
        duration: item.duration || item.standard_duration_days || 0,
        days_for_activity: item.duration || item.standard_duration_days || 0,
        progress_percentage: item.progress_percentage || 0,
        completion_percentage: item.progress_percentage || 0,
        isPhase: item.item_type === 'phase',
        parent_id: item.parent_id || null,
        phase_id: item.parent_id || null,
        item_type: item.item_type,
        sort_order: item.sort_order,
    })) : [];

    const allItemsForTaskMap = [...allItems, ...wbsItemsForTaskMap.filter(w => !allItems.some(i => i.id === w.id))];
    const taskMap = new Map<string, MSProjectTask & { parentId?: string; sort_order?: number }>();
    
    allItemsForTaskMap.forEach(item => {
      if (!item || !item.id) return;
      let duration = item.days_for_activity || item.duration || (item as any).duration_days || 0;
      if (!duration && item.start_date && item.end_date) duration = calculateBusinessDays(item.start_date, item.end_date);
      const task: MSProjectTask & { parentId?: string; sort_order?: number } = {
        id: item.id,
        name: (item as any).name || (item as any).phase_name || 'Unnamed Task',
        startDate: (item as any).start_date || '',
        endDate: (item as any).end_date || '',
        duration: duration,
        progress: ((item as any).completion_percentage !== undefined ? (item as any).completion_percentage : (item as any).progress_percentage) || 0,
        status: calculateScheduleStatus(item as any),
        priority: item.isPhase ? 'high' : 'medium',
        category: item.isPhase ? 'Phase' : ((item as any).item_type === 'deliverable' ? 'Deliverable' : (item as any).item_type === 'work_package' ? 'Work Package' : 'Task'),
        subtasks: [],
        parentId: (item as any).phase_id || item.parent_id,
        sort_order: (item as any).sort_order !== undefined ? (item as any).sort_order : (item as any).sequence
      };
      taskMap.set(item.id, task);
    });

    const rootTasks: MSProjectTask[] = [];
    taskMap.forEach(task => {
      const parentId = task.parentId;
      if (!parentId) rootTasks.push(task);
      else if (taskMap.has(parentId)) {
        const parent = taskMap.get(parentId)!;
        parent.subtasks = parent.subtasks || [];
        if (parentId !== task.id && !parent.subtasks.some(s => s.id === task.id)) parent.subtasks.push(task);
      } else rootTasks.push(task);
    });

    const sortTasksRecursive = (tasks: MSProjectTask[]) => {
      tasks.sort((a, b) => {
        const orderA = (a as any).sort_order !== undefined ? (a as any).sort_order : 9999;
        const orderB = (b as any).sort_order !== undefined ? (b as any).sort_order : 9999;
        if (orderA !== orderB) return orderA - orderB;
        const dateA = parseLocalDate(a.startDate as string)?.getTime() || 0;
        const dateB = parseLocalDate(b.startDate as string)?.getTime() || 0;
        if (dateA !== dateB) return (dateA === 0 ? 1 : (dateB === 0 ? -1 : dateA - dateB));
        return a.name.localeCompare(b.name);
      });
      tasks.forEach(task => { if (task.subtasks && task.subtasks.length > 0) sortTasksRecursive(task.subtasks); });
    };

    const scheduleTasksRecursive = (tasks: MSProjectTask[], anchorStartDate: string, isRootLevel = false) => {

      let currentCursor = anchorStartDate;
      tasks.forEach(task => {
        // Root-level phases: always use currentCursor for sequential back-to-back scheduling
        if (isRootLevel || !task.startDate || task.startDate === '') task.startDate = currentCursor;
        if (task.subtasks && task.subtasks.length > 0) {
          scheduleTasksRecursive(task.subtasks, task.startDate as string, false);
          const endDates = task.subtasks.map(s => parseLocalDate(s.endDate as string)).filter((d): d is Date => d !== null);
          if (endDates.length > 0) {
            const maxEnd = new Date(Math.max(...endDates.map(d => d.getTime())));
            task.endDate = formatDateLocal(maxEnd);
            task.duration = calculateBusinessDays(task.startDate as string, task.endDate);
          }
        }
        if (!task.endDate || task.endDate === '') task.endDate = calculateEndDateFromBusinessDays(task.startDate as string, task.duration || 1);
        currentCursor = getNextWorkDay(task.endDate as string);
      });
    };

    const rollupTaskData = (task: MSProjectTask) => {
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach(rollupTaskData);
        const summary = calculateParentSummary(task.subtasks.map(t => ({
          id: String(t.id),
          start_date: typeof t.startDate === 'string' ? t.startDate : formatDateLocal(t.startDate),
          end_date: typeof t.endDate === 'string' ? t.endDate : formatDateLocal(t.endDate),
          duration: t.duration,
          completion_percentage: t.progress
        })));
        if (summary.startDate && summary.endDate) {
          task.startDate = formatDateLocal(summary.startDate);
          task.endDate = formatDateLocal(summary.endDate);
          task.duration = summary.duration;
          task.progress = summary.progress;
        }
      }
    };

    sortTasksRecursive(rootTasks);
    scheduleTasksRecursive(rootTasks, formatDateLocal(projectStartDate || new Date()), true);
    rootTasks.forEach(rollupTaskData);
    return rootTasks;
  }, [effectiveActivities, effectivePhases, isWbsProject, wbsItems, projectStartDate]);

  const professionalGanttPhases = useMemo(() => {
    const flattenTasks = (tasks: MSProjectTask[], level: number): any[] => {
      const result: any[] = [];
      tasks.forEach(task => {
        result.push({ id: String(task.id), name: task.name, startDate: task.startDate as string, endDate: task.endDate as string, duration: task.duration || 1, progress: task.progress, status: task.status, level: level });
        if (task.subtasks && task.subtasks.length > 0) result.push(...flattenTasks(task.subtasks, level + 1));
      });
      return result;
    };
    return msProjectTasks.map(phase => ({ id: String(phase.id), name: phase.name, startDate: phase.startDate as string, endDate: phase.endDate as string, progress: phase.progress, duration: phase.duration, tasks: flattenTasks(phase.subtasks || [], 1) }));
  }, [msProjectTasks]);

  useEffect(() => {
    if (!isInitialized) {
      if (propProjectId) setSelectedProjectId(propProjectId);
      else if (projectIdFromUrl) setSelectedProjectId(projectIdFromUrl);
      setIsInitialized(true);
    }
  }, [projectIdFromUrl, propProjectId, isInitialized]);

  useEffect(() => {
    if (!isWidget && isInitialized && selectedProjectId && selectedProjectId !== projectIdFromUrl) setSearchParams({ projectId: selectedProjectId }, { replace: true });
  }, [selectedProjectId, projectIdFromUrl, setSearchParams, isInitialized, isWidget]);

  // When Gantt view is shown or project changes, scroll chart to Today and current week task once after layout
  useEffect(() => {
    if (scheduleView !== "gantt-new" || !selectedProjectId || !professionalGanttPhases?.length) return
    const id = setTimeout(() => {
      (ganttRef.current as { scrollToToday?: () => void } | null)?.scrollToToday?.()
    }, 800)
    return () => clearTimeout(id)
  }, [scheduleView, selectedProjectId, professionalGanttPhases?.length])

  if (projectsLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {!isWidget && (
        <div className="flex-shrink-0">
          <SidebarHeaderShell variant="default">
            <div className="flex items-center justify-between py-2">
              <div>
                <h1 className="text-xl font-bold tracking-tight">{t("projectPhases.title")}</h1>
                <p className="text-xs text-muted-foreground">{t("projectPhases.subtitleExtended")}</p>
              </div>
            </div>
          </SidebarHeaderShell>
        </div>
      )}

      <div className="flex-1 overflow-clip p-4 md:px-6 md:pb-6 pt-0 md:pt-0 flex flex-col gap-4 min-h-0">
        {!isWidget && (
          <Card className="flex-shrink-0 shadow-sm border-muted/40">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 max-w-sm">
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder={t("projectPhases.selectProjectPlaceholder")} /></SelectTrigger>
                    <SelectContent>{projects?.map((project) => (<SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                {selectedProjectId && (
                  <div className="flex gap-1.5 ml-auto flex-wrap">
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="secondary" size="sm" className="h-9" disabled={isSyncing || activitiesLoading}>{isSyncing ? t("projectPhases.syncWorking") : t("projectPhases.sync")}</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>{t("projectPhases.syncConfirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("projectPhases.syncConfirmDescription")}</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>{t("projectPhases.syncCancel")}</AlertDialogCancel><AlertDialogAction onClick={handleSyncSchedule} disabled={isSyncing || activitiesLoading}>{t("projectPhases.syncConfirm")}</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button onClick={handleExportCsv} variant="secondary" size="sm" className="h-9">{t("projectPhases.csv.export")}</Button>
                    {canEdit && (
                      <>
                        <Button onClick={() => setIsCsvImportOpen(true)} variant="secondary" size="sm" className="h-9">{t("projectPhases.csv.import")}</Button>
                        <Button onClick={() => setIsImportOpen(true)} variant="secondary" size="sm" className="h-9">{t("projectPhases.import")}</Button>
                        <Button onClick={() => setIsCreateFromTemplateOpen(true)} variant="secondary" size="sm" className="h-9">{t("projectPhases.template")}</Button>
                        {isWbsProject && (
                          <>
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button onClick={handleInitializeSchedule} variant="secondary" size="sm" className="h-9" disabled={initializeScheduleDates.isPending || deleteAllPhases.isPending}>{initializeScheduleDates.isPending || deleteAllPhases.isPending ? t("projectPhases.initializingSchedule") : t("projectPhases.initSchedule")}</Button></TooltipTrigger><TooltipContent side="bottom" className="max-w-xs"><p>{t("projectPhases.initScheduleTooltip")}</p></TooltipContent></Tooltip></TooltipProvider>
                            {originalTemplateId && (
                              <AlertDialog>
                                <TooltipProvider><Tooltip><TooltipTrigger asChild><AlertDialogTrigger asChild><Button variant="secondary" size="sm" className="h-9" disabled={rebuildSchedule.isPending}>{rebuildSchedule.isPending ? t("projectPhases.rebuildingSchedule") : t("projectPhases.rebuildSchedule")}</Button></AlertDialogTrigger></TooltipTrigger><TooltipContent side="bottom" className="max-w-xs"><p>{t("projectPhases.rebuildScheduleTooltip")}</p></TooltipContent></Tooltip></TooltipProvider>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>{t("projectPhases.rebuildScheduleConfirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("projectPhases.rebuildScheduleConfirmDescription")}</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter><AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => rebuildSchedule.mutate(originalTemplateId)} disabled={rebuildSchedule.isPending}>{t("common.confirm")}</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!selectedProjectId && !isWidget && (
          <Card className="flex-shrink-0">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Layers className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">{t("projectPhases.selectProjectTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("projectPhases.selectProjectDesc")}</p>
            </CardContent>
          </Card>
        )}

        {selectedProjectId && (
          <div className="flex-1 flex flex-col min-h-0">
            {phasesLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as any)}
                variant="pill"
                className={activeTab === 'schedule' ? "w-full flex-1 flex flex-col min-h-0" : "w-full"}
              >
                <div className="flex-shrink-0">
                  <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden">
                    <TabsTrigger value="schedule">{t("projectPhases.tabs.schedule")}</TabsTrigger>
                    <TabsTrigger value="baseline">{t("projectPhases.tabs.baseline")}</TabsTrigger>
                    <TabsTrigger value="milestones">{t("projectPhases.milestones")}</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="schedule" className="mt-2 flex-1 flex flex-col min-h-0 space-y-6">
                  {(phases && phases.length > 0) ? (
                    <>
                      <div className="flex-shrink-0 flex flex-wrap gap-2">
                        <Button variant={scheduleView === "calendar" ? "default" : "outline"} onClick={() => setScheduleView("calendar")}><CalendarRange className="mr-2 h-4 w-4" />{t("projectPhases.scheduleViews.calendarActivities")}</Button>
                        <Button variant={scheduleView === "list" ? "default" : "outline"} onClick={() => setScheduleView("list")}><List className="mr-2 h-4 w-4" />{t("projectPhases.scheduleViews.list")}</Button>
                        <Button variant={scheduleView === "gantt" ? "default" : "outline"} onClick={() => setScheduleView("gantt")} disabled={!effectiveActivities || effectiveActivities.length === 0} className="hidden"><BarChart3 className="mr-2 h-4 w-4" />{t("projectPhases.gantt")}</Button>
                        <Button variant={scheduleView === "gantt-new" ? "default" : "outline"} onClick={() => setScheduleView("gantt-new")} disabled={!effectiveActivities || effectiveActivities.length === 0} className="relative"><Zap className="mr-2 h-4 w-4" />{t("projectPhases.ganttNew")}</Button>
                      </div>
                      {(!effectiveActivities || effectiveActivities.length === 0) && (
                        <Card className="flex-shrink-0">
                          <CardContent className="flex flex-col items-center justify-center py-12">
                            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium">{t("projectPhases.noActivitiesFound")}</p>
                            <p className="text-sm text-muted-foreground mb-4">{t("projectPhases.initializeActivitiesDesc")}</p>
                            {canEdit && (
                              <Button onClick={handleInitializeSchedule} disabled={initializeScheduleDates.isPending || deleteAllPhases.isPending}>
                                {initializeScheduleDates.isPending || deleteAllPhases.isPending ? t("projectPhases.initializingSchedule") : t("projectPhases.initSchedule")}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      )}
                      {scheduleView === "calendar" && (<div className="flex-1 min-h-0"><ActivityCalendar projectId={selectedProjectId} hideProjectSelector forceModeType="single" onActivityClick={handleCalendarActivityClick} customActivities={effectiveActivities} /></div>)}
                      {scheduleView === "list" && (
                        <div className="flex-1 flex flex-col min-h-0 space-y-6">
                          {effectiveActivities && effectiveActivities.length > 0 && (
                            <div className="flex-shrink-0">
                              <TimelineSummary 
                                totalDuration={summaryMetrics.totalDuration} 
                                completionPercentage={summaryMetrics.completionPercentage} 
                                expectedEndDate={summaryMetrics.expectedEndDate} 
                                startDate={summaryMetrics.startDate}
                                endDate={summaryMetrics.endDate}
                                daysRemaining={summaryMetrics.daysRemaining} 
                                scheduleHealth={projectScheduleHealth} 
                              />
                              <div className="flex gap-2 mt-4">
                                <AutoScheduleButton projectStartDate={selectedProject?.start_date} projectArea={selectedProject?.total_area} onAutoSchedule={handleAutoSchedule} disabled={effectiveActivities.length === 0} />
                              </div>
                            </div>
                          )}
                          <div className="flex-1 min-h-0">
                            <ProjectPlanView 
  projectId={selectedProjectId} 
  canEdit={canEdit} 
  projectBudget={(selectedProject as any)?.budget_total || 0} 
  project={selectedProject || undefined} 
  phases={phases} 
  activities={effectiveActivities} 
  onBulkDeletePhases={isWbsProject ? (ids) => bulkDeleteWbsPhases.mutateAsync(ids) : undefined} 
  onStartTask={handleStartTask} 
  onCompleteTask={handleCompleteTask}
  onUpdatePhase={isWbsProject ? handleUpdatePhaseForWbs : undefined}
  onUpdateActivity={isWbsProject ? handleUpdateActivityForWbs : undefined}
/>
                          </div>
                        </div>
                      )}
                      {scheduleView === "gantt" && msProjectTasks.length > 0 && selectedProject && (
                        <div className="flex-1 min-h-0 flex flex-col">
                          <MicrosoftProjectLike 
                            title={t("projectPhases.ganttTitle", { projectName: selectedProject.name })} 
                            tasks={msProjectTasks} 
                            onTaskClick={(task) => { /* console.log('Task clicked:', task) */ }} 
                            onTaskEdit={handleGanttTaskEdit} 
                            showCriticalPath 
                            showResources={false} 
                            showMilestones={false} 
                            showDependencies 
                            collapsible 
                            showWorkingDaysMode={true} 
                            projectCalendar={projectCalendar} 
                            className="flex-1" 
                          />
                        </div>
                      )}
                      {scheduleView === "gantt-new" && professionalGanttPhases.length > 0 && selectedProject && (
                        <div className="flex-1 min-h-0 flex flex-col max-h-[calc(100vh-12rem)] overflow-clip">
                          <ProfessionalGanttChart
                            title={t("projectPhases.ganttTitle", { projectName: selectedProject.name })}
                            description={t("projectPhases.ganttDescription", { phaseCount: professionalGanttPhases.length, activityCount: professionalGanttPhases.reduce((acc, p) => acc + p.tasks.length, 0) })} 
                            phases={professionalGanttPhases} 
                            onTaskClick={(task) => { /* console.log('[Schedule Tab Gantt] Task clicked:', task) */ }} 
                            onTaskUpdate={(taskId, updates) => { 
                              const activity = effectiveActivities?.find(a => a.id === taskId); 
                              const phase = effectivePhases?.find(p => p.id === taskId); 
                              const wbsItem = wbsItems?.find(w => w.id === taskId); 
                              if (activity) { 
                                handleGanttTaskEdit({ 
                                  id: taskId, 
                                  startDate: updates.startDate, 
                                  endDate: updates.endDate, 
                                  duration: updates.duration, 
                                  name: activity.name, 
                                  progress: activity.completion_percentage || 0, 
                                  status: activity.completion_percentage === 100 ? 'completed' : (activity.completion_percentage > 0 ? 'in_progress' : 'not_started') 
                                } as MSProjectTask); 
                              } else if (phase || wbsItem) { 
                                handleGanttTaskEdit({ 
                                  id: taskId, 
                                  startDate: updates.startDate, 
                                  endDate: updates.endDate, 
                                  duration: updates.duration, 
                                  name: (phase as any)?.phase_name || (wbsItem as any)?.name || 'Unknown', 
                                  progress: (phase as any)?.progress_percentage || (wbsItem as any)?.progress_percentage || 0, 
                                  status: 'in_progress' 
                                } as MSProjectTask); 
                              } 
                            }} 
                            ref={ganttRef} 
                            initialZoom="week" 
                            projectCalendar={projectCalendar} 
                            className="flex-1"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">{t("projectPhases.noPhasesFound")}</p>
                        <p className="text-sm text-muted-foreground mb-4">{t("projectPhases.noPhasesDesc")}</p>
                        {canEdit && (
                          <div className="flex gap-2">
                            <Button onClick={() => setIsImportOpen(true)} variant="outline">{t("projectPhases.import")}</Button>
                            <Button onClick={() => setIsCreateFromTemplateOpen(true)}>{t("projectPhases.template")}</Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="baseline" className="mt-2 overflow-auto"><ScheduleScenariosPanel projectId={selectedProjectId} /></TabsContent>
                <TabsContent value="milestones" className="mt-2 space-y-4">
                  {milestones && <MilestoneSummaryCards milestones={milestones} />}
                  {milestones && (
                    <MilestoneReport
                      milestones={milestones}
                      onSendNotifications={() => sendMilestoneNotifications.mutateAsync()}
                      canEdit={canEdit}
                    />
                  )}
                  {selectedProjectId && canEdit && (
                    <MilestoneEntryTable
                      projectId={selectedProjectId}
                      phases={milestonePhases}
                      milestones={milestones || []}
                      onCreateMilestone={createMilestone.mutateAsync}
                      onUpdateMilestone={updateMilestone.mutateAsync}
                      onDeleteMilestone={deleteMilestone.mutateAsync}
                      isCreating={createMilestone.isPending}
                    />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={isCsvImportOpen}
        onOpenChange={(open) => {
          setIsCsvImportOpen(open);
          if (!open) setCsvImportFile(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("projectPhases.csv.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("projectPhases.csv.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("projectPhases.csv.instructions")}</p>
            <div className="rounded-md border p-2 text-xs text-muted-foreground">
              <span className="font-medium">{t("projectPhases.csv.headersLabel")}</span> {csvHeaderLabels}
            </div>
            <Input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setCsvImportFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCsvImportOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCsvImport} disabled={!csvImportFile || isCsvImporting}>
              {isCsvImporting ? t("projectPhases.csv.importing") : t("projectPhases.csv.importAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateFromTemplateDialog open={isCreateFromTemplateOpen} onOpenChange={setIsCreateFromTemplateOpen} />
      <PhasesImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} projectId={selectedProjectId} projectBudget={(selectedProject as any)?.budget_total || 0} />
    </div>
  );
};

export default ProjectPhases;
