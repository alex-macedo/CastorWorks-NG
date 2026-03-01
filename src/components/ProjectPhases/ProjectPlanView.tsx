import { useState, Fragment, useCallback, useMemo, useEffect, useRef, ReactNode } from "react";
import { ChevronRight, ChevronDown, Plus, GripVertical, Trash2, Network, Zap, ArrowUpDown, ArrowUp, ArrowDown, X, Calendar as CalendarIcon, Maximize2, Minimize2, Play as PlayIcon, Check as CheckIcon, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/DateInput";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { useProjectActivities } from "@/hooks/useProjectActivities";
import { useRouteTranslations } from "@/hooks/useRouteTranslations";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { formatDate } from "@/utils/reportFormatters";
import { 
  parseLocalDate, 
  formatDateLocal, 
  calculateCalendarDuration, 
  calculateParentSummary,
  calculateBusinessDays,
  calculateEndDateFromBusinessDays,
  getNextWorkDay,
  performProjectScheduling
} from "@/utils/scheduleCalculators";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DependencyDialog } from "./DependencyDialog";
import { calculateDependencyDates, getDependencyLabel } from "@/utils/dependencyCalculator";
import { ViewTemplateManager } from "./ViewTemplateManager";
import { ViewTemplateInput } from "@/hooks/useViewTemplates";
import { ProjectPlanFilters } from "./ProjectPlanFilters";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { ProjectWithSchedule } from "@/types/projects";

interface ProjectPlanViewProps {
  projectId: string;
  canEdit: boolean;
  projectBudget: number;
  project?: ProjectWithSchedule | null;
  phases?: any[];
  activities?: any[];
  onBulkDeletePhases?: (ids: string[]) => Promise<void>;
  onStartTask?: (activityId: string, isWbsItem?: boolean) => Promise<void>;
  onCompleteTask?: (activityId: string, isWbsItem?: boolean) => Promise<void>;
  onCollapsePhase?: (phaseId: string) => void;
  /** Optional: when provided (e.g. for WBS projects), used instead of updatePhase for phase edits */
  onUpdatePhase?: (id: string, updates: Record<string, unknown>) => Promise<void>;
  /** Optional: when provided (e.g. for WBS projects), used instead of updateActivity for activity edits */
  onUpdateActivity?: (id: string, updates: Record<string, unknown>) => Promise<void>;
}

interface SortablePhaseRowProps {
  phase: any;
  phaseActivities: any[];
  isExpanded: boolean;
  canEdit: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onAddActivity: () => void;
  onDelete: () => void;
  onSelect: (checked: boolean) => void;
  onEdit?: () => void;
  onMarkAllStarted?: () => void;
  onMarkAllCompleted?: () => void;
  hasStartableTasks?: boolean;
  hasCompletableTasks?: boolean;
  rowIndex: number;
  renderCell: (params: CellRenderProps) => React.ReactNode;
}

const getWorkloadClass = (count: number) => {
  if (count === 0) return "bg-muted text-muted-foreground";
  if (count < 5) return "bg-success/20 text-success-foreground";
  if (count <= 10) return "bg-warning/20 text-warning-foreground";
  return "bg-destructive/20 text-destructive-foreground";
};

interface SortableActivityRowProps {
  activity: any;
  activityDuration: number;
  canEdit: boolean;
  onDelete: () => void;
  onManageDependencies: () => void;
  onStartTask?: (activityId: string) => void;
  onCompleteTask?: (activityId: string) => void;
  onEdit?: () => void;
  rowIndex: number;
  renderCell: (params: CellRenderProps) => React.ReactNode;
  phases?: any[];
  onAssignPhase?: (activityId: string, phaseId: string) => void;
  level?: number;
}

type CellInputType = 'text' | 'number' | 'date' | 'select' | 'currency';

interface CellRenderProps {
  id: string;
  field: string;
  value: any;
  type: 'phase' | 'activity';
  rowIndex: number;
  colIndex: number;
  inputType?: CellInputType;
  isCalculated?: boolean;
}

interface CellPosition extends CellRenderProps {
  inputType: CellInputType;
  isCalculated: boolean;
  editable: boolean;
}

const NUMERIC_CONSTRAINTS: Record<string, { min?: number; max?: number; step?: number }> = {
  progress_percentage: { min: 0, max: 100, step: 1 },
  completion_percentage: { min: 0, max: 100, step: 1 },
  budget_allocated: { min: 0, step: 0.01 },
  budget_spent: { min: 0, step: 0.01 },
};

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
};

function computeRowIndices(phases: any[], activities: any[]) {
  const indices = new Map<string, number>(); let cursor = 0;
  const walk = (parentId: string | null) => {
    if (parentId === null) {
      phases.forEach(phase => { indices.set(phase.id, cursor++); walk(phase.id); });
    } else {
      const children = activities.filter(a => a.phase_id === parentId).sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      children.forEach(child => { indices.set(child.id, cursor++); walk(child.id); });
    }
  };
  walk(null); return indices;
}

function SortablePhaseRow({ phase, phaseActivities, isExpanded, canEdit, isSelected, onToggle, onAddActivity, onDelete, onSelect, onEdit, onMarkAllStarted, onMarkAllCompleted, hasStartableTasks, hasCompletableTasks, renderCell, rowIndex }: SortablePhaseRowProps) {
  const { t } = useLocalization();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: phase.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <tr ref={setNodeRef} style={style} className="border-b bg-muted/20 hover:bg-muted/30 transition-colors">
      {canEdit && <td className="p-2 w-8"><Checkbox checked={isSelected} onCheckedChange={onSelect} onClick={(e) => e.stopPropagation()} /></td>}
      <td className="p-2 w-8"><Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onToggle}>{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</Button></td>
      <td className="p-2 max-w-[160px]"><div className="flex items-center gap-1.5 font-medium min-w-0">{canEdit && <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing shrink-0"><GripVertical className="h-4 w-4 text-muted-foreground" /></div>}<div className="flex items-center gap-1.5 min-w-0 flex-1">{renderCell({ id: phase.id, field: 'phase_name', value: phase.phase_name, type: 'phase', rowIndex, colIndex: 0, inputType: 'text', isCalculated: false })}<Badge variant="outline" className={`gap-1 h-5 shrink-0 ${getWorkloadClass(phaseActivities.length)}`}><span className="text-xs font-medium">{phaseActivities.length}</span></Badge></div></div></td>
      <td className="p-2 w-28">{renderCell({ id: phase.id, field: 'start_date', value: phase.start_date, type: 'phase', rowIndex, colIndex: 1, inputType: 'date', isCalculated: false })}</td>
      <td className="p-2 text-muted-foreground text-sm w-20">{phase.duration || 0} days</td>
      <td className="p-2 w-28">{renderCell({ id: phase.id, field: 'end_date', value: phase.end_date, type: 'phase', rowIndex, colIndex: 2, inputType: 'date', isCalculated: false })}</td>
      <td className="p-2 w-32">{renderCell({ id: phase.id, field: 'progress_percentage', value: phase.progress_percentage, type: 'phase', rowIndex, colIndex: 3, inputType: 'number', isCalculated: false })}</td>
      <td className="p-2 w-24">{renderCell({ id: phase.id, field: 'status', value: phase.status, type: 'phase', rowIndex, colIndex: 4, inputType: 'select', isCalculated: false })}</td>
      {canEdit && <td className="p-2"><div className="flex items-center gap-1">{phaseActivities.length > 0 && hasStartableTasks && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 px-2" onClick={onMarkAllStarted} title={t('projectPhases:phase.markAllStarted') || 'Mark all tasks as started'}><PlayIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>{t('projectPhases:phase.markAllStarted') || 'Mark all tasks as started'}</p></TooltipContent></Tooltip></TooltipProvider>}{phaseActivities.length > 0 && hasCompletableTasks && <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-8 px-2 text-green-600 hover:text-green-700" onClick={onMarkAllCompleted} title={t('projectPhases:phase.markAllCompleted') || 'Mark all tasks as completed'}><CheckIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>{t('projectPhases:phase.markAllCompleted') || 'Mark all tasks as completed'}</p></TooltipContent></Tooltip></TooltipProvider>}<Button variant="ghost" size="sm" className="h-8 px-2" onClick={onEdit} title="Edit phase"><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="sm" className="h-8 px-2" onClick={onAddActivity}><Plus className="h-4 w-4" /></Button><Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button></div></td>}
    </tr>
  );
}

