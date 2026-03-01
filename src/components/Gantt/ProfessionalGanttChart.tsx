/**
 * ProfessionalGanttChart - A production-ready Gantt chart component
 *
 * Architecture:
 * - Single scroll container for synchronized vertical scrolling
 * - Sticky left column for task names during horizontal scroll
 * - Proper date range calculations from actual activity data
 * - Professional styling matching CastorWorks design system
 * - Drag-to-move and drag-to-resize task bars
 */

import { useState, useMemo, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  differenceInDays,
  addDays,
  startOfDay,
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isWeekend,
  isSameMonth,
  parseISO
} from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  GripVertical,
  ZoomIn,
  ZoomOut,
  Calendar,
  Filter,
  Search,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Maximize2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  parseLocalDate, 
  formatDateLocal, 
  calculateBusinessDays 
} from "@/utils/scheduleCalculators";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/contexts/LocalizationContext";

// ============================================================================
// TYPES
// ============================================================================

export interface GanttTask {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  duration: number;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'at_risk';
  phase?: string;
  phaseId?: string;
  level?: number;
  parentId?: string;
  children?: GanttTask[];
  isExpanded?: boolean;
}

export interface GanttPhase {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  duration?: number;
  progress: number;
  color?: string;
  tasks: GanttTask[];
}

export type ZoomLevel = 'day' | 'week' | 'month';

type DragOperation = 'move' | 'resize-start' | 'resize-end';

interface DragState {
  taskId: string;
  operation: DragOperation;
  initialMouseX: number;
  initialLeft: number;
  initialWidth: number;
  initialStartDate: Date;
  initialEndDate: Date;
  currentStartDate: Date;
  currentEndDate: Date;
}

export interface ProfessionalGanttChartProps {
  phases: GanttPhase[];
  title?: string;
  description?: string;
  onTaskClick?: (task: GanttTask) => void;
  onTaskUpdate?: (taskId: string, updates: { startDate: string; endDate: string; duration: number }) => void;
  className?: string;
  initialZoom?: ZoomLevel;
  showWeekends?: boolean;
  projectCalendar?: {
    enabled: boolean;
    workingDays: string[];
    holidays: Array<{ date: string; reason: string }>;
  };
}

export interface ProfessionalGanttChartRef {
  expandAll: () => void;
  collapseAll: () => void;
  scrollToToday: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TASK_ROW_HEIGHT = 40;
const PHASE_ROW_HEIGHT = 44;
const DAY_WIDTH = 40;
const WEEK_WIDTH = 120;
const MONTH_WIDTH = 160;
const RESIZE_HANDLE_WIDTH = 8;
const MIN_TASK_DURATION = 1;

const STATUS_COLORS: Record<GanttTask['status'], { bg: string; bar: string; text: string; border: string }> = {
  not_started: { bg: 'bg-muted/20', bar: 'bg-muted-foreground/40', text: 'text-muted-foreground', border: 'border-muted-foreground/30' },
  in_progress: { bg: 'bg-blue-500/10', bar: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500/50' },
  completed: { bg: 'bg-green-500/10', bar: 'bg-green-500', text: 'text-green-700 dark:text-green-300', border: 'border-green-500/50' },
  delayed: { bg: 'bg-red-500/10', bar: 'bg-red-500', text: 'text-red-700 dark:text-red-300', border: 'border-red-500/50' },
  at_risk: { bg: 'bg-amber-500/10', bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500/50' },
};

const PHASE_COLORS = [
  'bg-indigo-500',
  'bg-blue-500',
  'bg-blue-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-emerald-500',
  'bg-orange-500',
  'bg-rose-500',
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const parseDate = (date: string | Date): Date => {
  if (date instanceof Date) return date;
  return parseLocalDate(date) || new Date();
};

function getColumnWidth(zoom: ZoomLevel, multiplier: number = 1): number {
  const base = (() => {
    switch (zoom) {
      case 'day': return DAY_WIDTH;
      case 'week': return WEEK_WIDTH;
      case 'month': return MONTH_WIDTH;
    }
  })();
  return base * multiplier;
}

function getPixelsPerDay(zoom: ZoomLevel, columnWidth: number): number {
  switch (zoom) {
    case 'day': return columnWidth;
    case 'week': return columnWidth / 7;
    case 'month': return columnWidth / 30;
  }
}

function getTimeUnits(startDate: Date, endDate: Date, zoom: ZoomLevel): Date[] {
  switch (zoom) {
    case 'day':
      return eachDayOfInterval({ start: startDate, end: endDate });
    case 'week':
      return eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
    case 'month':
      return eachMonthOfInterval({ start: startDate, end: endDate });
  }
}

function formatColumnHeader(date: Date, zoom: ZoomLevel): string {
  switch (zoom) {
    case 'day':
      return format(date, 'd');
    case 'week':
      return format(date, "'W'w");
    case 'month':
      return format(date, 'MMM');
  }
}

function formatColumnSubheader(date: Date, zoom: ZoomLevel): string {
  switch (zoom) {
    case 'day':
      return format(date, 'EEE');
    case 'week':
      return `${format(date, 'd')}-${format(endOfWeek(date, { weekStartsOn: 1 }), 'd')}`;
    case 'month':
      return format(date, 'yyyy');
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ProfessionalGanttChart = forwardRef<ProfessionalGanttChartRef, ProfessionalGanttChartProps>(function ProfessionalGanttChart({
  phases,
  title,
  description,
  onTaskClick,
  onTaskUpdate,
  className,
  initialZoom = 'week',
  showWeekends = true,
  projectCalendar,
  }, ref) {
    console.log('[ProfessionalGanttChart] Received phases:', phases?.length || 0);
    phases?.forEach((phase, i) => {
      console.log(`  Phase ${i}: ${phase.name} with ${phase.tasks?.length || 0} tasks`);
    });

  const { t } = useLocalization();
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const headerTimelineRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const verticalScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  const [zoom, setZoom] = useState<ZoomLevel>(initialZoom);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    new Set(phases.map(p => p.id))
  );
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [allExpanded, setAllExpanded] = useState<boolean>(true);
  
  // Toolbar state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed" | "delayed" | "at_risk">("all");
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">(initialZoom);
  const [zoomLevel, setZoomLevel] = useState(7); // 7 = 100%
  const [workingDaysMode, setWorkingDaysMode] = useState(false);
  
  // Resizable column widths with localStorage persistence
  const COLUMN_STORAGE_KEY = 'gantt-new-column-widths-v60';
  const DEFAULT_COLUMN_WIDTHS = {
    name: 400,
    startDate: 90,
    duration: 60,
    endDate: 90,
  };
  
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);

  // Load from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLUMN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setColumnWidths(prev => ({ 
          ...prev, 
          ...parsed,
          // Ensure reasonable minimums
          name: Math.max(parsed.name || 0, 150)
        }));
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  // Column resize state
  const [resizingColumn, setResizingColumn] = useState<keyof typeof DEFAULT_COLUMN_WIDTHS | null>(null);
  const columnResizeStartX = useRef(0);
  const columnResizeStartWidth = useRef(0);

  // Save column widths to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columnWidths));
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [columnWidths]);

  // Column resize handlers
  const handleColumnResizeStart = (e: React.MouseEvent, column: keyof typeof DEFAULT_COLUMN_WIDTHS) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(column);
    columnResizeStartX.current = e.clientX;
    columnResizeStartWidth.current = columnWidths[column];
  };

