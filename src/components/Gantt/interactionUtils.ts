/**
 * Interaction Utilities for Gantt Chart
 *
 * Extracted from MicrosoftProjectLike component
 * Handles drag-to-move, drag-to-resize, and other mouse interactions
 */

import { addDays, differenceInDays, format } from 'date-fns';
import { UnifiedTask, BarPosition, InteractionType } from './types';

// ============================================================================
// WORKING DAYS CALCULATIONS
// ============================================================================

interface ProjectCalendar {
  enabled: boolean;
  workingDays: string[];
  holidays: Array<{ date: string; reason: string }>;
}

/**
 * Check if a date is a working day
 */
export function isWorkingDay(date: Date, calendar: ProjectCalendar): boolean {
  if (!calendar.enabled) return true;

  // Check if it's a holiday
  const dateStr = format(date, 'yyyy-MM-dd');
  const isHoliday = calendar.holidays.some((h) => h.date === dateStr);
  if (isHoliday) return false;

  // Check if it's a working day of the week
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[date.getDay()];
  return calendar.workingDays.includes(dayName);
}

/**
 * Add business days to a date (respecting working day calendar)
 */
export function addBusinessDays(date: Date, days: number, calendar?: ProjectCalendar): Date {
  if (!calendar?.enabled) {
    return addDays(date, days);
  }

  let result = new Date(date);
  let daysAdded = 0;
  const direction = days > 0 ? 1 : -1;

  while (daysAdded < Math.abs(days)) {
    result = addDays(result, direction);
    if (isWorkingDay(result, calendar)) {
      daysAdded++;
    }
  }

  return result;
}

/**
 * Get the working day offset between two dates
 */
export function getWorkingDayOffset(
  startDate: Date,
  endDate: Date,
  calendar?: ProjectCalendar
): number {
  if (!calendar?.enabled) {
    return differenceInDays(endDate, startDate);
  }

  let workingDays = 0;
  let current = new Date(startDate);

  while (current < endDate) {
    current = addDays(current, 1);
    if (isWorkingDay(current, calendar)) {
      workingDays++;
    }
  }

  return workingDays;
}

// ============================================================================
// BAR POSITIONING
// ============================================================================

/**
 * Calculate the pixel position and width of a task bar
 */
export function calculateBarPosition(
  task: UnifiedTask,
  timelineStart: Date,
  timelineEnd: Date,
  containerWidth: number,
  calendar?: ProjectCalendar
): BarPosition {
  const taskStart = new Date(task.startDate);
  const taskEnd = new Date(task.endDate);

  const totalDays = calendar?.enabled
    ? getWorkingDayOffset(timelineStart, timelineEnd, calendar)
    : differenceInDays(timelineEnd, timelineStart);

  const startOffset = calendar?.enabled
    ? getWorkingDayOffset(timelineStart, taskStart, calendar)
    : differenceInDays(taskStart, timelineStart);

  const duration = calendar?.enabled
    ? getWorkingDayOffset(taskStart, taskEnd, calendar)
    : differenceInDays(taskEnd, taskStart);

  const x = (startOffset / totalDays) * containerWidth;
  const width = Math.max((duration / totalDays) * containerWidth, 4); // Minimum 4px width

  return { x, width };
}

// ============================================================================
// DRAG INTERACTIONS
// ============================================================================

export interface DragState {
  taskId: string;
  startX: number;
  startY: number;
  originalStart: Date;
  originalEnd: Date;
  currentDeltaX: number;
}

/**
 * Initialize a drag-to-move interaction
 */
export function initiateDragMove(
  task: UnifiedTask,
  mouseX: number,
  mouseY: number
): DragState {
  return {
    taskId: task.id,
    startX: mouseX,
    startY: mouseY,
    originalStart: new Date(task.startDate),
    originalEnd: new Date(task.endDate),
    currentDeltaX: 0,
  };
}

/**
 * Calculate new dates during drag-to-move
 */
export function calculateDragMoveDates(
  dragState: DragState,
  currentX: number,
  containerWidth: number,
  totalDays: number,
  calendar?: ProjectCalendar
): { newStart: Date; newEnd: Date } {
  const deltaX = currentX - dragState.startX;
  const daysDelta = Math.round((deltaX / containerWidth) * totalDays);

  const newStart = addBusinessDays(dragState.originalStart, daysDelta, calendar);
  const duration = differenceInDays(dragState.originalEnd, dragState.originalStart);
  const newEnd = addDays(newStart, duration);

  return { newStart, newEnd };
}

// ============================================================================
// RESIZE INTERACTIONS
// ============================================================================

export interface ResizeState {
  taskId: string;
  handle: 'start' | 'end';
  startX: number;
  originalStart: Date;
  originalEnd: Date;
}

/**
 * Initialize a resize interaction
 */
export function initiateResize(
  task: UnifiedTask,
  handle: 'start' | 'end',
  mouseX: number
): ResizeState {
  return {
    taskId: task.id,
    handle,
    startX: mouseX,
    originalStart: new Date(task.startDate),
    originalEnd: new Date(task.endDate),
  };
}

/**
 * Calculate new dates during resize
 * Prevents invalid states (end before start, duration < 1 day)
 */