function SortableActivityRow({ activity, activityDuration, canEdit, onDelete, onManageDependencies, onStartTask, onCompleteTask, onEdit, renderCell, phases, onAssignPhase, rowIndex, level = 1 }: SortableActivityRowProps) {
  const { t } = useLocalization();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const hasDeps = activity.dependencies?.length > 0;
  const isCrit = activity.is_critical;
  
  const getVar = (s?: string) => {
    if (s === 'in_progress') return 'default';
    if (s === 'completed') return 'success';
    if (s === 'blocked') return 'destructive';
    if (s === 'delayed') return 'destructive';
    return 'secondary';
  };
  
  const getLab = (s?: string) => {
    const status = s || 'pending';
    // Use projectPhases namespace for activities
    const translation = t(`projectPhases:statusLabels.${status}`);
    // If translation fails (returns key), fallback to manual map
    if (!translation || translation.includes('statusLabels.')) {
      const m: any = { 
        pending: 'Pending', 
        not_started: 'Not Started', 
        in_progress: 'In Progress', 
        completed: 'Completed', 
        blocked: 'Blocked' 
      };
      return m[status] || status;
    }
    return translation;
  };

  return (
    <tr ref={setNodeRef} style={style} className={`border-b hover:bg-muted/10 transition-colors ${isCrit ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}>
      {canEdit && <td className="p-2 w-8"></td>}<td className="p-2 w-8"></td>
      <td className="p-2 max-w-[140px]"><div className="flex items-center gap-1.5 min-w-0" style={{ paddingLeft: `${level * 1.5}rem` }}>{canEdit && <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing shrink-0"><GripVertical className="h-3 w-3 text-muted-foreground" /></div>}{isCrit && <TooltipProvider><Tooltip><TooltipTrigger asChild><Zap className="h-3.5 w-3.5 text-red-500 fill-red-500" /></TooltipTrigger><TooltipContent><p>{t("projectPhases:columns.critical") || "Critical"}</p></TooltipContent></Tooltip></TooltipProvider>}<span className="text-muted-foreground text-xs mr-1">#{activity.sequence}</span><Badge variant={getVar(activity.status)}>{getLab(activity.status)}</Badge><div className="min-w-0 flex-1">{renderCell({ id: activity.id, field: 'name', value: activity.name, type: 'activity', rowIndex, colIndex: 0, inputType: 'text', isCalculated: false })}</div></div></td>
      <td className="p-2 w-28">{renderCell({ id: activity.id, field: 'start_date', value: activity.start_date, type: 'activity', rowIndex, colIndex: 1, inputType: 'date', isCalculated: false })}</td>
      <td className="p-2 text-muted-foreground text-sm w-20">{activityDuration} days</td>
      <td className="p-2 w-28">{renderCell({ id: activity.id, field: 'end_date', value: activity.end_date, type: 'activity', rowIndex, colIndex: 2, inputType: 'date', isCalculated: false })}</td>
      <td className="p-2 w-40"><div className="space-y-1"><div className="w-full bg-muted rounded-full h-2"><div className={`h-full rounded-full transition-all ${activity.completion_percentage >= 75 ? 'bg-green-500' : (activity.completion_percentage >= 25 ? 'bg-yellow-500' : 'bg-red-500')}`} style={{ width: `${Math.min(activity.completion_percentage || 0, 100)}%` }} /></div><div className="flex items-center gap-2"><div className="flex-1">{renderCell({ id: activity.id, field: 'completion_percentage', value: activity.completion_percentage || 0, type: 'activity', rowIndex, colIndex: 3, inputType: 'number', isCalculated: false })}</div><span className="text-xs text-muted-foreground">{activity.completion_percentage || 0}%</span></div></div></td>
      <td className="p-2 w-56">{phases && onAssignPhase ? <Select value={activity.phase_id || "unassigned"} onValueChange={(v) => { if (v !== "unassigned") onAssignPhase(activity.id, v); }}><SelectTrigger className="h-7 w-full"><SelectValue placeholder={t("projectPhases:bulkActions.updateStatus") || "Assign"} /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{phases.map((p) => <SelectItem key={p.id} value={p.id}>{p.phase_name}</SelectItem>)}</SelectContent></Select> : <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant={hasDeps ? "default" : "ghost"} size="sm" className="h-7 px-2" onClick={onManageDependencies}><Network className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent><div className="space-y-1">{hasDeps ? <>{activity.dependencies.map((d: any, i: number) => <p key={i} className="text-xs">{getDependencyLabel(d.type, d.lag)}</p>)}</> : <p>{t("projectPhases:columns.dependencies") || "None"}</p>}</div></TooltipContent></Tooltip></TooltipProvider>}</td>
      {canEdit && <td className="p-2"><div className="flex items-center gap-1">{(!activity.status || activity.status === 'pending' || activity.status === 'not_started') && <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onStartTask?.(activity.id)} title={t('projectPhases:activity.startTask') || 'Start task'}><PlayIcon className="h-4 w-4" /></Button>}{activity.status === 'in_progress' && <Button variant="ghost" size="sm" className="h-8 px-2 text-green-600 hover:text-green-700" onClick={() => onCompleteTask?.(activity.id)} title={t('projectPhases:activity.completeTask') || 'Complete task'}><CheckIcon className="h-4 w-4" /></Button>}<Button variant="ghost" size="sm" className="h-8 px-2" onClick={onEdit} title={t('projectPhases:activity.editTask') || 'Edit task'}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button></div></td>}
    </tr>
  );
}

function RecursiveActivityRows({ activities, allActivities, level, canEdit, setDeleteDialog, setDependencyDialog, renderCell, phases, onAssignPhase, onStartTask, onCompleteTask, onEditActivity, rowIndices }: { activities: any[]; allActivities: any[]; level: number; canEdit: boolean; setDeleteDialog: (v: any) => void; setDependencyDialog: (v: any) => void; renderCell: (p: CellRenderProps) => React.ReactNode; phases: any[]; onAssignPhase: (aid: string, pid: string) => void; onStartTask?: (aid: string) => void; onCompleteTask?: (aid: string) => void; onEditActivity?: (activity: any) => void; rowIndices: Map<string, number>; }) {
  return (
    <SortableContext items={activities.map(a => a.id)} strategy={verticalListSortingStrategy}>
      {activities.map((act) => {
        const dur = act.days_for_activity || calculateCalendarDuration(act.start_date, act.end_date);
        const idx = rowIndices.get(act.id) ?? 0;
        const kids = allActivities.filter(a => a.phase_id === act.id).sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        return (
          <Fragment key={act.id}>
            <SortableActivityRow key={act.id} activity={act} activityDuration={dur} canEdit={canEdit} onDelete={() => setDeleteDialog({ id: act.id, type: 'activity', name: act.name })} onManageDependencies={() => setDependencyDialog({ open: true, activity: act })} onStartTask={onStartTask} onCompleteTask={onCompleteTask} onEdit={() => onEditActivity?.(act)} renderCell={renderCell} rowIndex={idx} phases={phases} onAssignPhase={onAssignPhase} level={level} />
            {kids.length > 0 && <RecursiveActivityRows activities={kids} allActivities={allActivities} level={level + 1} canEdit={canEdit} setDeleteDialog={setDeleteDialog} setDependencyDialog={setDependencyDialog} renderCell={renderCell} rowIndices={rowIndices} phases={phases} onAssignPhase={onAssignPhase} onStartTask={onStartTask} onCompleteTask={onCompleteTask} onEditActivity={onEditActivity} />}
          </Fragment>
        );
      })}
    </SortableContext>
  );
}

export function ProjectPlanView({ projectId, canEdit, projectBudget, project, phases: phasesProp, activities: activitiesProp, onBulkDeletePhases, onStartTask: onStartTaskProp, onCompleteTask: onCompleteTaskProp, onUpdatePhase: onUpdatePhaseProp, onUpdateActivity: onUpdateActivityProp }: ProjectPlanViewProps) {
  useRouteTranslations(); const { t } = useLocalization(); const queryClient = useQueryClient();
  const { phases: phasesFromHook, updatePhase, deletePhase, bulkDeletePhases, reorderPhases } = useProjectPhases(projectId);
  const { activities: activitiesFromHook, createActivity, updateActivity, deleteActivity } = useProjectActivities(projectId);
  const phases = phasesProp || phasesFromHook; const activities = activitiesProp || activitiesFromHook;
  
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [editValue, setEditValue] = useState("");
  const [activeCell, setActiveCell] = useState<CellPosition | null>(null);
  const [copiedCell, setCopiedCell] = useState<CellPosition | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState<CellPosition | null>(null);
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; type: 'phase' | 'activity'; name: string } | null>(null);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [selectedPhases, setSelectedPhases] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [phaseOrder, setPhaseOrder] = useState<string[]>([]);
  const [dependencyDialog, setDependencyDialog] = useState<{ open: boolean; activity: any | null }>({ open: false, activity: null });
  const [editingItem, setEditingItem] = useState<{ type: 'phase' | 'activity'; item: any } | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const rowStructureRef = useRef<CellPosition[][]>([]);
  const autoScheduleAppliedRef = useRef(false);
  const syncInProgressRef = useRef(false);

  const [currentFilters, setCurrentFilters] = useState({ status: [] as string[], progressMin: null as number | null, progressMax: null as number | null, startDateFrom: '', startDateTo: '', endDateFrom: '', endDateTo: '' });
  const [currentSort, setCurrentSort] = useState<{ field?: string; direction?: 'asc' | 'desc' }>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(["name", "start_date", "duration", "end_date", "progress", "dependencies", "actions"]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  rowStructureRef.current = [];

  const isSameCell = useCallback((a?: any | null, b?: any | null) => a?.id === b?.id && a?.field === b?.field && a?.type === b?.type, []);
  
  const findCellInStructure = useCallback((c: any | null) => { if (!c) return null; for (const r of rowStructureRef.current) { if (!r) continue; for (const cand of r) { if (cand && isSameCell(cand, c)) return cand; } } return null; }, [isSameCell]);

  const calculatePhaseStatus = useCallback((pa: any[]) => {
    if (!pa?.length) return 'not_started';
    if (pa.every(a => a.completion_percentage === 100)) return 'completed';
    if (pa.some(a => (a.completion_percentage > 0 && a.completion_percentage < 100) || a.status === 'in_progress')) return 'in_progress';
    if (pa.some(a => a.end_date && new Date(a.end_date) < new Date() && a.completion_percentage < 100)) return 'delayed';
    return 'not_started';
  }, []);

  const calculatePhaseProgress = useCallback((pa: any[]) => { if (!pa?.length) return 0; const tp = pa.reduce((s, a) => s + (a.completion_percentage || 0), 0); return Math.round(tp / pa.length); }, []);

  const calculatePhaseStartDate = useCallback((pa: any[]) => {
    if (!pa?.length) return null;
    const ds = pa.map(a => a.start_date).filter(Boolean).map(d => parseLocalDate(d)).filter((d): d is Date => d !== null);
    return ds.length ? new Date(Math.min(...ds.map(d => d.getTime()))) : null;
  }, []);

  const calculatePhaseEndDate = useCallback((pa: any[]) => {
    if (!pa?.length) return null;
    const ds = pa.map(a => a.end_date).filter(Boolean).map(d => parseLocalDate(d)).filter((d): d is Date => d !== null);
    return ds.length ? new Date(Math.max(...ds.map(d => d.getTime()))) : null;
  }, []);

  const getNumericConstraints = useCallback((f: string) => NUMERIC_CONSTRAINTS[f] || {}, []);
  const getCellKey = useCallback((cell: any) => `${cell.type}-${cell.id}-${cell.field}`, []);
  const getCellRecord = useCallback((c: any) => c?.type === 'phase' ? phases?.find(p => p.id === c.id) : activities?.find(a => a.id === c.id), [phases, activities]);

  const togglePhase = useCallback((id: string) => setExpandedPhases(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);

  const handleLoadTemplate = useCallback((tem: any) => { 
    setCurrentFilters(tem.filters || { status: [], progressMin: null, progressMax: null, startDateFrom: '', startDateTo: '', endDateFrom: '', endDateTo: '' }); 
    setCurrentSort(tem.sort_config || {}); 
    setVisibleColumns(tem.visible_columns || []); 
    setSelectedPhases(new Set()); 
  }, []);

  const handleSelectPhase = useCallback((id: string, c: boolean) => setSelectedPhases(prev => { const n = new Set(prev); if (c) n.add(id); else n.delete(id); return n; }), []);

  const handleBulkDelete = useCallback(async () => { 
    const ids = Array.from(selectedPhases); 
    try { if (onBulkDeletePhases) await onBulkDeletePhases(ids); else await bulkDeletePhases.mutateAsync(ids); setSelectedPhases(new Set()); setBulkDeleteDialog(false); } catch (e) { /* error ignored */ } 
  }, [selectedPhases, bulkDeletePhases, onBulkDeletePhases]);

  const handleAddActivity = async (pid: string) => { 
    if (!canEdit) return; const max = activities?.length ? Math.max(...activities.map(a => a.sequence || 0)) : 0; 
    try { await createActivity.mutateAsync({ project_id: projectId, phase_id: pid, name: "New Activity", sequence: max + 1, days_for_activity: 1, completion_percentage: 0 }); setExpandedPhases(prev => new Set([...prev, pid])); } catch (e) { /* error ignored */ } 
  };

  const handleAssignPhase = async (aid: string, pid: string) => { 
    if (!canEdit) return; try { await updateActivity.mutateAsync({ id: aid, phase_id: pid }); toast.success("Activity assigned successfully"); } catch (e) { /* error ignored */ } 
  };

  const handleStartTask = useCallback(async (id: string) => {
    // Find the activity to check if it's a WBS item
    const activity = activities?.find(a => a.id === id);
    const isWbsItem = activity?.metadata?.isWbsItem === true;
    
    try {
      if (onStartTaskProp) {
        // Use the provided handler (handles both WBS items and regular activities)
        await onStartTaskProp(id, isWbsItem);
      } else {
        // Fallback to regular activity update
        await updateActivity.mutateAsync({ id, status: 'in_progress' });
      }
      toast.success(t('projectPhases:activity.startedSuccessfully') || 'Task started successfully');
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [activities, onStartTaskProp, updateActivity, t]);

  const handleCompleteTask = useCallback(async (id: string) => {
    // Find the activity to check if it's a WBS item
    const activity = activities?.find(a => a.id === id);
    const isWbsItem = activity?.metadata?.isWbsItem === true;
    
    try {
      if (onCompleteTaskProp) {
        // Use the provided handler (handles both WBS items and regular activities)
        await onCompleteTaskProp(id, isWbsItem);
      } else {
        // Fallback to regular activity update
        await updateActivity.mutateAsync({ id, status: 'completed', completion_percentage: 100 });
      }
      toast.success(t('projectPhases:activity.completedSuccessfully') || 'Task completed successfully');
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [activities, onCompleteTaskProp, updateActivity, t]);

  const collectActivityIdsUnderPhase = useCallback((phaseId: string, allActivities: any[]): string[] => {
    const result: string[] = [];
    const direct = allActivities.filter((a: any) => a.phase_id === phaseId);
    direct.forEach((a: any) => {
      result.push(a.id);
      result.push(...collectActivityIdsUnderPhase(a.id, allActivities));
    });
    return result;
  }, []);

  const handleEditPhase = useCallback((phase: any) => {
    setEditingItem({ type: 'phase', item: phase });
    setEditFormData({
      name: phase.phase_name || '',
      description: phase.description || '',
      start_date: phase.start_date || '',
      end_date: phase.end_date || '',
      status: phase.status || 'pending',
      progress_percentage: phase.progress_percentage || 0,
    });
  }, []);

  const handleEditActivity = useCallback((activity: any) => {
    setEditingItem({ type: 'activity', item: activity });
    setEditFormData({
      name: activity.name || '',
      description: activity.description || '',
      start_date: activity.start_date || '',
      end_date: activity.end_date || '',
      status: activity.status || 'pending',
      completion_percentage: activity.completion_percentage || 0,
      days_for_activity: activity.days_for_activity || 0,
    });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingItem) return;
    setIsSavingEdit(true);
    try {
      if (editingItem.type === 'phase') {
        const phaseUpdates = {
          phase_name: editFormData.name ?? editingItem.item.phase_name,
          start_date: editFormData.start_date || null,
          end_date: editFormData.end_date || null,
          status: editFormData.status ?? editingItem.item.status,
          progress_percentage: editFormData.progress_percentage ?? editingItem.item.progress_percentage ?? 0,
        };
        if (onUpdatePhaseProp) {
          await onUpdatePhaseProp(editingItem.item.id, phaseUpdates);
        } else {
          await updatePhase.mutateAsync({ id: editingItem.item.id, updates: phaseUpdates });
        }
        if (editFormData.status === 'completed') {
          setExpandedPhases(prev => {
            const next = new Set(prev);
            next.delete(editingItem.item.id);
            return next;
          });
        }
      } else {
        const activityUpdates = {
          name: editFormData.name ?? editingItem.item.name,
          description: editFormData.description ?? editingItem.item.description ?? '',
          start_date: editFormData.start_date || null,
          end_date: editFormData.end_date || null,
          status: editFormData.status ?? editingItem.item.status ?? 'pending',
          completion_percentage: editFormData.completion_percentage ?? editingItem.item.completion_percentage ?? 0,
          days_for_activity: editFormData.days_for_activity ?? editingItem.item.days_for_activity ?? 1,
        };
        if (onUpdateActivityProp) {
          await onUpdateActivityProp(editingItem.item.id, activityUpdates);
        } else {
          await updateActivity.mutateAsync({ id: editingItem.item.id, ...activityUpdates });
        }
      }
      toast.success(t('common.savedSuccessfully') || 'Saved successfully');
      setEditingItem(null);
      setEditFormData({});
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setIsSavingEdit(false);
    }
  }, [editingItem, editFormData, updatePhase, updateActivity, onUpdatePhaseProp, onUpdateActivityProp, t, setExpandedPhases]);

  const handleSort = useCallback((f: string) => setCurrentSort(prev => ({ field: f, direction: prev.field === f && prev.direction === 'asc' ? 'desc' : 'asc' })), []);

  const normalizeVal = useCallback((c: any, rv: any) => {
    if (c.inputType === 'number' || c.inputType === 'currency') { if (rv === "" || rv === null) return null; const n = Number(rv); if (isNaN(n)) return null; const con = getNumericConstraints(c.field); let cl = n; if (con.min !== undefined) cl = Math.max(con.min, cl); if (con.max !== undefined) cl = Math.min(con.max, cl); return cl; }
    if (c.inputType === 'date') { if (!rv) return null; const p = rv instanceof Date ? rv : new Date(rv); return isNaN(p.getTime()) ? null : format(p, "yyyy-MM-dd"); } return rv ?? "";
  }, [getNumericConstraints]);

  const persistVal = useCallback(async (c: any, rv: any) => {
    if (!canEdit || c.isCalculated) return false; const n = normalizeVal(c, rv); const k = getCellKey(c);
    try { setSavingCellKey(k); if (c.type === 'phase') await updatePhase.mutateAsync({ id: c.id, updates: { [c.field]: n } }); else await updateActivity.mutateAsync({ id: c.id, [c.field]: n } as any); return true; } catch (e) { return false; } finally { setSavingCellKey(p => p === k ? null : p); }
  }, [canEdit, getCellKey, normalizeVal, updatePhase, updateActivity]);

  const startEdit = useCallback((c: any, cur: any) => { if (!canEdit || !c.editable) return; setActiveCell(c); setEditingCell(c); setDatePickerOpen(null); setEditValue((c.inputType === 'number' || c.inputType === 'currency') ? (cur === null ? "" : String(cur)) : (cur ?? "")); }, [canEdit]);
  const saveEdit = useCallback(async (ov?: any) => { if (!editingCell) return false; const ok = await persistVal(editingCell, ov ?? editValue); if (ok) { setEditingCell(null); setEditValue(""); } return ok; }, [editingCell, editValue, persistVal]);
  const cancelEdit = useCallback(() => { setEditingCell(null); setEditValue(""); }, []);
  const handleDateChange = useCallback(async (c: any, d: any) => { if (await persistVal(c, d)) setDatePickerOpen(null); }, [persistVal]);

  const focusAt = useCallback((ri: number, ci: number) => { const r = rowStructureRef.current[ri]; if (!r?.length) return; const t = r[Math.max(0, Math.min(ci, r.length - 1))]; if (t) { setActiveCell(t); setDatePickerOpen(null); } }, []);
  const moveH = useCallback((d: number, w = false) => { if (!activeCell) return; cancelEdit(); const r = rowStructureRef.current[activeCell.rowIndex]; const tc = activeCell.colIndex + d; if (tc < 0) { if (w && activeCell.rowIndex > 0) focusAt(activeCell.rowIndex - 1, rowStructureRef.current[activeCell.rowIndex - 1].length - 1); return; } if (tc >= r.length) { if (w && activeCell.rowIndex < rowStructureRef.current.length - 1) focusAt(activeCell.rowIndex + 1, 0); return; } focusAt(activeCell.rowIndex, tc); }, [activeCell, cancelEdit, focusAt]);
  const moveV = useCallback((d: number) => { if (!activeCell) return; cancelEdit(); const tr = activeCell.rowIndex + d; if (tr >= 0 && tr < rowStructureRef.current.length) focusAt(tr, activeCell.colIndex); }, [activeCell, cancelEdit, focusAt]);

  const handleCellClick = useCallback((c: any) => { if (isSameCell(activeCell, c)) { if (!editingCell && c.editable) startEdit(c, c.value); return; } setActiveCell(c); setDatePickerOpen(null); }, [activeCell, editingCell, isSameCell, startEdit]);
  const handleCopy = useCallback(() => { if (!activeCell) return; const r = getCellRecord(activeCell); const v = r ? (r as any)[activeCell.field] : activeCell.value; setCopiedCell({ ...activeCell, value: v }); if (navigator.clipboard) navigator.clipboard.writeText(String(v ?? "")).catch(() => null); }, [activeCell, getCellRecord]);
  const handlePaste = useCallback(async () => { if (activeCell && copiedCell) await persistVal(activeCell, copiedCell.value); }, [activeCell, copiedCell, persistVal]);

  const orderedPhasesData = useMemo(() => { if (!phases?.length) return []; if (!phaseOrder.length) return phases; const m = new Map(phases.map(p => [p.id, p])); const ord = phaseOrder.map(id => m.get(id)).filter(Boolean) as any[]; const mis = phases.filter(p => !phaseOrder.includes(p.id)); return [...ord, ...mis]; }, [phases, phaseOrder]);
  
  const filteredAndSortedData = useMemo(() => {
    if (!orderedPhasesData) return { phases: [], activities: [] }; const cur = activities || [];
    const mf = (it: any, ty: 'phase' | 'activity') => {
      if (currentFilters.status.length) { const s = ty === 'phase' ? calculatePhaseStatus(cur.filter(a => a.phase_id === it.id)) : it.status || 'not_started'; if (!currentFilters.status.includes(s)) return false; }
      const p = ty === 'phase' ? calculatePhaseProgress(cur.filter(a => a.phase_id === it.id)) : it.completion_percentage || 0;
      if (currentFilters.progressMin !== null && p < currentFilters.progressMin) return false; if (currentFilters.progressMax !== null && p > currentFilters.progressMax) return false;
      const sd = ty === 'phase' ? calculatePhaseStartDate(cur.filter(a => a.phase_id === it.id)) : (it.start_date ? new Date(it.start_date) : null);
      if (currentFilters.startDateFrom && sd && sd < new Date(currentFilters.startDateFrom)) return false; if (currentFilters.startDateTo && sd && sd > new Date(currentFilters.startDateTo)) return false;
      const ed = ty === 'phase' ? calculatePhaseEndDate(cur.filter(a => a.phase_id === it.id)) : (it.end_date ? new Date(it.end_date) : null);
      if (currentFilters.endDateFrom && ed && ed < new Date(currentFilters.endDateFrom)) return false; if (currentFilters.endDateTo && ed && ed > new Date(currentFilters.endDateTo)) return false; return true;
    };
    let fp = orderedPhasesData.filter(p => mf(p, 'phase'));
    if (currentSort.field) fp = [...fp].sort((a, b) => { let av: any, bv: any; if (currentSort.field === 'name') { av = a.phase_name; bv = b.phase_name; } else if (currentSort.field === 'start_date') { av = calculatePhaseStartDate(cur.filter(ac => ac.phase_id === a.id))?.getTime() || 0; bv = calculatePhaseStartDate(cur.filter(ac => ac.phase_id === b.id))?.getTime() || 0; } else if (currentSort.field === 'end_date') { av = calculatePhaseEndDate(cur.filter(ac => ac.phase_id === a.id))?.getTime() || 0; bv = calculatePhaseEndDate(cur.filter(ac => ac.phase_id === b.id))?.getTime() || 0; } else if (currentSort.field === 'progress') { av = calculatePhaseProgress(cur.filter(ac => ac.phase_id === a.id)); bv = calculatePhaseProgress(cur.filter(ac => ac.phase_id === b.id)); } return av < bv ? (currentSort.direction === 'asc' ? -1 : 1) : (currentSort.direction === 'asc' ? 1 : -1); });
    let fa = cur.filter(a => mf(a, 'activity'));
    if (currentSort.field) fa = [...fa].sort((a, b) => { if (a.phase_id !== b.phase_id) { const ai = fp.findIndex(p => p.id === a.phase_id), bi = fp.findIndex(p => p.id === b.phase_id); return ai - bi; } let av: any, bv: any; if (currentSort.field === 'name') { av = a.name; bv = b.name; } else if (currentSort.field === 'start_date') { av = a.start_date ? new Date(a.start_date).getTime() : 0; bv = b.start_date ? new Date(b.start_date).getTime() : 0; } else if (currentSort.field === 'end_date') { av = a.end_date ? new Date(a.end_date).getTime() : 0; bv = b.end_date ? new Date(b.end_date).getTime() : 0; } else if (currentSort.field === 'progress') { av = a.completion_percentage || 0; bv = b.completion_percentage || 0; } return av < bv ? (currentSort.direction === 'asc' ? -1 : 1) : (currentSort.direction === 'asc' ? 1 : -1); });
    const ps = project?.start_date || formatDateLocal(new Date()); return performProjectScheduling(ps, fp, fa);
  }, [orderedPhasesData, activities, currentFilters, currentSort, project?.start_date, calculatePhaseStatus, calculatePhaseProgress, calculatePhaseStartDate, calculatePhaseEndDate]);

  const handleMarkAllStarted = useCallback(async (phaseId: string) => {
    const allActivities = filteredAndSortedData.activities || [];
    const ids = collectActivityIdsUnderPhase(phaseId, allActivities);
    const toStart = ids.filter((id) => {
      const a = allActivities.find((x: any) => x.id === id);
      return a && (!a.status || a.status === 'pending' || a.status === 'not_started');
    });
    if (toStart.length === 0) {
      toast.info(t('projectPhases:phase.noTasksToStart') || 'No tasks to start');
      return;
    }
    try {
      for (const id of toStart) await handleStartTask(id);
      toast.success(t('projectPhases:phase.markAllStartedSuccess', { count: toStart.length }) || `${toStart.length} task(s) started`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [filteredAndSortedData.activities, collectActivityIdsUnderPhase, handleStartTask, t]);

  const handleMarkAllCompleted = useCallback(async (phaseId: string) => {
    const allActivities = filteredAndSortedData.activities || [];
    const ids = collectActivityIdsUnderPhase(phaseId, allActivities);
    const toComplete = ids.filter((id) => {
      const a = allActivities.find((x: any) => x.id === id);
      return a && a.status === 'in_progress';
    });
    if (toComplete.length === 0) {
      toast.info(t('projectPhases:phase.noTasksToComplete') || 'No tasks to complete');
      return;
    }
    try {
      for (const id of toComplete) await handleCompleteTask(id);
      toast.success(t('projectPhases:phase.markAllCompletedSuccess', { count: toComplete.length }) || `${toComplete.length} task(s) completed`);
    } catch (e: any) {
      toast.error(e.message);
    }
  }, [filteredAndSortedData.activities, collectActivityIdsUnderPhase, handleCompleteTask, t]);

  // Sync only DATE changes from scheduling (dates, duration) - do NOT overwrite user-edited status/progress
  useEffect(() => {
    if (!canEdit || !filteredAndSortedData.activities.length || syncInProgressRef.current) return;
    const a2u = filteredAndSortedData.activities.filter(s => { const o = activities?.find(a => a.id === s.id); return o && (s.start_date !== o.start_date || s.end_date !== o.end_date); });
    const p2u = filteredAndSortedData.phases.filter(s => { const o = phases?.find(p => p.id === s.id); return o && (s.start_date !== o.start_date || s.end_date !== o.end_date); });
    if (a2u.length || p2u.length) {
      syncInProgressRef.current = true;
      const psync = async () => { try { for (let i = 0; i < a2u.length; i += 10) await Promise.all(a2u.slice(i, i + 10).map(a => updateActivity.mutateAsync({ id: a.id, start_date: a.start_date, end_date: a.end_date, days_for_activity: a.days_for_activity || a.duration, silent: true }))); for (let i = 0; i < p2u.length; i += 5) await Promise.all(p2u.slice(i, i + 5).map(p => updatePhase.mutateAsync({ id: p.id, updates: { start_date: p.start_date, end_date: p.end_date }, silent: true }))); } catch (e) { /* error ignored */ } finally { syncInProgressRef.current = false; } };
      psync();
    }
  }, [filteredAndSortedData.activities, filteredAndSortedData.phases, activities, phases, canEdit, updateActivity, updatePhase]);

  useEffect(() => { 
    if (phases?.length && !hasAutoExpanded) { 
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find phases with activities that match today's date
      const phasesWithTodayTasks = phases.filter(phase => {
        const phaseActivities = activities?.filter(a => a.phase_id === phase.id) || [];
        return phaseActivities.some(activity => {
          if (!activity.start_date) return false;
          const activityDate = new Date(activity.start_date);
          activityDate.setHours(0, 0, 0, 0);
          return activityDate.getTime() === today.getTime();
        });
      });
      
      // Only expand phases that have tasks today
      setExpandedPhases(new Set(phasesWithTodayTasks.map(p => p.id))); 
      setHasAutoExpanded(true); 
    } 
  }, [phases, hasAutoExpanded, activities]);
  
  // Auto-collapse phases when they become completed
  useEffect(() => {
    if (!phases?.length) return;
    setExpandedPhases(prev => {
      const next = new Set(prev);
      let changed = false;
      phases.forEach(phase => {
        if (phase.status === 'completed' && next.has(phase.id)) {
          next.delete(phase.id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [phases]);
  
  useEffect(() => { if (!phases?.length) { setPhaseOrder([]); return; } setPhaseOrder(prev => { const pids = phases.map(p => p.id); if (!prev.length) return pids; const rem = prev.filter(id => pids.includes(id)); const mis = pids.filter(id => !rem.includes(id)); return [...rem, ...mis]; }); }, [phases]);
  
  const autoFillDates = useCallback(async (psd: string) => {
    if (!phases?.length) return; const updA: any[] = []; const updP: any[] = []; let cPs = new Date(psd);
    phases.forEach(p => {
      const pa = activities?.filter(a => a.phase_id === p.id).sort((a, b) => (a.sequence || 0) - (b.sequence || 0)) || [];
      if (!pa.length) { const d = p.duration || 1; const s = new Date(cPs); const e = new Date(s); e.setDate(e.getDate() + d - 1); updP.push({ id: p.id, start_date: formatDateLocal(s), end_date: formatDateLocal(e) }); cPs = new Date(e); cPs.setDate(cPs.getDate() + 1); return; }
      let st: Date | null = null, en: Date | null = null; let ac = new Date(cPs);
      pa.forEach(a => { const d = a.days_for_activity || 1; const s = new Date(ac); const e = new Date(s); e.setDate(e.getDate() + d - 1); if (!st) st = s; en = e; updA.push({ id: a.id, start_date: formatDateLocal(s), end_date: formatDateLocal(e), days_for_activity: d }); ac = new Date(e); ac.setDate(ac.getDate() + 1); });
      if (st && en) { updP.push({ id: p.id, start_date: formatDateLocal(st), end_date: formatDateLocal(en) }); cPs = new Date(en); cPs.setDate(cPs.getDate() + 1); }
    });
    try { if (updA.length) await Promise.all(updA.map(u => supabase.from("project_activities").update({ start_date: u.start_date, end_date: u.end_date }).or(`id.eq.${u.id},wbs_item_id.eq.${u.id}`))); if (updP.length) await Promise.allSettled(updP.map(u => updatePhase.mutateAsync({ id: u.id, updates: { start_date: u.start_date, end_date: u.end_date }, silent: true }))); await queryClient.invalidateQueries({ queryKey: ["project-activities", projectId] }); await queryClient.invalidateQueries({ queryKey: ["project_phases", projectId] }); } catch (e) { /* error ignored */ }
  }, [activities, phases, projectId, queryClient, updatePhase]);

  useEffect(() => { if (autoScheduleAppliedRef.current || !project?.start_date || !phases?.length || !activities?.length) return; if (phases.every(p => !p.start_date)) { autoScheduleAppliedRef.current = true; void autoFillDates(project.start_date); } }, [project?.start_date, phases, activities, autoFillDates]);
  useEffect(() => { const recFn = (c: any, s: any) => { if (c) { const u = findCellInStructure(c); if (!u) s(null); } }; recFn(activeCell, setActiveCell); recFn(editingCell, setEditingCell); recFn(datePickerOpen, setDatePickerOpen); recFn(copiedCell, setCopiedCell); }, [activeCell, editingCell, datePickerOpen, copiedCell, findCellInStructure, filteredAndSortedData, expandedPhases]);

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e; setActiveId(null); if (!over || active.id === over.id) return;
    const isP = phases?.some(p => p.id === active.id);
    if (isP && phases) {
      if (currentSort.field) return; const vids = filteredAndSortedData.phases.map(p => p.id); const oi = vids.indexOf(active.id as string), ni = vids.indexOf(over.id as string);
      if (oi !== -1 && ni !== -1) { const nids = arrayMove(vids, oi, ni); setPhaseOrder(nids); try { await reorderPhases.mutateAsync(nids.map((id, idx) => ({ id, sort_order: idx + 1 }))); if (project?.start_date) void autoFillDates(project.start_date); } catch (err) { /* error ignored */ } }
    } else {
      const aa = activities?.find(a => a.id === active.id), oa = activities?.find(a => a.id === over.id); if (!aa || !oa || aa.phase_id !== oa.phase_id) return;
      const pa = activities.filter(a => a.phase_id === aa.phase_id).sort((a, b) => (a.sequence || 0) - (b.sequence || 0)); const oi = pa.findIndex(a => a.id === active.id), ni = pa.findIndex(a => a.id === over.id);
      if (oi !== ni) { const reo = arrayMove(pa, oi, ni); try { for (let i = 0; i < reo.length; i++) await updateActivity.mutateAsync({ id: reo[i].id, sequence: i + 1, silent: true }); } catch (err) { /* error ignored */ } }
    }
  };

  const handleSaveDeps = async (ds: any[]) => { if (!dependencyDialog.activity) return; try { await updateActivity.mutateAsync({ id: dependencyDialog.activity.id, dependencies: ds as any }); const ph = phases?.find(p => p.id === dependencyDialog.activity.phase_id); const st = ph?.start_date ? new Date(ph.start_date) : new Date(); const pa = activities?.filter(a => a.phase_id === dependencyDialog.activity.phase_id).sort((a, b) => (a.sequence || 0) - (b.sequence || 0)) || []; const upd = calculateDependencyDates(pa.map(a => a.id === dependencyDialog.activity.id ? { ...a, dependencies: ds as any } : a), st); for (const a of upd) await updateActivity.mutateAsync({ id: a.id, start_date: a.start_date, end_date: a.end_date, silent: true } as any); setDependencyDialog({ open: false, activity: null }); } catch (e) { /* error ignored */ } };
  const rowIndicesMemo = useMemo(() => computeRowIndices(filteredAndSortedData.phases || [], filteredAndSortedData.activities || []), [filteredAndSortedData.phases, filteredAndSortedData.activities]);

  const renderCellLocal = (p: CellRenderProps) => {
    const meta: CellPosition = { ...p, editable: canEdit && !p.isCalculated, inputType: p.inputType || 'text', isCalculated: !!p.isCalculated }; if (!rowStructureRef.current[p.rowIndex]) rowStructureRef.current[p.rowIndex] = []; rowStructureRef.current[p.rowIndex][p.colIndex] = meta;
    const key = getCellKey(meta); const isEd = editingCell ? isSameCell(editingCell, meta) : false, isAc = activeCell ? isSameCell(activeCell, meta) : false, isDa = datePickerOpen ? isSameCell(datePickerOpen, meta) : false;
    const cls = ["inline-flex w-full min-h-[28px] items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-sm transition min-w-0", meta.editable ? "cursor-text hover:bg-muted/50" : "cursor-default text-muted-foreground", isAc ? "ring-2 ring-primary ring-offset-1" : "border border-transparent", copiedCell && isSameCell(copiedCell, meta) ? "bg-primary/10" : "", savingCellKey === key ? "opacity-60" : "", isEd ? "bg-background shadow-inner" : ""].filter(Boolean).join(" ");
    if (isEd) {
      if (meta.inputType === 'select') return <Select value={editValue} onValueChange={(v) => { setEditValue(v); void saveEdit(v); }}><SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_started">{t('projectPhases:statusLabels.not_started')}</SelectItem><SelectItem value="in_progress">{t('projectPhases:statusLabels.in_progress')}</SelectItem><SelectItem value="completed">{t('projectPhases:statusLabels.completed')}</SelectItem><SelectItem value="delayed">{t('projectPhases:statusLabels.delayed')}</SelectItem></SelectContent></Select>;
      const con = getNumericConstraints(meta.field); return <Input type={meta.inputType === 'number' || meta.inputType === 'currency' ? 'number' : 'text'} value={editValue} onChange={(e) => setEditValue(e.target.value)} min={con.min} max={con.max} step={con.step} onBlur={() => void saveEdit()} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void (async () => { if (await saveEdit()) moveV(1); })(); } if (e.key === 'Escape') cancelEdit(); if (e.key === 'Tab') { e.preventDefault(); void (async () => { if (await saveEdit()) moveH(e.shiftKey ? -1 : 1, true); })(); } }} autoFocus className="h-8 w-full" />;
    }
    if (meta.inputType === 'date') return <Popover open={isDa} onOpenChange={(o) => { if (o && meta.editable) { setActiveCell(meta); setDatePickerOpen(meta); } if (!o && isDa) setDatePickerOpen(null); }}><PopoverTrigger asChild><button type="button" className={`${cls} text-left`} onClick={() => { if (!meta.editable) handleCellClick(meta); else { setActiveCell(meta); setDatePickerOpen(meta); } }}>{p.value ? <span>{formatDate(p.value)}</span> : <span className="text-muted-foreground">Select date</span>}<CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-60" /></button></PopoverTrigger><PopoverContent className="p-0" align="start"><DateInput value={p.value instanceof Date ? format(p.value, "yyyy-MM-dd") : p.value ?? ""} onChange={(v) => handleDateChange(meta, v)} className="w-full" /></PopoverContent></Popover>;
    if (p.field === 'status') return <div className={cls} onClick={() => handleCellClick(meta)} onDoubleClick={() => startEdit(meta, p.value)}><Badge variant="outline" className={p.value === 'completed' ? 'bg-green-500/10 text-green-700' : p.value === 'in_progress' ? 'bg-blue-500/10 text-blue-700' : p.value === 'delayed' ? 'bg-red-500/10 text-red-700' : 'bg-muted text-muted-foreground'}>{t(`projectPhases:statusLabels.${p.value}`) || p.value}</Badge></div>;
    if (p.field === 'progress_percentage' || p.field === 'completion_percentage') { const v = Number(p.value) || 0; return <TooltipProvider><Tooltip><TooltipTrigger asChild><div className={`${cls} ${meta.editable ? 'cursor-pointer hover:bg-primary/5' : ''}`} onClick={() => handleCellClick(meta)} onDoubleClick={() => startEdit(meta, p.value)}><div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${v}%` }} /></div><span className="text-xs text-muted-foreground min-w-[2.5rem] text-right shrink-0">{v}%</span></div></TooltipTrigger><TooltipContent>{meta.editable ? 'Click to edit progress' : 'Progress'}</TooltipContent></Tooltip></TooltipProvider>; }
    const dv = meta.inputType === 'currency' ? formatCurrency(typeof p.value === 'number' ? p.value : p.value ? Number(p.value) : null) : (p.value ?? "-");
    return <div className={cls} onClick={() => handleCellClick(meta)} onDoubleClick={() => startEdit(meta, p.value)}><span className="truncate">{dv}</span></div>;
  };

  const handleSelectAllPhases = useCallback((c: any) => { const cp = filteredAndSortedData?.phases || phases || []; if (c === true) setSelectedPhases(new Set(cp.map(p => p.id))); else setSelectedPhases(new Set()); }, [filteredAndSortedData?.phases, phases]);
  const toggleAllPhases = useCallback(() => { if (!filteredAndSortedData.phases?.length) return; const pids = filteredAndSortedData.phases.map(p => p.id); setExpandedPhases(prev => pids.every(id => prev.has(id)) ? new Set() : new Set(pids)); }, [filteredAndSortedData.phases]);

  if ((!phases || phases.length === 0) && (!activities || activities.length === 0)) return <div className="text-center py-12 text-muted-foreground">No phases found.</div>;
  const fpi = filteredAndSortedData.phases?.map(p => p.id) ?? [], allExp = fpi.length > 0 && fpi.every(id => expandedPhases.has(id));

  return (
    <>
      {canEdit && selectedPhases.size > 0 && <Card className="mb-4 border-primary/20 bg-primary/5"><CardContent className="flex items-center justify-between p-4"><div className="flex items-center gap-4"><span className="text-sm font-medium">{t('projectPhases:bulkActions.phasesSelected', { count: selectedPhases.size })}</span><Button variant="ghost" size="sm" onClick={() => setSelectedPhases(new Set())}><X className="h-4 w-4 mr-1" />{t('projectPhases:bulkActions.clearSelection')}</Button></div><Button variant="destructive" size="sm" onClick={() => setBulkDeleteDialog(true)} disabled={bulkDeletePhases.isPending}><Trash2 className="h-4 w-4 mr-1" />{t('projectPhases:bulkActions.deleteSelected')}</Button></CardContent></Card>}
      {filteredAndSortedData.phases?.length === 0 && (phases?.length || 0) > 0 && <Card className="mb-4 border-warning/20 bg-warning/5"><CardContent className="flex items-center justify-between p-4"><span className="text-sm">{t('projectPhases:filters.noMatches')}</span><Button variant="outline" size="sm" onClick={() => setCurrentFilters({ status: [], progressMin: null, progressMax: null, startDateFrom: '', startDateTo: '', endDateFrom: '', endDateTo: '' })}>{t('projectPhases:filters.clearAll')}</Button></CardContent></Card>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ViewTemplateManager currentFilters={currentFilters} currentSort={currentSort} currentVisibleColumns={visibleColumns} onLoadTemplate={handleLoadTemplate} />
        <ProjectPlanFilters filters={currentFilters} onFiltersChange={setCurrentFilters} />
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={toggleAllPhases} disabled={fpi.length === 0}>{allExp ? <><Minimize2 className="mr-2 h-4 w-4" />{t('projectPhases:collapsePhases')}</> : <><Maximize2 className="mr-2 h-4 w-4" />{t('projectPhases:expandPhases')}</>}</Button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
        <div className="border rounded-lg overflow-hidden w-full max-w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full table-auto">
              <thead className="bg-muted/50 border-b">
                <tr>
                  {canEdit && <th className="text-left p-2 font-medium text-sm w-8"><Checkbox checked={fpi.length ? (selectedPhases.size === fpi.length ? true : (selectedPhases.size > 0 ? "indeterminate" : false)) : false} onCheckedChange={handleSelectAllPhases} /></th>}
                  <th className="text-left p-2 font-medium text-sm w-8"></th>
                  {visibleColumns.includes("name") && <th className="text-left p-3 font-medium text-sm cursor-pointer hover:bg-muted/20" onClick={() => handleSort('name')}>{t('projectPhases:columns.name')}</th>}
                  {visibleColumns.includes("start_date") && <th className="text-left p-3 font-medium text-sm cursor-pointer hover:bg-muted/20" onClick={() => handleSort('start_date')}>{t('projectPhases:columns.startDate')}</th>}
                  {visibleColumns.includes("duration") && <th className="text-left p-2 font-medium text-sm w-20">{t('projectPhases:columns.duration')}</th>}
                  {visibleColumns.includes("end_date") && <th className="text-left p-3 font-medium text-sm cursor-pointer hover:bg-muted/20" onClick={() => handleSort('end_date')}>{t('projectPhases:columns.endDate')}</th>}
                  {visibleColumns.includes("progress") && <th className="text-left p-3 font-medium text-sm cursor-pointer hover:bg-muted/20" onClick={() => handleSort('progress')}>{t('projectPhases:columns.progress')}</th>}
                  {visibleColumns.includes("dependencies") && <th className="text-left p-2 font-medium text-sm w-56">{t('projectPhases:columns.dependencies')}</th>}
                  {canEdit && visibleColumns.includes("actions") && <th className="text-left p-2 font-medium text-sm w-20">{t('projectPhases:columns.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.phases && filteredAndSortedData.phases.length > 0 ? (
                  <SortableContext items={filteredAndSortedData.phases.map(p => p.id)} strategy={verticalListSortingStrategy}>
                    {filteredAndSortedData.phases.map((phase) => {
                      const isExpanded = expandedPhases.has(phase.id);
                      const phaseActivities = filteredAndSortedData.activities?.filter(a => a.phase_id === phase.id)?.sort((a, b) => (a.sequence || 0) - (b.sequence || 0)) || [];
                      const allIdsUnderPhase = collectActivityIdsUnderPhase(phase.id, filteredAndSortedData.activities || []);
                      const hasStartableTasks = allIdsUnderPhase.some((id) => {
                        const a = filteredAndSortedData.activities?.find((x: any) => x.id === id);
                        return a && (!a.status || a.status === 'pending' || a.status === 'not_started');
                      });
                      const hasCompletableTasks = allIdsUnderPhase.some((id) => {
                        const a = filteredAndSortedData.activities?.find((x: any) => x.id === id);
                        return a && a.status === 'in_progress';
                      });
                      return (
                        <Fragment key={phase.id}>
                          <SortablePhaseRow key={phase.id} phase={phase} phaseActivities={phaseActivities} isExpanded={isExpanded} canEdit={canEdit} isSelected={selectedPhases.has(phase.id)} onToggle={() => togglePhase(phase.id)} onAddActivity={() => handleAddActivity(phase.id)} onDelete={() => setDeleteDialog({ id: phase.id, type: 'phase', name: phase.phase_name })} onSelect={(c) => handleSelectPhase(phase.id, c)} onEdit={() => handleEditPhase(phase)} onMarkAllStarted={() => handleMarkAllStarted(phase.id)} onMarkAllCompleted={() => handleMarkAllCompleted(phase.id)} hasStartableTasks={hasStartableTasks} hasCompletableTasks={hasCompletableTasks} renderCell={renderCellLocal} rowIndex={rowIndicesMemo.get(phase.id) ?? 0} />
                          {isExpanded && phaseActivities.length > 0 && (
                            <RecursiveActivityRows activities={phaseActivities} allActivities={filteredAndSortedData.activities} level={1} canEdit={canEdit} setDeleteDialog={setDeleteDialog} setDependencyDialog={setDependencyDialog} renderCell={renderCellLocal} rowIndices={rowIndicesMemo} phases={phases} onAssignPhase={handleAssignPhase} onStartTask={handleStartTask} onCompleteTask={handleCompleteTask} onEditActivity={handleEditActivity} />
                          )}
                        </Fragment>
                      );
                    })}
                  </SortableContext>
                ) : filteredAndSortedData.activities && filteredAndSortedData.activities.length > 0 ? (
                  <RecursiveActivityRows activities={filteredAndSortedData.activities.filter(a => !a.phase_id).sort((a, b) => (a.sequence || 0) - (b.sequence || 0))} allActivities={filteredAndSortedData.activities} level={0} canEdit={canEdit} setDeleteDialog={setDeleteDialog} setDependencyDialog={setDependencyDialog} renderCell={renderCellLocal} rowIndices={rowIndicesMemo} phases={phases || []} onAssignPhase={handleAssignPhase} onStartTask={handleStartTask} onCompleteTask={handleCompleteTask} onEditActivity={handleEditActivity} />
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </DndContext>
      <DependencyDialog open={dependencyDialog.open} onOpenChange={(o) => setDependencyDialog({ open: o, activity: o ? dependencyDialog.activity : null })} activity={dependencyDialog.activity} allActivities={activities || []} onSave={handleSaveDeps} />
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleteDialog?.type === 'phase' ? 'Phase' : 'Activity'}?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{deleteDialog?.name}"? {deleteDialog?.type === 'phase' && 'All activities will also be deleted.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={async () => { try { if (deleteDialog?.type === 'phase') await deletePhase.mutateAsync(deleteDialog.id); else await deleteActivity.mutateAsync(deleteDialog.id); setDeleteDialog(null); } catch (e) { /* error ignored */ } }} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('projectPhases:bulkActions.bulkDeleteTitle')}</AlertDialogTitle><AlertDialogDescription>{t('projectPhases:bulkActions.bulkDeleteConfirm', { count: selectedPhases.size })}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('projectPhases:filters.cancel')}</AlertDialogCancel><AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground" disabled={bulkDeletePhases.isPending}>{t('projectPhases:bulkActions.deleteSelected')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <DragOverlay>{activeId ? (phases?.find(p => p.id === activeId) ? <div className="bg-primary/10 p-2 rounded border border-primary">Phase: {phases.find(p => p.id === activeId)?.phase_name}</div> : <div className="bg-muted p-2 rounded border">Activity: {activities?.find(a => a.id === activeId)?.name}</div>) : null}</DragOverlay>
      
      {/* Edit Sheet */}
      <Sheet open={!!editingItem} onOpenChange={(open) => { if (!open) { setEditingItem(null); setEditFormData({}); } }}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingItem?.type === 'phase' ? t('projectPhases:editPhase') || 'Edit Phase' : t('projectPhases:editTask') || 'Edit Task'}</SheetTitle>
            <SheetDescription>{editingItem?.type === 'phase' ? t('projectPhases:editPhaseDescription') || 'Update phase details below' : t('projectPhases:editTaskDescription') || 'Update task details below'}</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('projectPhases:columns.name') || 'Name'}</Label>
              <Input id="edit-name" value={editFormData.name || ''} onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))} />
            </div>
            {editingItem?.type === 'activity' && (
              <div className="space-y-2">
                <Label htmlFor="edit-description">{t('projectPhases:columns.description') || 'Description'}</Label>
                <Textarea id="edit-description" value={editFormData.description || ''} onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start-date">{t('projectPhases:columns.startDate') || 'Start Date'}</Label>
                <Input type="date" id="edit-start-date" value={editFormData.start_date || ''} onChange={(e) => setEditFormData(prev => ({ ...prev, start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end-date">{t('projectPhases:columns.endDate') || 'End Date'}</Label>
                <Input type="date" id="edit-end-date" value={editFormData.end_date || ''} onChange={(e) => setEditFormData(prev => ({ ...prev, end_date: e.target.value }))} />
              </div>
            </div>
            {editingItem?.type === 'activity' && (
              <div className="space-y-2">
                <Label htmlFor="edit-duration">{t('projectPhases:columns.duration') || 'Duration (days)'}</Label>
                <Input type="number" id="edit-duration" min={0} value={editFormData.days_for_activity || 0} onChange={(e) => setEditFormData(prev => ({ ...prev, days_for_activity: parseInt(e.target.value) || 0 }))} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-status">{t('projectPhases:columns.status') || 'Status'}</Label>
              <Select value={editFormData.status || 'pending'} onValueChange={(v) => setEditFormData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('projectPhases:statusLabels.pending') || 'Pending'}</SelectItem>
                  <SelectItem value="in_progress">{t('projectPhases:statusLabels.in_progress') || 'In Progress'}</SelectItem>
                  <SelectItem value="completed">{t('projectPhases:statusLabels.completed') || 'Completed'}</SelectItem>
                  <SelectItem value="blocked">{t('projectPhases:statusLabels.blocked') || 'Blocked'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-progress">{t('projectPhases:columns.progress') || 'Progress (%)'}</Label>
              <Input type="number" id="edit-progress" min={0} max={100} value={editingItem?.type === 'phase' ? (editFormData.progress_percentage || 0) : (editFormData.completion_percentage || 0)} onChange={(e) => setEditFormData(prev => ({ ...prev, [editingItem?.type === 'phase' ? 'progress_percentage' : 'completion_percentage']: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => { setEditingItem(null); setEditFormData({}); }}>{t('common.cancel') || 'Cancel'}</Button>
            <Button type="button" onClick={() => void handleSaveEdit()} disabled={isSavingEdit}>
              {isSavingEdit ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