  const handleColumnResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn) return;
    const delta = e.clientX - columnResizeStartX.current;
    const minWidth = resizingColumn === 'name' ? 100 : 40;
    const maxWidth = resizingColumn === 'name' ? 1000 : 200;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, columnResizeStartWidth.current + delta));
    setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
  }, [resizingColumn]);

  const handleColumnResizeEnd = useCallback(() => {
    setResizingColumn(null);
  }, []);

  // Calculate total left panel width from column widths
  const calculatedLeftPanelWidth = columnWidths.name + columnWidths.startDate + columnWidths.duration + columnWidths.endDate + 48;
  
  // Resizable left panel state
  const [leftPanelWidth, setLeftPanelWidth] = useState(calculatedLeftPanelWidth);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  // Column resize event listeners
  useEffect(() => {
    if (resizingColumn) {
      document.addEventListener('mousemove', handleColumnResizeMove);
      document.addEventListener('mouseup', handleColumnResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleColumnResizeMove);
      document.removeEventListener('mouseup', handleColumnResizeEnd);
      if (!dragState && !isResizingPanel) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
  }, [resizingColumn, handleColumnResizeMove, handleColumnResizeEnd, dragState, isResizingPanel]);

  // Update left panel width when column widths change
  useEffect(() => {
    setLeftPanelWidth(calculatedLeftPanelWidth);
  }, [calculatedLeftPanelWidth]);

  useEffect(() => {
    setExpandedPhases(prev => {
      const newExpanded = new Set(prev);
      const currentPhaseIds = new Set(phases.map(p => p.id));

      for (const phaseId of prev) {
        if (!currentPhaseIds.has(phaseId)) {
          newExpanded.delete(phaseId);
        }
      }

      if (allExpanded) {
        for (const phaseId of currentPhaseIds) {
          newExpanded.add(phaseId);
        }
      }

      return newExpanded;
    });
  }, [phases, allExpanded]);



  // ============================================================================
  // CALCULATED VALUES
  // ============================================================================

  // Calculate date range from all phases and tasks
  const { startDate, endDate, totalDays } = useMemo(() => {
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    phases.forEach(phase => {
      const phaseStart = parseDate(phase.startDate);
      const phaseEnd = parseDate(phase.endDate);

      if (!minDate || phaseStart < minDate) minDate = phaseStart;
      if (!maxDate || phaseEnd > maxDate) maxDate = phaseEnd;

      phase.tasks.forEach(task => {
        const taskStart = parseDate(task.startDate);
        const taskEnd = parseDate(task.endDate);

        if (!minDate || taskStart < minDate) minDate = taskStart;
        if (!maxDate || taskEnd > maxDate) maxDate = taskEnd;
      });
    });

    // Default to current month if no dates
    if (!minDate) minDate = startOfMonth(new Date());
    if (!maxDate) maxDate = endOfMonth(new Date());

    // Add padding days for better visualization
    let paddedStart = addDays(minDate, -7);
    let paddedEnd = addDays(maxDate, 14);

    // Always include current week so Today line is visible
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 });
    if (startOfCurrentWeek < paddedStart) paddedStart = startOfCurrentWeek;
    if (endOfCurrentWeek > paddedEnd) paddedEnd = endOfCurrentWeek;

    return {
      startDate: paddedStart,
      endDate: paddedEnd,
      totalDays: differenceInDays(paddedEnd, paddedStart) + 1
    };
  }, [phases]);

  // Generate time columns based on zoom level
  const timeColumns = useMemo(() => {
    return getTimeUnits(startDate, endDate, zoom);
  }, [startDate, endDate, zoom]);

  const zoomMultiplier = zoomLevel / 7;
  const columnWidth = getColumnWidth(zoom, zoomMultiplier);
  const pixelsPerDay = getPixelsPerDay(zoom, columnWidth);
  const timelineWidth = timeColumns.length * columnWidth;

  // Calculate project statistics for header
  const taskStats = useMemo(() => {
    const stats = {
      total: 0,
      completed: 0,
      inProgress: 0,
      delayed: 0,
      notStarted: 0,
      avgProgress: 0,
    };

    let totalProgress = 0;
    let taskCount = 0;

    phases.forEach((phase) => {
      phase.tasks.forEach((task) => {
        taskCount++;
        totalProgress += task.progress;
        switch (task.status) {
          case "completed":
            stats.completed++;
            break;
          case "in_progress":
            stats.inProgress++;
            break;
          case "delayed":
            stats.delayed++;
            break;
          case "not_started":
            stats.notStarted++;
            break;
        }
      });
    });

    stats.total = taskCount;
    stats.avgProgress = taskCount > 0 ? totalProgress / taskCount : 0;

    return stats;
  }, [phases]);

  // Calculate today marker position
  const todayPosition = useMemo(() => {
    const today = new Date();
    const offset = differenceInDays(today, startDate);
    return offset * pixelsPerDay;
  }, [startDate, pixelsPerDay]);

  // Flatten phases and tasks for rendering with filtering
  const rows = useMemo(() => {
    const result: Array<{ type: 'phase' | 'task'; data: GanttPhase | GanttTask; phaseIndex: number }> = [];

    // Filter tasks based on search query and status
    const matchesSearch = (task: GanttTask): boolean => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return task.name.toLowerCase().includes(query);
    };

    const matchesStatus = (task: GanttTask): boolean => {
      if (filterStatus === "all") return true;
      if (filterStatus === "active") return task.status === "in_progress";
      if (filterStatus === "completed") return task.status === "completed";
      if (filterStatus === "delayed") return task.status === "delayed";
      if (filterStatus === "at_risk") return task.status === "at_risk";
      return true;
    };

    phases.forEach((phase, phaseIndex) => {
      // Filter tasks in this phase
      const filteredTasks = phase.tasks.filter(task => matchesSearch(task) && matchesStatus(task));
      
      // Only show phase if it has matching tasks or no filters are active
      if (filteredTasks.length > 0 || (!searchQuery && filterStatus === "all")) {
        result.push({ type: 'phase', data: phase, phaseIndex });

        if (expandedPhases.has(phase.id)) {
          filteredTasks.forEach(task => {
            result.push({ type: 'task', data: task, phaseIndex });
          });
        }
      }
    });

    return result;
  }, [phases, expandedPhases, searchQuery, filterStatus]);

  // ============================================================================
  // BAR POSITION CALCULATIONS
  // ============================================================================

  const calculateBarPosition = useCallback((taskStart: Date, taskEnd: Date) => {
    const startOffset = differenceInDays(taskStart, startDate);
    const duration = differenceInDays(taskEnd, taskStart) + 1;

    const left = startOffset * pixelsPerDay;
    const width = duration * pixelsPerDay;

    return { left: Math.max(0, left), width: Math.max(pixelsPerDay, width) };
  }, [startDate, pixelsPerDay]);

  // ============================================================================
  // DRAG AND DROP HANDLERS
  // ============================================================================

  const handleDragStart = useCallback((
    e: React.MouseEvent,
    task: GanttTask,
    operation: DragOperation
  ) => {
    console.log('[ProfessionalGanttChart] handleDragStart called:', { taskId: task.id, operation, hasOnTaskUpdate: !!onTaskUpdate });
    e.preventDefault();
    e.stopPropagation();

    const taskStart = parseDate(task.startDate);
    const taskEnd = parseDate(task.endDate);
    const { left, width } = calculateBarPosition(taskStart, taskEnd);

    setDragState({
      taskId: task.id,
      operation,
      initialMouseX: e.clientX,
      initialLeft: left,
      initialWidth: width,
      initialStartDate: taskStart,
      initialEndDate: taskEnd,
      currentStartDate: taskStart,
      currentEndDate: taskEnd,
    });
  }, [calculateBarPosition, onTaskUpdate]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setDragState(prev => {
      if (!prev) return null;

      const deltaX = e.clientX - prev.initialMouseX;
      const deltaDays = Math.round(deltaX / pixelsPerDay);

      let newStartDate: Date;
      let newEndDate: Date;

      switch (prev.operation) {
        case 'move':
          newStartDate = addDays(prev.initialStartDate, deltaDays);
          newEndDate = addDays(prev.initialEndDate, deltaDays);
          break;
        case 'resize-start':
          newStartDate = addDays(prev.initialStartDate, deltaDays);
          newEndDate = prev.initialEndDate;
          // Ensure minimum duration
          if (differenceInDays(newEndDate, newStartDate) < MIN_TASK_DURATION) {
            newStartDate = addDays(newEndDate, -MIN_TASK_DURATION);
          }
          break;
        case 'resize-end':
          newStartDate = prev.initialStartDate;
          newEndDate = addDays(prev.initialEndDate, deltaDays);
          // Ensure minimum duration
          if (differenceInDays(newEndDate, newStartDate) < MIN_TASK_DURATION) {
            newEndDate = addDays(newStartDate, MIN_TASK_DURATION);
          }
          break;
      }

      console.log('[ProfessionalGanttChart] handleMouseMove:', { 
        taskId: prev.taskId,
        deltaX,
        deltaDays,
        operation: prev.operation,
        newStart: newStartDate.toISOString(),
        newEnd: newEndDate.toISOString(),
      });

      return {
        ...prev,
        currentStartDate: newStartDate,
        currentEndDate: newEndDate,
      };
    });
  }, [pixelsPerDay]);

  const handleMouseUp = useCallback(() => {
    setDragState(prev => {
      if (!prev) return null;

      // Only update if dates actually changed
      const startChanged = prev.currentStartDate.getTime() !== prev.initialStartDate.getTime();
      const endChanged = prev.currentEndDate.getTime() !== prev.initialEndDate.getTime();

      console.log('[ProfessionalGanttChart] handleMouseUp called:', { 
        taskId: prev.taskId,
        operation: prev.operation,
        startChanged, 
        endChanged,
        hasOnTaskUpdate: !!onTaskUpdate,
        initialStart: prev.initialStartDate.toISOString(),
        currentStart: prev.currentStartDate.toISOString(),
        initialEnd: prev.initialEndDate.toISOString(),
        currentEnd: prev.currentEndDate.toISOString(),
      });

      if ((startChanged || endChanged) && onTaskUpdate) {
        const duration = differenceInDays(prev.currentEndDate, prev.currentStartDate) + 1;
        console.log('[ProfessionalGanttChart] Calling onTaskUpdate with:', {
          taskId: prev.taskId,
          startDate: formatDateLocal(prev.currentStartDate),
          endDate: formatDateLocal(prev.currentEndDate),
          duration,
        });
        onTaskUpdate(prev.taskId, {
          startDate: formatDateLocal(prev.currentStartDate),
          endDate: formatDateLocal(prev.currentEndDate),
          duration,
        });
      }

      return null;
    });
  }, [onTaskUpdate]);

  // Add/remove global mouse event listeners
  useEffect(() => {
    if (dragState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = dragState.operation === 'move' ? 'grabbing' : 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragState, handleMouseMove, handleMouseUp]);

  // ============================================================================
  // OTHER EVENT HANDLERS
  // ============================================================================

  // Panel resize handlers
  const handlePanelResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingPanel(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = leftPanelWidth;
  }, [leftPanelWidth]);

  const handlePanelResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingPanel) return;
    const deltaX = e.clientX - resizeStartX.current;
    const newWidth = Math.max(300, Math.min(600, resizeStartWidth.current + deltaX));
    setLeftPanelWidth(newWidth);
  }, [isResizingPanel]);

  const handlePanelResizeEnd = useCallback(() => {
    setIsResizingPanel(false);
  }, []);

  // Add/remove panel resize event listeners
  useEffect(() => {
    if (isResizingPanel) {
      document.addEventListener('mousemove', handlePanelResizeMove);
      document.addEventListener('mouseup', handlePanelResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handlePanelResizeMove);
      document.removeEventListener('mouseup', handlePanelResizeEnd);
      if (!dragState) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
  }, [isResizingPanel, handlePanelResizeMove, handlePanelResizeEnd, dragState]);

  const togglePhase = useCallback((phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  }, []);

  const expandAllPhases = useCallback(() => {
    setExpandedPhases(new Set(phases.map(p => p.id)));
    setAllExpanded(true);
  }, [phases]);

  const collapseAllPhases = useCallback(() => {
    setExpandedPhases(new Set());
    setAllExpanded(false);
  }, []);

  // Synchronize horizontal scroll between body, header timeline, and top scrollbar
  const syncScrollFromBody = useCallback((scrollLeft: number) => {
    if (isSyncingScroll.current) return
    isSyncingScroll.current = true
    try {
      if (headerTimelineRef.current && headerTimelineRef.current.scrollLeft !== scrollLeft) {
        headerTimelineRef.current.scrollLeft = scrollLeft
      }
      if (topScrollRef.current && topScrollRef.current.scrollLeft !== scrollLeft) {
        topScrollRef.current.scrollLeft = scrollLeft
      }
    } finally {
      isSyncingScroll.current = false
    }
  }, [])

  const syncScrollToBody = useCallback((scrollLeft: number) => {
    if (isSyncingScroll.current) return
    isSyncingScroll.current = true
    try {
      if (bodyScrollRef.current && bodyScrollRef.current.scrollLeft !== scrollLeft) {
        bodyScrollRef.current.scrollLeft = scrollLeft
      }
      if (headerTimelineRef.current && headerTimelineRef.current.scrollLeft !== scrollLeft) {
        headerTimelineRef.current.scrollLeft = scrollLeft
      }
      if (topScrollRef.current && topScrollRef.current.scrollLeft !== scrollLeft) {
        topScrollRef.current.scrollLeft = scrollLeft
      }
    } finally {
      isSyncingScroll.current = false
    }
  }, [])

  const handleBodyScroll = useCallback(() => {
    if (!bodyScrollRef.current) return
    syncScrollFromBody(bodyScrollRef.current.scrollLeft)
  }, [syncScrollFromBody])

  const handleHeaderTimelineScroll = useCallback(() => {
    if (!headerTimelineRef.current) return
    syncScrollToBody(headerTimelineRef.current.scrollLeft)
  }, [syncScrollToBody])

  const handleTopScroll = useCallback(() => {
    if (!topScrollRef.current) return
    syncScrollToBody(topScrollRef.current.scrollLeft)
  }, [syncScrollToBody])

  // Scroll to show Today line and the task row for today (current week in view)
  const scrollToToday = useCallback(() => {
    const body = bodyScrollRef.current
    const vert = verticalScrollRef.current
    if (!body || !vert || rows.length === 0) return

    const today = new Date()
    const todayStart = startOfDay(today)
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

    // Horizontal: put Today line in view when there is room to scroll
    const clientWidth = body.clientWidth
    const maxScrollLeft = Math.max(0, leftPanelWidth + timelineWidth - clientWidth)
    if (timelineWidth > 0 && maxScrollLeft > 0) {
      const targetScrollLeft = Math.max(0, Math.min(maxScrollLeft, leftPanelWidth + todayPosition - clientWidth * 0.3))
      body.scrollLeft = targetScrollLeft
      syncScrollFromBody(targetScrollLeft)
    }

    // Vertical: prefer first TASK row that contains today; else first row overlapping current week
    const containsToday = (rowStart: Date, rowEnd: Date) => rowStart <= todayStart && rowEnd >= todayStart
    const overlapsWeek = (rowStart: Date, rowEnd: Date) => rowStart <= weekEnd && rowEnd >= weekStart
    let rowIndex = -1
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const start = row.type === 'phase' ? parseDate((row.data as GanttPhase).startDate) : parseDate((row.data as GanttTask).startDate)
      const end = row.type === 'phase' ? parseDate((row.data as GanttPhase).endDate) : parseDate((row.data as GanttTask).endDate)
      if (row.type === 'task' && containsToday(start, end)) {
        rowIndex = i
        break
      }
    }
    if (rowIndex < 0) {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const start = row.type === 'phase' ? parseDate((row.data as GanttPhase).startDate) : parseDate((row.data as GanttTask).startDate)
        const end = row.type === 'phase' ? parseDate((row.data as GanttPhase).endDate) : parseDate((row.data as GanttTask).endDate)
        if (overlapsWeek(start, end)) {
          rowIndex = i
          break
        }
      }
    }
    if (rowIndex < 0) rowIndex = 0
    let offset = 0
    for (let i = 0; i < rowIndex; i++) {
      offset += rows[i].type === 'phase' ? PHASE_ROW_HEIGHT : TASK_ROW_HEIGHT
    }
    const scrollTop = Math.max(0, offset - 80)
    vert.scrollTop = Math.min(scrollTop, Math.max(0, vert.scrollHeight - vert.clientHeight))
  }, [rows, todayPosition, timelineWidth, leftPanelWidth, syncScrollFromBody])

  useImperativeHandle(ref, () => ({
    expandAll: expandAllPhases,
    collapseAll: collapseAllPhases,
    scrollToToday,
  }), [expandAllPhases, collapseAllPhases, scrollToToday])

  // ============================================================================
  // RENDER TASK BAR
  // ============================================================================

  const renderTaskBar = useCallback((task: GanttTask, rowHeight: number) => {
    const isDragging = dragState?.taskId === task.id;
    const isHovered = hoveredTaskId === task.id;
    const showHandles = (isHovered || isDragging) && onTaskUpdate;

    // Use drag state dates if dragging, otherwise use task dates
    const taskStart = isDragging ? dragState.currentStartDate : parseDate(task.startDate);
    const taskEnd = isDragging ? dragState.currentEndDate : parseDate(task.endDate);
    const { left, width } = calculateBarPosition(taskStart, taskEnd);
    const statusColors = STATUS_COLORS[task.status];

    return (
      <div
        key={`task-bar-${task.id}`}
        className={cn("relative border-b", statusColors.bg)}
        style={{ height: rowHeight }}
      >
        {/* Grid lines */}
        <div className="absolute inset-0 flex pointer-events-none">
          {timeColumns.map((date, colIndex) => (
            <div
              key={colIndex}
              className={cn(
                "flex-shrink-0 border-r border-border/50",
                zoom === 'day' && isWeekend(date) && "bg-muted/30"
              )}
              style={{ width: columnWidth }}
            />
          ))}
        </div>

        {/* Duration label on the left of the bar */}
        <div 
          className="absolute text-[10px] text-muted-foreground font-medium pointer-events-none whitespace-nowrap"
          style={{
            left: left - 24,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          {task.duration || calculateBusinessDays(formatDateLocal(taskStart), formatDateLocal(taskEnd)) || 1}d
        </div>

        {/* Task bar container */}
        <div
          className="absolute top-2 h-6 group"
          style={{ left, width }}
          onMouseEnter={() => setHoveredTaskId(task.id)}
          onMouseLeave={() => !isDragging && setHoveredTaskId(null)}
        >
          {/* Background bar */}
          <div className={cn(
            "absolute inset-0 rounded-md transition-shadow",
            isDragging ? "bg-blue-500/30 shadow-lg" : "bg-blue-500/10 dark:bg-blue-500/20"
          )} />

          {/* Progress bar */}
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-l-md transition-all",
              statusColors.bar,
              task.progress === 100 && "rounded-r-md"
            )}
            style={{ width: `${task.progress}%` }}
          />

          {/* Main bar content - draggable for move */}
          <div
            className={cn(
              "absolute inset-0 rounded-md border-2 flex items-center justify-center transition-all",
              isDragging ? "border-blue-500 shadow-lg" : statusColors.border,
              onTaskUpdate && "cursor-grab active:cursor-grabbing"
            )}
            onMouseDown={(e) => onTaskUpdate && handleDragStart(e, task, 'move')}
          >
            {/* Duration text */}
            {width > 50 && (
              <span className="text-xs text-foreground font-medium pointer-events-none select-none">
                {task.duration || calculateBusinessDays(formatDateLocal(taskStart), formatDateLocal(taskEnd)) || 1}d
              </span>
            )}

            {/* Date tooltip on hover */}
            {(isHovered || isDragging) && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded border shadow-md whitespace-nowrap z-20 pointer-events-none">
                {format(taskStart, 'MMM d')} → {format(taskEnd, 'MMM d')}
              </div>
            )}
          </div>

          {/* Left resize handle */}
          {showHandles && (
            <div
              className={cn(
                "absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10",
                "flex items-center justify-center",
                "bg-primary opacity-0 group-hover:opacity-100 rounded-l-md transition-opacity",
                isDragging && dragState?.operation === 'resize-start' && "opacity-100"
              )}
              onMouseDown={(e) => handleDragStart(e, task, 'resize-start')}
            >
              <div className="w-0.5 h-3 bg-white rounded-full" />
            </div>
          )}

          {/* Right resize handle */}
          {showHandles && (
            <div
              className={cn(
                "absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10",
                "flex items-center justify-center",
                "bg-primary opacity-0 group-hover:opacity-100 rounded-r-md transition-opacity",
                isDragging && dragState?.operation === 'resize-end' && "opacity-100"
              )}
              onMouseDown={(e) => handleDragStart(e, task, 'resize-end')}
            >
              <div className="w-0.5 h-3 bg-white rounded-full" />
            </div>
          )}
        </div>
      </div>
    );
  }, [dragState, hoveredTaskId, calculateBarPosition, timeColumns, columnWidth, zoom, onTaskUpdate, handleDragStart]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Card
      ref={containerRef}
      className={cn(
        "bg-card text-card-foreground shadow-sm flex flex-col overflow-clip h-full max-h-full",
        className
      )}
    >
      {/* Gantt chart scroll container - vertical scroll here so header can stick */}
      <div
        ref={verticalScrollRef}
        className="flex-1 min-h-0 overflow-y-auto flex flex-col [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full"
      >
      {/* Sticky header - anchored at top of Gantt chart when scrolling the chart body */}
      <div className="sticky top-0 z-40 flex-shrink-0 bg-card shadow-sm border-b border-border/50">
      <CardHeader className="border-b-0 pb-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : (
              <CardDescription>
                {t("ganttDescription", { 
                  phaseCount: phases.length, 
                  activityCount: phases.reduce((acc, p) => acc + p.tasks.length, 0),
                  defaultValue: `${phases.length} fases, ${phases.reduce((acc, p) => acc + p.tasks.length, 0)} atividades`
                })}
              </CardDescription>
            )}
          </div>

          {/* Project Statistics - Top Right */}
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {Math.round(taskStats.avgProgress)}%
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{t("ganttAverageProgress", { defaultValue: "Progresso Médio" })}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    {taskStats.completed}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{t("ganttCompletedTasks", { defaultValue: "Tarefas Concluídas" })}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="destructive" className="gap-1 px-2">
                    <AlertCircle className="h-3 w-3" />
                    {taskStats.delayed}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{t("ganttDelayedTasks", { defaultValue: "Tarefas Atrasadas" })}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Toolbar Row */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("ganttSearchTasksAssignees", { defaultValue: "Buscar tarefas, responsáveis, categorias..." })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 md:max-w-xs"
            />
          </div>

          {/* Status Filter */}
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
            <SelectTrigger className="md:w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("ganttFilterAllTasks", { defaultValue: "Todas as..." })}</SelectItem>
              <SelectItem value="active">{t("ganttFilterActive", { defaultValue: "Ativas" })}</SelectItem>
              <SelectItem value="completed">{t("ganttFilterCompleted", { defaultValue: "Concluídas" })}</SelectItem>
              <SelectItem value="delayed">{t("ganttFilterDelayed", { defaultValue: "Atrasadas" })}</SelectItem>
              <SelectItem value="at_risk">{t("ganttFilterAtRisk", { defaultValue: "Em Risco" })}</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode */}
          <Select value={zoom} onValueChange={(v) => setZoom(v as ZoomLevel)}>
            <SelectTrigger className="md:w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">{t("ganttViewModeDaily", { defaultValue: "Diário" })}</SelectItem>
              <SelectItem value="week">{t("ganttViewModeWeekly", { defaultValue: "Semanal" })}</SelectItem>
              <SelectItem value="month">{t("ganttViewModeMonthly", { defaultValue: "Mensal" })}</SelectItem>
            </SelectContent>
          </Select>

          {/* Zoom Controls */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              title={t("zoomOut", { defaultValue: "Diminuir Zoom" })}
              onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              title={t("zoomIn", { defaultValue: "Aumentar Zoom" })}
              onClick={() => setZoomLevel(Math.min(14, zoomLevel + 1))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Working Days Mode Toggle */}
          {projectCalendar?.enabled && (
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
              <label className="text-sm font-medium whitespace-nowrap cursor-pointer">{t("ganttWorkingDaysMode", { defaultValue: "Modo Dias Úteis" })}</label>
              <input
                type="checkbox"
                checked={workingDaysMode}
                onChange={(e) => setWorkingDaysMode(e.target.checked)}
                className="rounded cursor-pointer"
              />
            </div>
          )}

          {/* Go to today */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => requestAnimationFrame(() => requestAnimationFrame(scrollToToday))}
            title={t("ganttGoToToday", { defaultValue: "Go to today" })}
          >
            <Calendar className="h-4 w-4 mr-2" />
            {t("ganttGoToToday", { defaultValue: "Go to today" })}
          </Button>
          {/* Expand/Collapse All */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (allExpanded) {
                collapseAllPhases();
              } else {
                expandAllPhases();
              }
            }}
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            {allExpanded ? t("collapseAll", { defaultValue: "Recolher Tudo" }) : t("expandAll", { defaultValue: "Expandir Tudo" })}
          </Button>
        </div>
      </CardHeader>

        {/* Chart Header - Column names + timeline */}
        <div className="flex flex-shrink-0 border-b bg-muted/95 backdrop-blur-sm">
          {/* Left Panel Header - opaque to prevent timeline showing through when scrolled */}
          <div
            className="flex-shrink-0 border-r bg-muted px-2 h-12 flex items-center shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.3)]"
            style={{ width: leftPanelWidth, minWidth: leftPanelWidth }}
          >
            <div className="flex items-center w-full font-medium text-muted-foreground text-sm">
              {/* Name Column */}
              <div 
                className="flex items-center relative flex-shrink-0"
                style={{ flex: `0 0 ${columnWidths.name}px`, width: columnWidths.name, minWidth: columnWidths.name }}
              >
                <Layers className="w-4 h-4 mr-1 text-muted-foreground" />
                <span className="truncate">{t("ganttTaskName", { defaultValue: "Nome da Tarefa" })}</span>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary z-20"
                  onMouseDown={(e) => handleColumnResizeStart(e, 'name')}
                />
              </div>
              {/* Start Date Column */}
              <div 
                className="text-center text-xs relative flex-shrink-0 flex items-center justify-center font-medium"
                style={{ flex: `0 0 ${columnWidths.startDate}px`, width: columnWidths.startDate, minWidth: columnWidths.startDate }}
              >
                {t("ganttStartDate", { defaultValue: "Início" })}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary z-20"
                  onMouseDown={(e) => handleColumnResizeStart(e, 'startDate')}
                />
              </div>
              {/* Duration Column */}
              <div 
                className="text-center text-xs relative flex-shrink-0 flex items-center justify-center font-medium"
                style={{ flex: `0 0 ${columnWidths.duration}px`, width: columnWidths.duration, minWidth: columnWidths.duration }}
              >
                {t("ganttDuration", { defaultValue: "Duração" })}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary z-20"
                  onMouseDown={(e) => handleColumnResizeStart(e, 'duration')}
                />
              </div>
              {/* End Date Column */}
              <div 
                className="text-center text-xs relative flex-shrink-0 flex items-center justify-center font-medium"
                style={{ flex: `0 0 ${columnWidths.endDate}px`, width: columnWidths.endDate, minWidth: columnWidths.endDate }}
              >
                {t("ganttEndDate", { defaultValue: "Fim" })}
              </div>
            </div>
          </div>

          {/* Timeline Header - Horizontally scrollable, synced with body */}
          <div
            ref={headerTimelineRef}
            className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden border-l [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full"
            onScroll={handleHeaderTimelineScroll}
          >
            <div className="flex h-12" style={{ minWidth: timelineWidth }}>
              {timeColumns.map((date, index) => {
                const isCurrentPeriod = zoom === 'day'
                  ? differenceInDays(new Date(), date) === 0
                  : zoom === 'week'
                    ? differenceInDays(new Date(), date) >= 0 && differenceInDays(new Date(), date) < 7
                    : isSameMonth(new Date(), date);

                const isWeekendDay = zoom === 'day' && isWeekend(date);

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex-shrink-0 border-r flex flex-col items-center justify-center",
                      isCurrentPeriod && "bg-blue-500/10 dark:bg-blue-500/20",
                      isWeekendDay && !isCurrentPeriod && "bg-muted/30"
                    )}
                    style={{ width: columnWidth }}
                  >
                    <span className={cn(
                      "text-[11px] font-bold",
                      isCurrentPeriod ? "text-blue-600 dark:text-blue-400" : "text-foreground"
                    )}>
                      {formatColumnHeader(date, zoom)}
                    </span>
                    <span className={cn(
                      "text-[10px]",
                      isCurrentPeriod ? "text-blue-500" : "text-muted-foreground"
                    )}>
                      {formatColumnSubheader(date, zoom)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Top horizontal scrollbar - visible, synced with body */}
        <div
          ref={topScrollRef}
          className="flex-shrink-0 overflow-x-auto overflow-y-hidden bg-muted/50 border-b min-h-[18px] [scrollbar-width:auto] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded-full"
          style={{ height: 20 }}
          onScroll={handleTopScroll}
        >
          <div style={{ width: leftPanelWidth + timelineWidth, height: 1 }} />
        </div>
      </div>

        {/* Body - Horizontal scroll only; vertical scroll is in outer container so header sticks */}
        <div
          ref={bodyScrollRef}
          className="overflow-x-auto overflow-y-visible relative flex-shrink-0 scrollbar-thin"
          onScroll={handleBodyScroll}
        >
        {/* Rows */}
        <div className="min-w-max relative">
          {/* Today Marker Line - Needs to be high enough z-index to show over bars but under header */}
          {todayPosition >= 0 && todayPosition <= timelineWidth && (
            <div 
              className="absolute top-0 bottom-0 w-px bg-primary z-10 pointer-events-none"
              style={{ left: `${leftPanelWidth + todayPosition}px` }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] font-bold px-1 py-0.5 rounded shadow-sm whitespace-nowrap">
                {t("ganttToday", { defaultValue: "HOJE" })}
              </div>
            </div>
          )}

          {rows.map((row, rowIndex) => {
            const rowHeight = row.type === 'phase' ? PHASE_ROW_HEIGHT : TASK_ROW_HEIGHT;
            
            return (
              <div key={`${row.type}-${row.data.id}`} className="flex min-w-max border-b group">
                {/* Left Panel Cell - Sticky horizontally, fully opaque to prevent timeline bars showing through */}
                <div 
                  className={cn(
                    "flex-shrink-0 border-r sticky left-0 z-30 px-2 flex items-center transition-colors shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_6px_-2px_rgba(0,0,0,0.3)]",
                    row.type === 'phase' ? "bg-muted hover:bg-muted/90" : "bg-background hover:bg-muted/30"
                  )}
                  style={{ width: leftPanelWidth, minWidth: leftPanelWidth, height: rowHeight }}
                >
                  {row.type === 'phase' ? (() => {
                    const phase = row.data as GanttPhase;
                    const isExpanded = expandedPhases.has(phase.id);
                    const phaseColor = PHASE_COLORS[row.phaseIndex % PHASE_COLORS.length];
                    const phaseStart = parseDate(phase.startDate);
                    const phaseEnd = parseDate(phase.endDate);
                    const phaseDuration = phase.duration || calculateBusinessDays(formatDateLocal(phaseStart), formatDateLocal(phaseEnd)) || 1;

                    return (
                      <div className="flex items-center w-full cursor-pointer" onClick={() => togglePhase(phase.id)}>
                        {/* Name Column */}
                        <div 
                          className="flex items-center gap-1 min-w-0 flex-shrink-0"
                          style={{ flex: `0 0 ${columnWidths.name}px`, width: columnWidths.name, minWidth: columnWidths.name }}
                        >
                          <button className="flex-shrink-0 p-0.5 hover:bg-muted rounded">
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            )}
                          </button>
                          <div className={cn("w-2 h-2 rounded-sm flex-shrink-0", phaseColor)} />
                          <span className="font-medium text-foreground truncate text-xs flex-shrink-0">
                            {phase.name}
                          </span>
                          <Badge variant="outline" className="flex-shrink-0 text-[10px] h-4 px-1 ml-1">
                            {phase.tasks.length}
                          </Badge>
                        </div>
                        {/* Start Date Column */}
                        <div 
                          className="text-center text-xs text-muted-foreground flex-shrink-0"
                          style={{ flex: `0 0 ${columnWidths.startDate}px`, width: columnWidths.startDate, minWidth: columnWidths.startDate }}
                        >
                          {format(phaseStart, 'dd/MM/yy')}
                        </div>
                        {/* Duration Column */}
                        <div 
                          className="text-center text-xs text-muted-foreground flex-shrink-0"
                          style={{ flex: `0 0 ${columnWidths.duration}px`, width: columnWidths.duration, minWidth: columnWidths.duration }}
                        >
                          {phaseDuration}d
                        </div>
                        {/* End Date Column */}
                        <div 
                          className="text-center text-xs text-muted-foreground flex-shrink-0"
                          style={{ flex: `0 0 ${columnWidths.endDate}px`, width: columnWidths.endDate, minWidth: columnWidths.endDate }}
                        >
                          {format(phaseEnd, 'dd/MM/yy')}
                        </div>
                      </div>
                    );
                  })() : (() => {
                    const task = row.data as GanttTask;
                    const statusColors = STATUS_COLORS[task.status];
                    const isDragging = dragState?.taskId === task.id;
                    const taskStart = isDragging ? dragState.currentStartDate : parseDate(task.startDate);
                    const taskEnd = isDragging ? dragState.currentEndDate : parseDate(task.endDate);
                    const taskDuration = task.duration || calculateBusinessDays(formatDateLocal(taskStart), formatDateLocal(taskEnd)) || 1;

                    return (
                      <div className="flex items-center w-full cursor-pointer" onClick={() => !isDragging && onTaskClick?.(task)} style={{ paddingLeft: `${(task.level || 1) * 12}px` }}>
                        {/* Name Column */}
                        <div 
                          className="flex items-center gap-1 min-w-0 flex-shrink-0"
                          style={{ flex: `0 0 ${columnWidths.name}px`, width: columnWidths.name, minWidth: columnWidths.name }}
                        >
                          {onTaskUpdate && (
                            <GripVertical className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
                          )}
                          <span className={cn("truncate text-xs flex-shrink-0", isDragging ? "text-blue-600 dark:text-blue-400 font-medium" : statusColors.text)}>
                            {task.name}
                          </span>
                        </div>
                        {/* Start Date Column */}
                        <div 
                          className="text-center text-xs text-muted-foreground flex-shrink-0"
                          style={{ flex: `0 0 ${columnWidths.startDate}px`, width: columnWidths.startDate, minWidth: columnWidths.startDate }}
                        >
                          {format(taskStart, 'dd/MM/yy')}
                        </div>
                        {/* Duration Column */}
                        <div 
                          className="text-center text-xs text-muted-foreground flex-shrink-0"
                          style={{ flex: `0 0 ${columnWidths.duration}px`, width: columnWidths.duration, minWidth: columnWidths.duration }}
                        >
                          {taskDuration}d
                        </div>
                        {/* End Date Column */}
                        <div 
                          className="text-center text-xs text-muted-foreground flex-shrink-0"
                          style={{ flex: `0 0 ${columnWidths.endDate}px`, width: columnWidths.endDate, minWidth: columnWidths.endDate }}
                        >
                          {format(taskEnd, 'dd/MM/yy')}
                        </div>
                        {task.progress > 0 && (
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">
                            {task.progress}%
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Timeline Bar Cell */}
                <div className="flex-shrink-0 relative overflow-hidden" style={{ width: timelineWidth, height: rowHeight }}>
                  {/* Grid lines background */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {timeColumns.map((date, colIndex) => (
                      <div
                        key={colIndex}
                        className={cn(
                          "flex-shrink-0 border-r border-border/50",
                          zoom === 'day' && isWeekend(date) && "bg-muted/30"
                        )}
                        style={{ width: columnWidth }}
                      />
                    ))}
                  </div>

                  {/* The bar itself */}
                  {row.type === 'phase' ? (() => {
                    const phase = row.data as GanttPhase;
                    const phaseColor = PHASE_COLORS[row.phaseIndex % PHASE_COLORS.length];
                    const phaseStart = parseDate(phase.startDate);
                    const phaseEnd = parseDate(phase.endDate);
                    const { left, width } = calculateBarPosition(phaseStart, phaseEnd);

                    return (
                      <div
                        className="absolute top-2 h-7 flex items-center"
                        style={{ left, width }}
                      >
                        <div className={cn(
                          "h-full w-full rounded-md flex items-center px-2 text-white text-xs font-medium shadow-sm",
                          phaseColor
                        )}>
                          <span className="truncate opacity-90">
                            {format(phaseStart, 'MMM d')} - {format(phaseEnd, 'MMM d')}
                          </span>
                        </div>
                      </div>
                    );
                  })() : (() => {
                    const task = row.data as GanttTask;
                    const isDragging = dragState?.taskId === task.id;
                    const isHovered = hoveredTaskId === task.id;
                    const showHandles = (isHovered || isDragging) && onTaskUpdate;
                    const taskStart = isDragging ? dragState.currentStartDate : parseDate(task.startDate);
                    const taskEnd = isDragging ? dragState.currentEndDate : parseDate(task.endDate);
                    const { left, width } = calculateBarPosition(taskStart, taskEnd);
                    const statusColors = STATUS_COLORS[task.status];

                    return (
                      <>
                        {/* Duration label on the left of the bar */}
                        <div 
                          className="absolute text-[10px] text-muted-foreground font-medium pointer-events-none whitespace-nowrap"
                          style={{
                            left: left - 24,
                            top: "50%",
                            transform: "translateY(-50%)",
                          }}
                        >
                          {task.duration || calculateBusinessDays(formatDateLocal(taskStart), formatDateLocal(taskEnd)) || 1}d
                        </div>

                        {/* Task bar container */}
                        <div
                          className="absolute top-2 h-6 group/bar"
                          style={{ left, width }}
                          onMouseEnter={() => setHoveredTaskId(task.id)}
                          onMouseLeave={() => !isDragging && setHoveredTaskId(null)}
                        >
                          {/* Background bar */}
                          <div className={cn(
                            "absolute inset-0 rounded-md transition-shadow",
                            isDragging ? "bg-blue-500/30 shadow-lg" : "bg-blue-500/10 dark:bg-blue-500/20"
                          )} />

                          {/* Progress bar */}
                          <div
                            className={cn(
                              "absolute inset-y-0 left-0 rounded-l-md transition-all",
                              statusColors.bar,
                              task.progress === 100 && "rounded-r-md"
                            )}
                            style={{ width: `${task.progress}%` }}
                          />

                          {/* Main bar content - draggable for move */}
                          <div
                            className={cn(
                              "absolute inset-0 rounded-md border-2 flex items-center justify-center transition-all",
                              isDragging ? "border-blue-500 shadow-lg" : statusColors.border,
                              onTaskUpdate && "cursor-grab active:cursor-grabbing"
                            )}
                            onMouseDown={(e) => onTaskUpdate && handleDragStart(e, task, 'move')}
                          >
                            {/* Duration text */}
                            {width > 50 && (
                              <span className="text-xs text-foreground font-medium pointer-events-none select-none">
                                {task.duration || calculateBusinessDays(formatDateLocal(taskStart), formatDateLocal(taskEnd)) || 1}d
                              </span>
                            )}

                            {/* Date tooltip on hover */}
                            {(isHovered || isDragging) && (
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded border shadow-md whitespace-nowrap z-20 pointer-events-none">
                                {format(taskStart, 'MMM d')} → {format(taskEnd, 'MMM d')}
                              </div>
                            )}
                          </div>

                          {/* Left resize handle */}
                          {showHandles && (
                            <div
                              className={cn(
                                "absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10",
                                "flex items-center justify-center",
                                "bg-primary opacity-0 group-hover/bar:opacity-100 rounded-l-md transition-opacity",
                                isDragging && dragState?.operation === 'resize-start' && "opacity-100"
                              )}
                              onMouseDown={(e) => handleDragStart(e, task, 'resize-start')}
                            >
                              <div className="w-0.5 h-3 bg-white rounded-full" />
                            </div>
                          )}

                          {/* Right resize handle */}
                          {showHandles && (
                            <div
                              className={cn(
                                "absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10",
                                "flex items-center justify-center",
                                "bg-primary opacity-0 group-hover/bar:opacity-100 rounded-r-md transition-opacity",
                                isDragging && dragState?.operation === 'resize-end' && "opacity-100"
                              )}
                              onMouseDown={(e) => handleDragStart(e, task, 'resize-end')}
                            >
                              <div className="w-0.5 h-3 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {rows.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            {t("gantt.noData", { defaultValue: "No activities to display" })}
          </div>
        )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/50 text-xs text-muted-foreground flex-shrink-0">
        <div className="flex items-center gap-4">
          {onTaskUpdate && (
            <span className="text-primary font-medium">
              {t("ganttDragHint", { defaultValue: "Drag bars to move or resize" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span>{t("ganttStatusCompleted", { defaultValue: "Completed" })}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span>{t("ganttStatusInProgress", { defaultValue: "In Progress" })}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span>{t("ganttStatusDelayed", { defaultValue: "Delayed" })}</span>
          </div>
        </div>
      </div>
    </Card>
  );
});

ProfessionalGanttChart.displayName = 'ProfessionalGanttChart';

export default ProfessionalGanttChart;
