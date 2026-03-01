import * as React from "react";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  differenceInDays,
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDateFormat } from "@/hooks/useDateFormat";
import { parseLocalDate, formatDateLocal } from "@/utils/scheduleCalculators";

import { useLocalization } from "@/contexts/LocalizationContext";
/**
 * Microsoft Project-like task interface
 */
export interface MSProjectTask {
  id: string | number;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  duration?: number;
  progress: number; // 0-100
  status: "not_started" | "in_progress" | "completed" | "delayed" | "at_risk";
  priority: "low" | "medium" | "high" | "critical";
  assignees?: string[];
  dependencies?: (string | number)[]; // IDs of tasks this depends on
  milestone?: boolean;
  subtasks?: MSProjectTask[];
  effort?: number; // person-hours
  cost?: number;
  notes?: string;
  category?: string;
}

export interface MicrosoftProjectLikeProps {
  /**
   * Array of tasks to display
   */
  tasks: MSProjectTask[];
  /**
   * Title of the project/view
   */
  title?: string;
  /**
   * Optional description
   */
  description?: string;
  /**
   * Callback when a task is clicked
   */
  onTaskClick?: (task: MSProjectTask) => void;
  /**
   * Callback when a task is edited
   */
  onTaskEdit?: (task: MSProjectTask) => void;
  /**
   * Show critical path highlighting
   * @default true
   */
  showCriticalPath?: boolean;
  /**
   * Show resource allocation
   * @default true
   */
  showResources?: boolean;
  /**
   * Show milestone markers
   * @default true
   */
  showMilestones?: boolean;
  /**
   * Show dependencies lines
   * @default true
   */
  showDependencies?: boolean;
   /**
    * Allow task expansion/collapse
    * @default true
    */
   collapsible?: boolean;
   /**
    * Initial zoom level (days per column)
    * @default 7
    */
   initialZoom?: number;
   /**
    * Show working days mode (compress weekends/holidays)
    * @default false
    */
   showWorkingDaysMode?: boolean;
   /**
    * Project calendar settings for working day calculations
    */
   projectCalendar?: {
     enabled: boolean;
     workingDays: string[];
     holidays: Array<{ date: string; reason: string }>;
   };
   /**
    * Custom class name
    */
    className?: string;
 }

 type ViewMode = "day" | "week" | "month" | "quarter";
type FilterStatus = "all" | "active" | "completed" | "delayed" | "at_risk";

/**
 * MicrosoftProjectLike - A comprehensive project management Gantt chart
 * inspired by Microsoft Project
 */
export const MicrosoftProjectLike = React.forwardRef<
  HTMLDivElement,
  MicrosoftProjectLikeProps