export function calculateResizeDates(
  resizeState: ResizeState,
  currentX: number,
  containerWidth: number,
  totalDays: number,
  minDurationDays: number = 1,
  calendar?: ProjectCalendar
): { newStart: Date; newEnd: Date; valid: boolean } {
  const deltaX = currentX - resizeState.startX;
  const daysDelta = Math.round((deltaX / containerWidth) * totalDays);

  let newStart = resizeState.originalStart;
  let newEnd = resizeState.originalEnd;

  if (resizeState.handle === 'start') {
    newStart = addBusinessDays(resizeState.originalStart, daysDelta, calendar);

    // Ensure start doesn't go past end
    if (newStart >= newEnd) {
      newStart = addDays(newEnd, -minDurationDays);
      return { newStart, newEnd, valid: false };
    }

    // Ensure minimum duration
    const actualDuration = differenceInDays(newEnd, newStart);
    if (actualDuration < minDurationDays) {
      newStart = addDays(newEnd, -minDurationDays);
      return { newStart, newEnd, valid: false };
    }
  } else {
    // resize-end
    newEnd = addBusinessDays(resizeState.originalEnd, daysDelta, calendar);

    // Ensure end doesn't go before start
    if (newEnd <= newStart) {
      newEnd = addDays(newStart, minDurationDays);
      return { newStart, newEnd, valid: false };
    }

    // Ensure minimum duration
    const actualDuration = differenceInDays(newEnd, newStart);
    if (actualDuration < minDurationDays) {
      newEnd = addDays(newStart, minDurationDays);
      return { newStart, newEnd, valid: false };
    }
  }

  return { newStart, newEnd, valid: true };
}

// ============================================================================
// TASK FILTERING & SORTING
// ============================================================================

export type FilterStatus = 'all' | 'active' | 'completed' | 'delayed' | 'at_risk';

/**
 * Filter tasks based on status, search query, and other criteria
 */
export function filterTasks(
  tasks: UnifiedTask[],
  filterStatus: FilterStatus,
  searchQuery: string
): UnifiedTask[] {
  return tasks.filter((task) => {
    // Status filter
    if (filterStatus !== 'all' && task.status !== filterStatus) {
      return false;
    }

    // Search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const matches =
        task.name.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.assignees?.some((a) => a.toLowerCase().includes(query)) ||
        task.category?.toLowerCase().includes(query);

      if (!matches) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Flatten hierarchical tasks for rendering
 */
export function flattenTasks(
  tasks: UnifiedTask[],
  expandedTaskIds: Set<string>
): Array<UnifiedTask & { displayLevel: number; isExpanded: boolean }> {
  const flattened: Array<UnifiedTask & { displayLevel: number; isExpanded: boolean }> = [];

  const flatten = (taskList: UnifiedTask[], level = 0) => {
    taskList.forEach((task) => {
      const isExpanded = expandedTaskIds.has(task.id);
      flattened.push({
        ...task,
        displayLevel: level,
        isExpanded,
      });

      if (task.subtasks && task.subtasks.length > 0 && isExpanded) {
        flatten(task.subtasks, level + 1);
      }
    });
  };

  flatten(tasks);
  return flattened;
}

// ============================================================================
// CRITICAL PATH DETECTION
// ============================================================================

/**
 * Identify all tasks on the critical path
 */
export function getCriticalPathTasks(tasks: UnifiedTask[]): string[] {
  const visited = new Set<string>();

  const traverse = (task: UnifiedTask): boolean => {
    if (visited.has(task.id)) return task.isCritical || false;
    visited.add(task.id);

    // A task is critical if it has 0 float
    const isCritical = task.floatDays === 0 || task.isCritical;

    return isCritical;
  };

  return tasks
    .filter((task) => traverse(task))
    .map((task) => task.id);
}

/**
 * Get dependency chain for a task (predecessors and successors)
 */
export function getDependencyChain(
  taskId: string,
  allTasks: UnifiedTask[]
): {
  predecessors: UnifiedTask[];
  successors: UnifiedTask[];
} {
  const taskMap = new Map(allTasks.map((t) => [t.id, t]));
  const predecessors: UnifiedTask[] = [];
  const successors: UnifiedTask[] = [];

  // Find predecessors (tasks this task depends on)
  const task = taskMap.get(taskId);
  if (task?.dependencies) {
    task.dependencies.forEach((dep) => {
      const predecessor = taskMap.get(dep.activityId);
      if (predecessor) {
        predecessors.push(predecessor);
      }
    });
  }

  // Find successors (tasks that depend on this task)
  allTasks.forEach((t) => {
    if (t.dependencies?.some((dep) => dep.activityId === taskId)) {
      successors.push(t);
    }
  });

  return { predecessors, successors };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate task dates and state
 */
export function validateTaskDates(task: UnifiedTask): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const startDate = new Date(task.startDate);
  const endDate = new Date(task.endDate);

  if (startDate > endDate) {
    errors.push('Start date cannot be after end date');
  }

  if (startDate.getTime() === endDate.getTime()) {
    errors.push('Task must span at least 1 day');
  }

  if (task.completionPercentage < 0 || task.completionPercentage > 100) {
    errors.push('Completion percentage must be between 0 and 100');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
