/**
 * Unified Gantt Chart Component
 *
 * A consolidated Gantt chart that merges the best features of:
 * - MicrosoftProjectLike (drag/resize, critical path, resources)
 * - ProjectPhases GanttChart (dependency arrows, phase grouping)
 *
 * Features:
 * - Drag-to-move and drag-to-resize tasks
 * - SVG dependency arrows with multiple types (FS, SS, FF, SF)
 * - Critical path highlighting
 * - Working days calendar support
 * - Multiple zoom levels (day, week, month)
 * - Hierarchical task nesting with expand/collapse
 * - Search and filter capabilities
 * - Visual progress tracking
 * - Milestone markers
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  differenceInDays,
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  parseISO,
} from 'date-fns';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronDown,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';

import type {
  UnifiedTask,
  UnifiedGanttChartProps,
  GanttInteractionState,
  GanttDisplayState,
  TimelineRange,
} from './types';

import {
  flattenTasks,
  filterTasks,
  calculateBarPosition,
  initiateDragMove,
  calculateDragMoveDates,
  initiateResize,
  calculateResizeDates,
  getCriticalPathTasks,
  validateTaskDates,
  isWorkingDay,
  addBusinessDays,
} from './interactionUtils';

import {
  generateDependencyPaths,
  generateDependencyVisualization,
} from './svgUtils';

import { getAdapterForData, getAdapterForContext } from './adapters';
import GanttDependencyEditor from './GanttDependencyEditor';
import DependencyFormDialog from './DependencyFormDialog';
import CriticalPathDashboard from './CriticalPathDashboard';
import BaselineScenarioManager from './BaselineScenarioManager';
import ResourceLevelingVisualization from './ResourceLevelingVisualization';
import WeatherRestrictionPanel from './WeatherRestrictionPanel';
import MaterialConstraintManager from './MaterialConstraintManager';
import { calculateDependencyDates } from '@/utils/dependencyCalculator';

// ============================================================================
// CONSTANTS
// ============================================================================

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 60;
const SIDEBAR_WIDTH = 400;
const MIN_TASK_BAR_WIDTH = 4;

// ============================================================================
// COMPONENT
// ============================================================================

export const UnifiedGanttChart = React.forwardRef<HTMLDivElement, UnifiedGanttChartProps>(
  (
    {
      title = 'Project Timeline',
      description,
      tasks: initialTasks,
      phases,
      onTaskClick,
      onTaskUpdate,
      onDependencyChange,
      showCriticalPath = true,
      showResources = true,
      showMilestones = true,
      showDependencies = true,
      showPhases = true,
      collapsible = true,
      draggableRescale = true,
      draggableMove = true,
      editableDependencies = false,
      initialZoomLevel = 'week',
      initialViewMode = 'hierarchical',
      projectCalendar,
      className,
      height = 600,
      dataContext,
    },
    ref
  ) => {
    const { formatShortDate, formatMonthYear } = useDateFormat();
    const { t } = useLocalization();
    const timelineRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Convert input tasks to unified format if needed
    const adapter = dataContext ? getAdapterForContext(dataContext) : getAdapterForData(initialTasks);
    const tasks = useMemo(() => adapter.transformToUnified(initialTasks), [initialTasks, adapter]);

    // Display state
    const [displayState, setDisplayState] = useState<GanttDisplayState>({
      expandedTasks: new Set(tasks.map((t) => t.id)),
      expandedPhases: new Set(phases?.map((p) => p.id) || []),
      zoomLevel: initialZoomLevel,
      viewMode: initialViewMode,
      filterStatus: 'all',
      searchQuery: '',
      showCriticalPath: showCriticalPath,
      showDependencies: showDependencies,
      workingDaysMode: false,
    });

    // Interaction state
    const [interactionState, setInteractionState] = useState<GanttInteractionState>({
      interactingTaskId: null,
      interactionType: null,
      initialMouseX: 0,
      initialMouseY: 0,
      initialTaskDates: null,
      previewDates: null,
    });

    // Dependency editor state
    const [dependencyEditorActive, setDependencyEditorActive] = useState(false);
    const [selectedTaskForDeps, setSelectedTaskForDeps] = useState<UnifiedTask | null>(null);
    const [dependencyFormOpen, setDependencyFormOpen] = useState(false);

    // CPM dashboard state
    const [showCPMDashboard, setShowCPMDashboard] = useState(false);
    const [showBaselineManager, setShowBaselineManager] = useState(false);
    const [baselineScenarios, setBaselineScenarios] = useState<import('./types').BaselineScenario[]>([]);
    const [showResourceLeveling, setShowResourceLeveling] = useState(false);
    const [showWeatherRestrictions, setShowWeatherRestrictions] = useState(false);
    const [weatherRestrictions, setWeatherRestrictions] = useState<import('./types').WeatherRestriction[]>([]);
    const [showMaterialConstraints, setShowMaterialConstraints] = useState(false);
    const [materialConstraints, setMaterialConstraints] = useState<import('./MaterialConstraintManager').MaterialConstraint[]>([]);

    // Calculate timeline range
    const timelineRange = useMemo(() => {
      const allDates = [
        ...tasks.map((t) => [parseISO(t.startDate), parseISO(t.endDate)]).flat(),
        ...(phases?.map((p) => [parseISO(p.start_date), parseISO(p.end_date)]).flat() || []),
      ].filter(Boolean) as Date[];

      if (allDates.length === 0) {
        return {
          start: startOfMonth(new Date()),
          end: endOfMonth(addDays(new Date(), 30)),
          totalDays: 0,
        } as TimelineRange;
      }

      const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
      const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

      const start = addDays(startOfMonth(minDate), -7);
      const end = addDays(endOfMonth(maxDate), 7);

      return {
        start,
        end,
        totalDays: differenceInDays(end, start),
      };
    }, [tasks, phases]);

    // Get timeline headers based on zoom level
    const timelineHeaders = useMemo(() => {
      switch (displayState.zoomLevel) {
        case 'day':
          return eachDayOfInterval({
            start: timelineRange.start,
            end: timelineRange.end,
          });
        case 'week':
          return eachWeekOfInterval(
            { start: timelineRange.start, end: timelineRange.end },
            { weekStartsOn: 1 }
          );
        case 'month':
          return eachMonthOfInterval({
            start: timelineRange.start,
            end: timelineRange.end,
          });
      }
    }, [displayState.zoomLevel, timelineRange]);

    // Calculate column width
    const columnWidth = useMemo(() => {
      switch (displayState.zoomLevel) {
        case 'day':
          return 40;
        case 'week':
          return 100;
        case 'month':
          return 90;
      }
    }, [displayState.zoomLevel]);

    const timelineWidth = useMemo(() => {
      const divisor =
        displayState.zoomLevel === 'day' ? 1 : displayState.zoomLevel === 'week' ? 7 : 30;
      return timelineRange.totalDays * (columnWidth / divisor);
    }, [displayState.zoomLevel, timelineRange.totalDays, columnWidth]);

    // Flatten and filter tasks
    const flattenedTasks = useMemo(() => {
      return flattenTasks(tasks, displayState.expandedTasks);
    }, [tasks, displayState.expandedTasks]);

    const filteredTasks = useMemo(() => {
      return filterTasks(flattenedTasks, displayState.filterStatus, displayState.searchQuery);
    }, [flattenedTasks, displayState.filterStatus, displayState.searchQuery]);

    // Get critical path
    const criticalPathTaskIds = useMemo(() => {
      if (!displayState.showCriticalPath) return new Set<string>();
      return new Set(getCriticalPathTasks(tasks));
    }, [tasks, displayState.showCriticalPath]);

    // Toggle task expansion
    const toggleTask = useCallback(
      (taskId: string) => {
        if (!collapsible) return;
        setDisplayState((prev) => {
          const newExpanded = new Set(prev.expandedTasks);
          if (newExpanded.has(taskId)) {
            newExpanded.delete(taskId);
          } else {
            newExpanded.add(taskId);
          }
          return { ...prev, expandedTasks: newExpanded };
        });
      },
      [collapsible]
    );

    // Handle drag start
    const handleTaskBarMouseDown = useCallback(
      (e: React.MouseEvent, task: UnifiedTask, interactionType: 'move' | 'resize-start' | 'resize-end') => {
        if (!draggableMove && interactionType === 'move') return;
        if (!draggableRescale && interactionType !== 'move') return;

        e.preventDefault();

        setInteractionState({
          interactingTaskId: task.id,
          interactionType,
          initialMouseX: e.clientX,
          initialMouseY: e.clientY,
          initialTaskDates: {
            start: parseISO(task.startDate),
            end: parseISO(task.endDate),
          },
          previewDates: null,
        });
      },
      [draggableMove, draggableRescale]
    );

    // Handle drag movement
    useEffect(() => {
      if (!interactionState.interactingTaskId || !interactionState.initialTaskDates) return;

      const handleMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - interactionState.initialMouseX;

        if (interactionState.interactionType === 'move') {
          const daysDelta = Math.round(
            (deltaX / timelineWidth) * timelineRange.totalDays
          );

          const newStart = addBusinessDays(
            interactionState.initialTaskDates.start,
            daysDelta,
            projectCalendar
          );
          const duration = differenceInDays(
            interactionState.initialTaskDates.end,
            interactionState.initialTaskDates.start
          );
          const newEnd = addDays(newStart, duration);

          setInteractionState((prev) => ({
            ...prev,
            previewDates: {
              start: newStart,
              end: newEnd,
              taskId: interactionState.interactingTaskId!,
            },
          }));
        } else if (interactionState.interactionType?.startsWith('resize')) {
          const daysDelta = Math.round(
            (deltaX / timelineWidth) * timelineRange.totalDays
          );

          const resizeHandle = interactionState.interactionType as 'resize-start' | 'resize-end';
          const { newStart, newEnd } = calculateResizeDates(
            {
              taskId: interactionState.interactingTaskId!,
              handle: resizeHandle === 'resize-start' ? 'start' : 'end',
              startX: interactionState.initialMouseX,
              originalStart: interactionState.initialTaskDates.start,
              originalEnd: interactionState.initialTaskDates.end,
            },
            e.clientX,
            timelineWidth,
            timelineRange.totalDays,
            1,
            projectCalendar
          );

          setInteractionState((prev) => ({
            ...prev,
            previewDates: {
              start: newStart,
              end: newEnd,
              taskId: interactionState.interactingTaskId!,
            },
          }));
        }
      };

      const handleMouseUp = (e: MouseEvent) => {
        if (interactionState.previewDates && onTaskUpdate) {
          const task = tasks.find((t) => t.id === interactionState.interactingTaskId);
          if (task) {
            const validation = validateTaskDates({
              ...task,
              startDate: format(interactionState.previewDates.start, 'yyyy-MM-dd'),
              endDate: format(interactionState.previewDates.end, 'yyyy-MM-dd'),
              duration: differenceInDays(
                interactionState.previewDates.end,
                interactionState.previewDates.start
              ),
            });

            if (validation.valid) {
              onTaskUpdate(task.id, {
                startDate: format(interactionState.previewDates.start, 'yyyy-MM-dd'),
                endDate: format(interactionState.previewDates.end, 'yyyy-MM-dd'),
              });
            }
          }
        }

        setInteractionState({
          interactingTaskId: null,
          interactionType: null,
          initialMouseX: 0,
          initialMouseY: 0,
          initialTaskDates: null,
          previewDates: null,
        });
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [interactionState, timelineWidth, timelineRange.totalDays, onTaskUpdate, projectCalendar, tasks]);

    // Render task bar
    // ========================================================================
    // DEPENDENCY MANAGEMENT
    // ========================================================================

    /**
     * Calculate task positions for visual editor
     */
    const taskPositions = useMemo(() => {
      const positions = new Map<string, import('./svgUtils').TaskPosition>();

      filteredTasks.forEach((task, index) => {
        const barPos = calculateBarPosition(
          task,
          timelineRange.start,
          timelineRange.end,
          timelineWidth,
          projectCalendar
        );

        positions.set(task.id, {
          taskId: task.id,
          barPosition: barPos,
          rowIndex: index,
          rowHeight: ROW_HEIGHT,
        });
      });

      return positions;
    }, [filteredTasks, timelineRange, timelineWidth, projectCalendar]);

    /**
     * Handle adding a dependency
     */
    const handleDependencyAdd = useCallback((
      sourceId: string,
      targetId: string,
      type: import('./types').DependencyType,
      lag: number
    ) => {
      if (!onDependencyChange) return;

      // Get the source task
      const sourceTask = tasks.find((t) => t.id === sourceId);
      if (!sourceTask) return;

      // Add dependency
      const updatedDependencies = [
        ...(sourceTask.dependencies || []),
        {
          activityId: targetId,
          type,
          lag,
        },
      ];

      // Call callback with updated task
      onDependencyChange({
        taskId: sourceId,
        dependencies: updatedDependencies,
      });

      // Recalculate CPM if needed
      if (projectCalendar?.holidays) {
        const allActivities = tasks.map((t) => ({
          id: t.id,
          sequence: tasks.indexOf(t),
          name: t.name,
          start_date: t.startDate,
          end_date: t.endDate,
          days_for_activity: differenceInDays(
            parseISO(t.endDate),
            parseISO(t.startDate)
          ),
          dependencies: updatedDependencies,
        }));

        const recalculated = calculateDependencyDates(
          allActivities,
          parseISO(timelineRange.start.toISOString())
        );

        // Update tasks with recalculated dates if callback exists
        recalculated.forEach((activity) => {
          const task = tasks.find((t) => t.id === activity.id);
          if (task && activity.start_date && activity.end_date) {
            onTaskUpdate?.(task.id, {
              startDate: activity.start_date,
              endDate: activity.end_date,
              isCritical: activity.is_critical,
            });
          }
        });
      }
    }, [tasks, onDependencyChange, onTaskUpdate, timelineRange, projectCalendar]);

    /**
     * Handle removing a dependency
     */
    const handleDependencyRemove = useCallback((
      sourceId: string,
      targetId: string
    ) => {
      if (!onDependencyChange) return;

      const sourceTask = tasks.find((t) => t.id === sourceId);
      if (!sourceTask) return;

      const updatedDependencies = (sourceTask.dependencies || []).filter(
        (dep) => dep.activityId !== targetId
      );

      onDependencyChange({
        taskId: sourceId,
        dependencies: updatedDependencies,
      });
    }, [tasks, onDependencyChange]);

    const renderTaskBar = (task: UnifiedTask, rowIndex: number) => {
      const barPos = calculateBarPosition(
        task,
        timelineRange.start,
        timelineRange.end,
        timelineWidth,
        projectCalendar
      );

      const previewPos =
        interactionState.previewDates?.taskId === task.id && interactionState.previewDates
          ? calculateBarPosition(
              {
                ...task,
                startDate: format(interactionState.previewDates.start, 'yyyy-MM-dd'),
                endDate: format(interactionState.previewDates.end, 'yyyy-MM-dd'),
              },
              timelineRange.start,
              timelineRange.end,
              timelineWidth,
              projectCalendar
            )
          : null;

      const displayBar = previewPos || barPos;
      const isCritical = criticalPathTaskIds.has(task.id);

      return (
        <div
          key={`bar-${task.id}`}
          className="absolute h-6 rounded cursor-move transition-all"
          style={{
            left: `${displayBar.x}px`,
            width: `${displayBar.width}px`,
            top: `${rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2 - 12}px`,
            backgroundColor: isCritical ? '#dc2626' : '#3b82f6',
            opacity: previewPos ? 0.7 : 1,
          }}
          onMouseDown={(e) => handleTaskBarMouseDown(e, task, 'move')}
        >
          {/* Resize handles */}
          {draggableRescale && (
            <>
              <div
                className="absolute top-0 left-0 w-1 h-full bg-gray-400 hover:bg-gray-600 cursor-col-resize opacity-0 hover:opacity-100"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleTaskBarMouseDown(e, task, 'resize-start');
                }}
              />
              <div
                className="absolute top-0 right-0 w-1 h-full bg-gray-400 hover:bg-gray-600 cursor-col-resize opacity-0 hover:opacity-100"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleTaskBarMouseDown(e, task, 'resize-end');
                }}
              />
            </>
          )}

          {/* Progress indicator */}
          <div
            className="absolute top-0 left-0 h-full bg-opacity-50 rounded"
            style={{
              width: `${task.completionPercentage}%`,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
            }}
          />

          {/* Task label */}
          <span className="text-xs font-medium text-white px-1 truncate block pointer-events-none">
            {task.completionPercentage}%
          </span>

          {/* Duration label at right side */}
          <span className="absolute right-1 top-0 h-full flex items-center text-xs font-medium text-white/90 pointer-events-none">
            {differenceInDays(parseISO(task.endDate), parseISO(task.startDate)) + 1}d
          </span>
        </div>
      );
    };

    return (
      <Card ref={ref} className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}

          {/* Toolbar */}
          <div className="flex gap-2 mt-4">
            <Select
              value={displayState.zoomLevel}
              onValueChange={(zoom) =>
                setDisplayState((prev) => ({
                  ...prev,
                  zoomLevel: zoom as 'day' | 'week' | 'month',
                }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Search tasks..."
              value={displayState.searchQuery}
              onChange={(e) =>
                setDisplayState((prev) => ({
                  ...prev,
                  searchQuery: e.target.value,
                }))
              }
              className="flex-1"
            />

            {showCriticalPath && (
              <Button
                variant={displayState.showCriticalPath ? 'default' : 'outline'}
                onClick={() =>
                  setDisplayState((prev) => ({
                    ...prev,
                    showCriticalPath: !prev.showCriticalPath,
                  }))
                }
                size="sm"
              >
                Critical Path
              </Button>
            )}

            {editableDependencies && (
              <>
                <Button
                  variant={dependencyEditorActive ? 'default' : 'outline'}
                  onClick={() => setDependencyEditorActive(!dependencyEditorActive)}
                  size="sm"
                >
                  Link Tasks
                </Button>

                {selectedTaskForDeps && (
                  <Button
                    variant="outline"
                    onClick={() => setDependencyFormOpen(true)}
                    size="sm"
                  >
                    Manage Deps
                  </Button>
                )}
              </>
            )}

            {showCriticalPath && (
              <>
                <Button
                  variant={showCPMDashboard ? 'default' : 'outline'}
                  onClick={() => setShowCPMDashboard(!showCPMDashboard)}
                  size="sm"
                >
                  CPM Metrics
                </Button>

                <Button
                  variant={showBaselineManager ? 'default' : 'outline'}
                  onClick={() => setShowBaselineManager(!showBaselineManager)}
                  size="sm"
                >
                  Scenarios
                </Button>

                <Button
                  variant={showResourceLeveling ? 'default' : 'outline'}
                  onClick={() => setShowResourceLeveling(!showResourceLeveling)}
                  size="sm"
                >
                  Resources
                </Button>

                <Button
                  variant={showWeatherRestrictions ? 'default' : 'outline'}
                  onClick={() => setShowWeatherRestrictions(!showWeatherRestrictions)}
                  size="sm"
                >
                  Weather
                </Button>

                <Button
                  variant={showMaterialConstraints ? 'default' : 'outline'}
                  onClick={() => setShowMaterialConstraints(!showMaterialConstraints)}
                  size="sm"
                >
                  Materials
                </Button>
              </>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div
            className="flex border rounded-lg overflow-hidden"
            style={{ height: `${height}px` }}
          >
            {/* Sidebar with task list */}
            <div
              className="overflow-y-auto border-r bg-gray-50"
              style={{ width: `${SIDEBAR_WIDTH}px` }}
            >
              {filteredTasks.map((task, index) => (
                <div
                  key={task.id}
                  className="px-3 py-2 border-b text-sm cursor-pointer hover:bg-gray-100"
                  style={{ height: `${ROW_HEIGHT}px` }}
                  onClick={() => onTaskClick?.(task)}
                >
                  <div className="flex items-center gap-2">
                     {task.subtasks && task.subtasks.length > 0 && collapsible && (
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           toggleTask(task.id);
                         }}
                         className="p-0"
                       >
                         {displayState.expandedTasks.has(task.id) ? (
                           <ChevronDown className="h-4 w-4" />
                         ) : (
                           <ChevronRight className="h-4 w-4" />
                         )}
                       </button>
                     )}
                     <div className="flex-1 truncate">
                       <div className="font-medium truncate">{task.name}</div>
                       <div className="text-xs text-gray-500">
                         {format(parseISO(task.startDate), 'MMM d')} -{' '}
                         {format(parseISO(task.endDate), 'MMM d')}
                       </div>
                     </div>
                     <div className="text-xs text-gray-500 flex-shrink-0">
                       {differenceInDays(parseISO(task.endDate), parseISO(task.startDate)) + 1}d
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline area */}
            <div className="flex-1 overflow-x-auto" ref={timelineRef}>
              {/* Header */}
              <div className="sticky top-0 bg-white border-b" style={{ height: `${HEADER_HEIGHT}px` }}>
                <div className="flex" style={{ width: `${timelineWidth}px` }}>
                  {timelineHeaders.map((date, index) => (
                    <div
                      key={index}
                      className="border-r text-center text-xs font-medium p-1"
                      style={{ width: `${columnWidth}px` }}
                    >
                      {displayState.zoomLevel === 'day'
                        ? format(date, 'dd')
                        : displayState.zoomLevel === 'week'
                          ? format(date, 'MMM dd')
                          : format(date, 'MMM yyyy')}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks */}
              <div style={{ width: `${timelineWidth}px`, minHeight: `${height - HEADER_HEIGHT}px` }}>
                {filteredTasks.map((task, index) => (
                  <div
                    key={`row-${task.id}`}
                    className="border-b relative"
                    style={{ height: `${ROW_HEIGHT}px` }}
                  >
                    {/* Grid lines */}
                    {timelineHeaders.map((_, colIndex) => (
                      <div
                        key={`grid-${colIndex}`}
                        className="absolute border-r border-gray-200"
                        style={{
                          left: `${colIndex * columnWidth}px`,
                          width: `${columnWidth}px`,
                          height: `${ROW_HEIGHT}px`,
                        }}
                      />
                    ))}

                    {/* Task bar */}
                    {renderTaskBar(task, index)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>

        {/* Dependency Editors */}
        {editableDependencies && (
          <>
            {/* Visual Drag-to-Link Editor */}
            <GanttDependencyEditor
              isActive={dependencyEditorActive}
              onToggle={setDependencyEditorActive}
              tasks={tasks}
              onDependencyAdd={handleDependencyAdd}
              taskPositions={taskPositions}
              rowHeight={ROW_HEIGHT}
            />

            {/* Form-Based Dependency Manager */}
            <DependencyFormDialog
              isOpen={dependencyFormOpen}
              onClose={() => setDependencyFormOpen(false)}
              selectedTask={selectedTaskForDeps}
              allTasks={tasks}
              onDependencyAdd={handleDependencyAdd}
              onDependencyRemove={handleDependencyRemove}
            />
          </>
        )}

        {/* CPM Dashboard & Advanced Scheduling Features */}
        {showCriticalPath && (
          <div className="space-y-4 mt-4 border-t pt-4">
            {showCPMDashboard && (
              <CriticalPathDashboard
                tasks={tasks}
                projectStartDate={timelineRange.start}
                projectEndDate={timelineRange.end}
                showDetails={true}
              />
            )}

            {showBaselineManager && (
              <BaselineScenarioManager
                tasks={tasks}
                scenarios={baselineScenarios}
                onScenarioCreate={(scenario) => {
                  setBaselineScenarios((prev) => [...prev, scenario]);
                }}
                onScenarioDelete={(scenarioId) => {
                  setBaselineScenarios((prev) =>
                    prev.filter((s) => s.id !== scenarioId)
                  );
                }}
                onBaselineSet={(scenarioId) => {
                  // Update baseline flag
                  setBaselineScenarios((prev) =>
                    prev.map((s) => ({
                      ...s,
                      isBaseline: s.id === scenarioId,
                    }))
                  );
                }}
              />
            )}

            {showResourceLeveling && (
              <ResourceLevelingVisualization
                tasks={tasks}
                projectStartDate={timelineRange.start}
                projectEndDate={timelineRange.end}
                onLevelingApplied={(adjustments) => {
                  // Apply resource leveling adjustments to tasks
                  adjustments.forEach((adj) => {
                    onTaskUpdate?.(adj.taskId, {
                      startDate: adj.newStartDate,
                    });
                  });
                }}
              />
            )}

            {showWeatherRestrictions && (
              <WeatherRestrictionPanel
                tasks={tasks}
                projectStart={timelineRange.start}
                projectEnd={timelineRange.end}
                restrictions={weatherRestrictions}
                onRestrictionAdd={(restriction) => {
                  setWeatherRestrictions((prev) => [...prev, restriction]);
                }}
                onRestrictionRemove={(restrictionId) => {
                  setWeatherRestrictions((prev) =>
                    prev.filter((r) => r.id !== restrictionId)
                  );
                }}
              />
            )}

            {showMaterialConstraints && (
              <MaterialConstraintManager
                tasks={tasks}
                projectStart={timelineRange.start}
                projectEnd={timelineRange.end}
                constraints={materialConstraints}
                onConstraintAdd={(constraint) => {
                  setMaterialConstraints((prev) => [...prev, constraint]);
                }}
                onConstraintRemove={(constraintId) => {
                  setMaterialConstraints((prev) =>
                    prev.filter((c) => c.id !== constraintId)
                  );
                }}
              />
            )}
          </div>
        )}
      </Card>
    );
  }
);

UnifiedGanttChart.displayName = 'UnifiedGanttChart';

export default UnifiedGanttChart;