>(
  (
    {
      tasks,
      title = "Project Timeline",
      description,
      onTaskClick,
      onTaskEdit,
      showCriticalPath = true,
      showResources = true,
      showMilestones = true,
      showDependencies = true,
      collapsible = true,
      initialZoom = 7,
      showWorkingDaysMode = false,
      projectCalendar,
      className,
    },
    ref
  ) => {
    const { formatShortDate, formatMonthYear } = useDateFormat();
    const { t } = useLocalization();
    const [expandedTasks, setExpandedTasks] = useState<Set<string | number>>(
      new Set(tasks.map((t) => t.id))
    );
    const [viewMode, setViewMode] = useState<ViewMode>("week");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [zoom, setZoom] = useState(initialZoom);
    const [workingDaysMode, setWorkingDaysMode] = useState(false);
    
    // Task interaction state
    const [interactingTask, setInteractingTask] = useState<string | number | null>(null);
    const [interactionType, setInteractionType] = useState<"move" | "resize-start" | "resize-end" | null>(null);
    const [initialMouseX, setInitialMouseX] = useState(0);
    const [initialTaskDates, setInitialTaskDates] = useState<{ start: Date; end: Date } | null>(null);
    const [previewDates, setPreviewDates] = useState<{ start: Date; end: Date; taskId: string | number } | null>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    // Resizable column widths with localStorage persistence
    const STORAGE_KEY = 'gantt-column-widths';
    const DEFAULT_COLUMN_WIDTHS = {
      taskName: 200,
      startDate: 90,
      duration: 70,
      endDate: 90,
      assignees: 50,
    };
    
    const [columnWidths, setColumnWidths] = useState(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return { ...DEFAULT_COLUMN_WIDTHS, ...JSON.parse(stored) };
        }
      } catch (e) {
        // Ignore localStorage errors
      }
      return DEFAULT_COLUMN_WIDTHS;
    });

    // Column resize state
    const [resizingColumn, setResizingColumn] = useState<keyof typeof DEFAULT_COLUMN_WIDTHS | null>(null);
    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(0);

    // Save column widths to localStorage
    useEffect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(columnWidths));
      } catch (e) {
        // Ignore localStorage errors
      }
    }, [columnWidths]);

    // Column resize handlers
    const handleColumnResizeStart = (e: React.MouseEvent, column: keyof typeof DEFAULT_COLUMN_WIDTHS) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingColumn(column);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = columnWidths[column];
    };

    const handleColumnResizeMove = useCallback((e: MouseEvent) => {
      if (!resizingColumn) return;
      const delta = e.clientX - resizeStartX.current;
      const minWidth = resizingColumn === 'taskName' ? 150 : 50;
      const maxWidth = resizingColumn === 'taskName' ? 400 : 150;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartWidth.current + delta));
      setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
    }, [resizingColumn]);

    const handleColumnResizeEnd = useCallback(() => {
      setResizingColumn(null);
    }, []);

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
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }, [resizingColumn, handleColumnResizeMove, handleColumnResizeEnd]);

    // Calculate total left panel width
    const leftPanelWidth = columnWidths.taskName + columnWidths.startDate + columnWidths.duration + columnWidths.endDate + (showResources ? columnWidths.assignees : 0);

    // Working day helper functions
    const isWorkingDay = (date: Date): boolean => {
      if (!projectCalendar?.enabled || !workingDaysMode) return true;

      // Check if it's a holiday
      const dateStr = format(date, 'yyyy-MM-dd');
      const isHoliday = projectCalendar.holidays.some(h => h.date === dateStr);
      if (isHoliday) return false;

      // Check if it's a working day of the week
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[date.getDay()];
      return projectCalendar.workingDays.includes(dayName);
    };

    const getWorkingDayOffset = (date: Date, timelineStart: Date): number => {
      if (!projectCalendar?.enabled || !workingDaysMode) {
        return differenceInDays(date, timelineStart);
      }

      let workingDays = 0;
      let current = new Date(timelineStart);

      while (current < date) {
        if (isWorkingDay(current)) {
          workingDays++;
        }
        current = addDays(current, 1);
      }

      return workingDays;
    };

    // Toggle task expansion
    const toggleTask = (taskId: string | number) => {
      if (!collapsible) return;

      setExpandedTasks((prev) => {
        const next = new Set(prev);
        if (next.has(taskId)) {
          next.delete(taskId);
        } else {
          next.add(taskId);
        }
        return next;
      });
    };

    // Flatten tasks for rendering (includes expanded subtasks)
    const flattenedTasks = useMemo(() => {
      const flattened: Array<MSProjectTask & { level: number; parentId?: string | number }> = [];

      const flatten = (
        taskList: MSProjectTask[],
        level = 0,
        parentId?: string | number
      ) => {
        taskList.forEach((task) => {
          flattened.push({ ...task, level, parentId });

          if (
            task.subtasks &&
            task.subtasks.length > 0 &&
            expandedTasks.has(task.id)
          ) {
            flatten(task.subtasks, level + 1, task.id);
          }
        });
      };

      flatten(tasks);
      return flattened;
    }, [tasks, expandedTasks]);

    // Filter tasks
    const filteredTasks = useMemo(() => {
      return flattenedTasks.filter((task) => {
        // Search filter
        const matchesSearch =
          searchQuery.trim() === "" ||
          task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.assignees?.some((a) =>
            a.toLowerCase().includes(searchQuery.toLowerCase())
          ) ||
          task.category?.toLowerCase().includes(searchQuery.toLowerCase());

        // Status filter
        const matchesStatus =
          filterStatus === "all" ||
          (filterStatus === "active" &&
            (task.status === "in_progress" || task.status === "not_started")) ||
          (filterStatus === "completed" && task.status === "completed") ||
          (filterStatus === "delayed" && task.status === "delayed") ||
          (filterStatus === "at_risk" && task.status === "at_risk");

        return matchesSearch && matchesStatus;
      });
    }, [flattenedTasks, searchQuery, filterStatus]);

    // Calculate timeline bounds
    const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
      if (filteredTasks.length === 0) {
        const today = new Date();
        return {
          timelineStart: today,
          timelineEnd: addDays(today, 30),
          totalDays: 30,
        };
      }

      const dates = filteredTasks
        .flatMap((t) => [
          typeof t.startDate === "string" ? parseLocalDate(t.startDate) : t.startDate,
          typeof t.endDate === "string" ? parseLocalDate(t.endDate) : t.endDate,
        ])
        .filter((d): d is Date => d !== undefined && d !== null && d instanceof Date && !isNaN(d.getTime()));

      if (dates.length === 0) {
        const today = new Date();
        return {
          timelineStart: today,
          timelineEnd: addDays(today, 30),
          totalDays: 30,
        };
      }

      const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

      return {
        timelineStart: startOfMonth(minDate),
        timelineEnd: endOfMonth(addDays(maxDate, 7)), // Add padding
        totalDays: differenceInDays(
          endOfMonth(addDays(maxDate, 7)),
          startOfMonth(minDate)
        ),
      };
    }, [filteredTasks]);

    // Calculate column width based on viewMode and zoom
    const columnWidth = useMemo(() => {
      const baseWidth = {
        day: 30,
        week: 80,
        month: 100,
        quarter: 120,
      };
      return baseWidth[viewMode] * (zoom / 7); // zoom 7 = 100%
    }, [viewMode, zoom]);

    // Calculate total timeline width
    const timelineWidth = useMemo(() => {
      const columns = [];
      let current = new Date(timelineStart);
      const end = new Date(timelineEnd);
      while (current <= end) {
        columns.push(current);
        switch (viewMode) {
          case "day": current = addDays(current, 1); break;
          case "week": current = addDays(current, 7); break;
          case "month": current = addDays(current, 30); break;
          case "quarter": current = addDays(current, 90); break;
        }
      }
      return columns.length * columnWidth;
    }, [timelineStart, timelineEnd, viewMode, columnWidth]);

    // Calculate today marker position
    const todayPosition = useMemo(() => {
      const today = new Date();
      const offset = differenceInDays(today, timelineStart);
      const daysPerColumn: Record<ViewMode, number> = {
        day: 1,
        week: 7,
        month: 30,
        quarter: 90,
      };
      const pixelsPerDay = columnWidth / daysPerColumn[viewMode];
      return offset * pixelsPerDay;
    }, [timelineStart, columnWidth, viewMode]);

    // Get task position on timeline
    const getTaskPosition = (task: MSProjectTask) => {
      const start =
        typeof task.startDate === "string"
          ? parseLocalDate(task.startDate)
          : task.startDate;
      const end =
        typeof task.endDate === "string" ? parseLocalDate(task.endDate) : task.endDate;

      if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { left: '0px', width: '0px' };
      }

      const daysPerColumn = { day: 1, week: 7, month: 30, quarter: 90 };
      const pixelsPerDay = columnWidth / daysPerColumn[viewMode];

      let startOffset: number;
      let duration: number;

      if (projectCalendar?.enabled && workingDaysMode) {
        startOffset = getWorkingDayOffset(start, timelineStart);
        let workingDays = 0;
        let current = new Date(start);
        while (current <= end) {
          if (isWorkingDay(current)) workingDays++;
          current = addDays(current, 1);
        }
        duration = Math.max(1, workingDays);
      } else {
        startOffset = differenceInDays(start, timelineStart);
        duration = differenceInDays(end, start) + 1;
      }

      return {
        left: `${Math.max(0, startOffset * pixelsPerDay)}px`,
        width: `${Math.max(4, duration * pixelsPerDay)}px`,
      };
    };

    const getStatusColor = (status: MSProjectTask["status"]) => {
      switch (status) {
        case "completed": return "bg-success";
        case "in_progress": return "bg-primary";
        case "delayed": return "bg-destructive";
        case "at_risk": return "bg-orange-500";
        default: return "bg-muted";
      }
    };

    const getPriorityVariant = (priority: MSProjectTask["priority"]) => {
      switch (priority) {
        case "critical": return "destructive";
        case "high": return "default";
        case "medium": return "secondary";
        default: return "outline";
      }
    };

    const timelineColumns = useMemo(() => {
      const columns: Date[] = [];
      let current = new Date(timelineStart);
      const end = new Date(timelineEnd);
      while (current <= end) {
        columns.push(new Date(current));
        switch (viewMode) {
          case "day": current = addDays(current, 1); break;
          case "week": current = addDays(current, 7); break;
          case "month": current = addDays(current, 30); break;
          case "quarter": current = addDays(current, 90); break;
        }
      }
      return columns;
    }, [timelineStart, timelineEnd, viewMode]);

    const formatColumnHeader = (date: Date) => {
      switch (viewMode) {
        case "day": return formatShortDate(date);
        case "week": return formatShortDate(date);
        case "month": return formatMonthYear(date);
        case "quarter": return format(date, "QQQ yyyy");
        default: return formatShortDate(date);
      }
    };

    const handleInteractionStart = (
      e: React.MouseEvent,
      task: MSProjectTask,
      type: "move" | "resize-start" | "resize-end"
    ) => {
      e.stopPropagation();
      e.preventDefault();
      const start = typeof task.startDate === "string" ? parseLocalDate(task.startDate) : task.startDate;
      const end = typeof task.endDate === "string" ? parseLocalDate(task.endDate) : task.endDate;
      if (!start || !end) return;
      setInteractingTask(task.id);
      setInteractionType(type);
      setInitialMouseX(e.clientX);
      setInitialTaskDates({ start, end });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!interactingTask || !interactionType || !initialTaskDates || !timelineRef.current) return;
      const deltaX = e.clientX - initialMouseX;
      const daysPerColumn = { day: 1, week: 7, month: 30, quarter: 90 };
      const pixelsPerDay = columnWidth / daysPerColumn[viewMode];
      const daysDelta = Math.round(deltaX / pixelsPerDay);

      let newStart = initialTaskDates.start;
      let newEnd = initialTaskDates.end;

      if (interactionType === "move") {
        newStart = addDays(initialTaskDates.start, daysDelta);
        newEnd = addDays(initialTaskDates.end, daysDelta);
      } else if (interactionType === "resize-start") {
        newStart = addDays(initialTaskDates.start, daysDelta);
        if (newStart >= newEnd) newStart = addDays(newEnd, -1);
      } else if (interactionType === "resize-end") {
        newEnd = addDays(initialTaskDates.end, daysDelta);
        if (newEnd <= newStart) newEnd = addDays(newStart, 1);
      }

      setPreviewDates({ start: newStart, end: newEnd, taskId: interactingTask });
    }, [interactingTask, interactionType, initialMouseX, initialTaskDates, columnWidth, viewMode]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
      if (!interactingTask || !interactionType || !initialTaskDates || !timelineRef.current) {
        setInteractingTask(null);
        setInteractionType(null);
        return;
      }
      const deltaX = e.clientX - initialMouseX;
      const daysPerColumn = { day: 1, week: 7, month: 30, quarter: 90 };
      const pixelsPerDay = columnWidth / daysPerColumn[viewMode];
      const daysDelta = Math.round(deltaX / pixelsPerDay);

      if (daysDelta !== 0) {
        const task = tasks.find(t => t.id === interactingTask);
        if (task && onTaskEdit) {
            let newStart = initialTaskDates.start;
            let newEnd = initialTaskDates.end;
            if (interactionType === "move") {
              newStart = addDays(initialTaskDates.start, daysDelta);
              newEnd = addDays(initialTaskDates.end, daysDelta);
            } else if (interactionType === "resize-start") {
              newStart = addDays(initialTaskDates.start, daysDelta);
              if (newStart >= newEnd) newStart = addDays(newEnd, -1);
            } else if (interactionType === "resize-end") {
              newEnd = addDays(initialTaskDates.end, daysDelta);
              if (newEnd <= newStart) newEnd = addDays(newStart, 1);
            }
            onTaskEdit({
              ...task,
              startDate: newStart,
              endDate: newEnd,
              duration: Math.max(1, differenceInDays(newEnd, newStart) + 1)
            });
        }
      }
      setTimeout(() => {
        setInteractingTask(null);
        setInteractionType(null);
        setInitialTaskDates(null);
        setPreviewDates(null);
      }, 50);
    }, [interactingTask, interactionType, initialMouseX, initialTaskDates, columnWidth, viewMode, tasks, onTaskEdit]);

    useEffect(() => {
      if (interactingTask) {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
      } else {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      }
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }, [interactingTask, handleMouseMove, handleMouseUp]);

    const taskStats = useMemo(() => {
      const stats = { total: tasks.length, completed: 0, inProgress: 0, delayed: 0, notStarted: 0, avgProgress: 0 };
      let totalProgress = 0;
      tasks.forEach((task) => {
        totalProgress += task.progress;
        switch (task.status) {
          case "completed": stats.completed++; break;
          case "in_progress": stats.inProgress++; break;
          case "delayed": stats.delayed++; break;
          case "not_started": stats.notStarted++; break;
        }
      });
      stats.avgProgress = tasks.length > 0 ? totalProgress / tasks.length : 0;
      return stats;
    }, [tasks]);

    if (tasks.length === 0) {
      return (
        <Card ref={ref} className={className}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">{t("messages.noTasksToDisplay")}</p>
              <p className="text-sm mt-1">{t("messages.addTasksToSeeTimeline")}</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card ref={ref} className={cn("flex flex-col min-h-0", className)}>
        <CardHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {Math.round(taskStats.avgProgress)}%
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{t("ganttAverageProgress")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      {taskStats.completed}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{t("ganttCompletedTasks")}</TooltipContent>
                </Tooltip>
                {taskStats.delayed > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {taskStats.delayed}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>{t("ganttDelayedTasks")}</TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 mt-4">
            <Input
              placeholder={t("ganttSearchTasksAssignees")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="md:max-w-xs"
            />
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger className="md:w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("ganttFilterAllTasks")}</SelectItem>
                <SelectItem value="active">{t("ganttFilterActive")}</SelectItem>
                <SelectItem value="completed">{t("ganttFilterCompleted")}</SelectItem>
                <SelectItem value="delayed">{t("ganttFilterDelayed")}</SelectItem>
                <SelectItem value="at_risk">{t("ganttFilterAtRisk")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="md:w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">{t("ganttViewModeDaily")}</SelectItem>
                <SelectItem value="week">{t("ganttViewModeWeekly")}</SelectItem>
                <SelectItem value="month">{t("ganttViewModeMonthly")}</SelectItem>
                <SelectItem value="quarter">{t("ganttViewModeQuarterly")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(1, zoom - 1))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(30, zoom + 1))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            {showWorkingDaysMode && projectCalendar?.enabled && (
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
                <label className="text-sm font-medium">{t("ganttWorkingDaysMode")}</label>
                <input type="checkbox" checked={workingDaysMode} onChange={(e) => setWorkingDaysMode(e.target.checked)} className="rounded" />
              </div>
            )}
            {collapsible && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (expandedTasks.size === tasks.length) setExpandedTasks(new Set());
                  else setExpandedTasks(new Set(tasks.map((t) => t.id)));
                }}
              >
                <Maximize2 className="h-4 w-4 mr-2" />
                {expandedTasks.size === tasks.length ? t("collapseAll") : t("expandAll")}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex border-t flex-1 min-h-0">
            <div className="flex-shrink-0 bg-background border-r flex flex-col min-h-0" style={{ width: leftPanelWidth + 16 }}>
              <div className="flex-shrink-0 flex border-b h-10 items-center px-2 bg-muted/30 sticky top-0 z-10">
                <div className="flex-shrink-0 font-medium text-sm flex items-center relative" style={{ width: columnWidths.taskName }}>
                  {t("ganttTaskName")}
                  <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-20" onMouseDown={(e) => handleColumnResizeStart(e, 'taskName')} />
                </div>
                <div className="flex-shrink-0 text-center font-medium text-sm flex items-center justify-center relative" style={{ width: columnWidths.startDate }}>
                  {t("gantt.startDate", { defaultValue: "Start" })}
                  <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-20" onMouseDown={(e) => handleColumnResizeStart(e, 'startDate')} />
                </div>
                <div className="flex-shrink-0 text-center font-medium text-sm flex items-center justify-center relative" style={{ width: columnWidths.duration }}>
                  {t("ganttDuration")}
                  <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-20" onMouseDown={(e) => handleColumnResizeStart(e, 'duration')} />
                </div>
                <div className="flex-shrink-0 text-center font-medium text-sm flex items-center justify-center relative" style={{ width: columnWidths.endDate }}>
                  {t("gantt.endDate", { defaultValue: "End" })}
                  <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-20" onMouseDown={(e) => handleColumnResizeStart(e, 'endDate')} />
                </div>
                {showResources && (
                  <div className="flex-shrink-0 text-center font-medium text-sm flex items-center justify-center" style={{ width: columnWidths.assignees }}>
                    {t("ganttAssignees")}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-h-0 no-scrollbar">
                {filteredTasks.map((task) => {
                  const isInteracting = interactingTask === task.id;
                  const currentTaskDates = isInteracting && previewDates 
                    ? { startDate: previewDates.start, endDate: previewDates.end } 
                    : { startDate: task.startDate, endDate: task.endDate };
                  const isExpanded = expandedTasks.has(task.id);
                  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

                  return (
                    <div key={`left-${task.id}`} className={cn("flex items-center h-10 border-b hover:bg-muted/50 px-2", task.milestone && "bg-primary/20")}>
                      <div className="flex-shrink-0 pr-1 flex items-center gap-1 overflow-hidden" style={{ width: columnWidths.taskName, paddingLeft: `${task.level * 12}px` }}>
                        {collapsible && hasSubtasks && (
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 flex-shrink-0" onClick={() => toggleTask(task.id)}>
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </Button>
                        )}
                        {!hasSubtasks && collapsible && <div className="w-5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            {task.milestone && <div className="w-2 h-2 rotate-45 bg-primary flex-shrink-0" />}
                            <p className="text-xs font-medium truncate cursor-pointer hover:text-primary" onClick={() => onTaskClick?.(task)} title={task.name}>{task.name}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge variant={getPriorityVariant(task.priority)} className="text-[9px] h-3.5 px-1">{task.priority}</Badge>
                            {task.category && <span className="text-[9px] text-muted-foreground truncate">{task.category}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-center text-xs text-muted-foreground" style={{ width: columnWidths.startDate }}>
                        {(() => {
                          const start = currentTaskDates.startDate instanceof Date ? currentTaskDates.startDate : (parseLocalDate(currentTaskDates.startDate as string) || new Date());
                          return format(start, 'dd/MM/yy');
                        })()}
                      </div>
                      <div className="flex-shrink-0 text-center text-xs text-muted-foreground" style={{ width: columnWidths.duration }}>
                        {task.duration || 0} {t("days")}
                      </div>
                      <div className="flex-shrink-0 text-center text-xs text-muted-foreground" style={{ width: columnWidths.endDate }}>
                        {(() => {
                          const end = currentTaskDates.endDate instanceof Date ? currentTaskDates.endDate : (parseLocalDate(currentTaskDates.endDate as string) || new Date());
                          return format(end, 'dd/MM/yy');
                        })()}
                      </div>
                      {showResources && (
                        <div className="flex-shrink-0 text-center" style={{ width: columnWidths.assignees }}>
                          {task.assignees && task.assignees.length > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center justify-center gap-1">
                                    <Users className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs">{task.assignees.length}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>{task.assignees.join(", ")}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : <span className="text-xs text-muted-foreground">-</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-x-scroll flex flex-col min-h-0 scrollbar-thin" ref={timelineRef}>
              <div className="flex-shrink-0 flex border-b h-10 items-center bg-muted/30 sticky top-0 z-10" style={{ width: timelineWidth }}>
                {timelineColumns.map((col, idx) => {
                  const isNonWorking = projectCalendar?.enabled && workingDaysMode && !isWorkingDay(col);
                  const isToday = differenceInDays(col, new Date()) === 0;
                  return (
                    <div key={idx} className={cn("flex-shrink-0 text-center text-xs font-medium border-l h-full flex flex-col justify-center", isNonWorking ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300" : isToday ? "bg-primary/10 text-primary" : "text-muted-foreground")} style={{ width: columnWidth }}>
                      {formatColumnHeader(col)}
                      {isToday && <span className="text-[8px] text-primary font-bold">{t("ganttToday")}</span>}
                    </div>
                  );
                })}
              </div>

              <div className="flex-1 min-h-0 no-scrollbar relative" style={{ width: timelineWidth }}>
                {todayPosition >= 0 && todayPosition <= timelineWidth && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none" style={{ left: `${todayPosition}px` }} />
                )}
                {filteredTasks.map((task) => {
                  const isInteracting = interactingTask === task.id;
                  const currentTaskDates = isInteracting && previewDates ? { startDate: previewDates.start, endDate: previewDates.end } : { startDate: task.startDate, endDate: task.endDate };
                  const position = getTaskPosition({ ...task, startDate: currentTaskDates.startDate, endDate: currentTaskDates.endDate });
                  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

                  return (
                    <div key={`right-${task.id}`} className={cn("relative h-10 border-b hover:bg-muted/50", task.milestone && "bg-primary/20")}>
                      <div className="absolute text-[10px] text-muted-foreground font-medium pointer-events-none whitespace-nowrap" style={{ left: `calc(${position.left} - 24px)`, top: "50%", transform: "translateY(-50%)" }}>
                        {task.duration || 0}d
                      </div>
                      <div
                        className={cn("absolute h-6 rounded transition-all group-hover:shadow-md bg-blue-200", task.milestone ? "h-3 w-3 rounded-full rotate-45" : (!hasSubtasks ? "cursor-move" : ""), interactingTask === task.id && "z-20 ring-2 ring-primary opacity-100 shadow-lg")}
                        style={{ left: position.left, width: task.milestone ? "12px" : position.width, top: "50%", transform: task.milestone ? "translateY(-50%) rotate(45deg)" : "translateY(-50%)", minWidth: task.milestone ? "12px" : "4px" }}
                        onMouseDown={(e) => !task.milestone && !hasSubtasks && handleInteractionStart(e, task, "move")}
                        onClick={() => !interactingTask && onTaskClick?.(task)}
                      >
                        {!task.milestone && (
                          <>
                            {!hasSubtasks && (
                              <>
                                <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-10 rounded-l" onMouseDown={(e) => handleInteractionStart(e, task, "resize-start")} />
                                <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 z-10 rounded-r" onMouseDown={(e) => handleInteractionStart(e, task, "resize-end")} />
                              </>
                            )}
                            <div className="h-full bg-blue-500 rounded-l pointer-events-none" style={{ width: `${task.progress}%` }} />
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-blue-900 font-medium px-1 pointer-events-none">{task.progress}%</div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

MicrosoftProjectLike.displayName = "MicrosoftProjectLike";
