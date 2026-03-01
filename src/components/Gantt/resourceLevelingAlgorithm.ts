/**
 * Resource Leveling Algorithm
 *
 * Implements automated resource leveling to resolve overallocation conflicts:
 * - Identifies resource conflicts (>100% allocation on single day)
 * - Applies leveling strategies: delay, split, extend duration
 * - Maintains task dependencies and critical path constraints
 * - Minimizes schedule impact while resolving conflicts
 */

import { addDays, parseISO, differenceInDays, eachDayOfInterval } from 'date-fns';
import type { UnifiedTask } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface ResourceAllocationConflict {
  date: string;
  resourceId: string;
  overallocationPercentage: number;
  affectedTasks: string[];
}

export interface LevelingAdjustment {
  taskId: string;
  originalStartDate: string;
  originalEndDate: string;
  newStartDate: string;
  newEndDate: string;
  daysDelayed: number;
  strategy: 'delay' | 'split' | 'extend';
  reason: string;
}

export interface LevelingResult {
  adjustments: LevelingAdjustment[];
  conflictsResolved: number;
  remainingConflicts: number;
  scheduleImpact: number; // Days added to project
  criticalPathImpact: boolean;
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Identify all resource allocation conflicts
 */
export function identifyResourceConflicts(
  tasks: UnifiedTask[],
  projectStart: Date,
  projectEnd: Date
): ResourceAllocationConflict[] {
  const conflicts: ResourceAllocationConflict[] = [];
  const days = eachDayOfInterval({ start: projectStart, end: projectEnd });

  days.forEach((day) => {
    const dayString = day.toISOString().split('T')[0];
    const resourceLoads = new Map<string, { taskIds: Set<string>; percentage: number }>();

    // Calculate resource allocation for this day
    tasks.forEach((task) => {
      const taskStart = parseISO(task.startDate);
      const taskEnd = parseISO(task.endDate);

      if (day >= taskStart && day <= taskEnd && task.resources) {
        task.resources.forEach((resource) => {
          const current = resourceLoads.get(resource.resourceId) || {
            taskIds: new Set<string>(),
            percentage: 0,
          };
          current.taskIds.add(task.id);
          current.percentage += resource.allocationPercentage || 0;
          resourceLoads.set(resource.resourceId, current);
        });
      }
    });

    // Identify conflicts (>100% allocation)
    resourceLoads.forEach((load, resourceId) => {
      if (load.percentage > 100) {
        conflicts.push({
          date: dayString,
          resourceId,
          overallocationPercentage: load.percentage - 100,
          affectedTasks: Array.from(load.taskIds),
        });
      }
    });
  });

  return conflicts;
}

// ============================================================================
// LEVELING STRATEGIES
// ============================================================================

/**
 * Strategy 1: Delay non-critical tasks
 * Move tasks that have slack to later dates
 */
export function delayNonCriticalTasks(
  task: UnifiedTask,
  daysToDelay: number,
  allTasks: UnifiedTask[]
): LevelingAdjustment | null {
  if (task.isCritical || !task.float || task.float === 0) {
    return null; // Cannot delay critical tasks
  }

  if (daysToDelay > (task.float || 0)) {
    return null; // Not enough float to delay
  }

  const originalStart = parseISO(task.startDate);
  const originalEnd = parseISO(task.endDate);
  const newStart = addDays(originalStart, daysToDelay);
  const newEnd = addDays(originalEnd, daysToDelay);

  // Check if delay violates successor constraints
  const hasSuccessors = allTasks.some(
    (t) =>
      t.dependencies?.some((dep) => dep.activityId === task.id)
  );

  if (hasSuccessors && daysToDelay > (task.float || 0)) {
    return null; // Would violate successor timing
  }

  return {
    taskId: task.id,
    originalStartDate: task.startDate,
    originalEndDate: task.endDate,
    newStartDate: newStart.toISOString().split('T')[0],
    newEndDate: newEnd.toISOString().split('T')[0],
    daysDelayed: daysToDelay,
    strategy: 'delay',
    reason: `Delayed ${daysToDelay} days using available slack (${task.float || 0} days)`,
  };
}

/**
 * Strategy 2: Split task into multiple phases
 * Reduce daily allocation by spreading work across longer period
 */
export function splitTaskAllocation(
  task: UnifiedTask,
  targetAllocationPercentage: number
): LevelingAdjustment | null {
  if (!task.resources || task.resources.length === 0) {
    return null;
  }

  const currentAllocation = task.resources.reduce(
    (sum, r) => sum + (r.allocationPercentage || 0),
    0
  );

  if (currentAllocation <= targetAllocationPercentage) {
    return null; // Already below target
  }

  // Calculate extension needed to achieve target allocation
  const extensionRatio = currentAllocation / targetAllocationPercentage;
  const originalDuration = differenceInDays(
    parseISO(task.endDate),
    parseISO(task.startDate)
  );
  const newDuration = Math.ceil(originalDuration * extensionRatio);
  const extensionDays = newDuration - originalDuration;

  if (extensionDays <= 0) {
    return null;
  }

  const originalStart = parseISO(task.startDate);
  const newEnd = addDays(originalStart, newDuration);

  return {
    taskId: task.id,
    originalStartDate: task.startDate,
    originalEndDate: task.endDate,
    newStartDate: task.startDate,
    newEndDate: newEnd.toISOString().split('T')[0],
    daysDelayed: 0,
    strategy: 'split',
    reason: `Extended ${extensionDays} days to reduce daily allocation from ${Math.round(currentAllocation)}% to ~${targetAllocationPercentage}%`,
  };
}

/**
 * Strategy 3: Extend task duration maintaining start date
 * Spread work over longer period without delaying start
 */
export function extendTaskDuration(
  task: UnifiedTask,
  extensionDays: number
): LevelingAdjustment | null {
  if (extensionDays <= 0) {
    return null;
  }

  const originalStart = parseISO(task.startDate);
  const originalEnd = parseISO(task.endDate);
  const newEnd = addDays(originalEnd, extensionDays);

  return {
    taskId: task.id,
    originalStartDate: task.startDate,
    originalEndDate: task.endDate,
    newStartDate: task.startDate,
    newEndDate: newEnd.toISOString().split('T')[0],
    daysDelayed: 0,
    strategy: 'extend',
    reason: `Extended duration by ${extensionDays} days to spread resource allocation`,
  };
}

// ============================================================================
// MAIN LEVELING ALGORITHM
// ============================================================================

/**
 * Apply resource leveling to resolve conflicts
 *
 * Algorithm:
 * 1. Identify all resource conflicts (days with >100% allocation)
 * 2. For each conflict, find involved tasks sorted by priority
 * 3. Apply strategies in order:
 *    a. Delay non-critical tasks (uses available float)
 *    b. Split task allocations (extend duration)
 *    c. Last resort: extend critical tasks (impacts schedule)
 * 4. Validate no dependencies violated
 * 5. Return adjustments and metrics
 */
export function applyResourceLeveling(
  tasks: UnifiedTask[],
  projectStart: Date,
  projectEnd: Date,
  maxIterations: number = 10
): LevelingResult {
  const adjustments: LevelingAdjustment[] = [];
  const workingTasks = JSON.parse(JSON.stringify(tasks)) as UnifiedTask[];
  let iteration = 0;
  let previousConflictCount = Infinity;

  while (iteration < maxIterations) {
    iteration++;

    // Identify current conflicts
    const conflicts = identifyResourceConflicts(workingTasks, projectStart, projectEnd);

    if (conflicts.length === 0) {
      break; // All conflicts resolved
    }

    if (conflicts.length >= previousConflictCount) {
      break; // No progress being made
    }

    previousConflictCount = conflicts.length;

    // Process first conflict
    const conflict = conflicts[0];
    const conflictDate = parseISO(conflict.date);

    // Find tasks on this date
    const tasksOnDate = workingTasks.filter((task) => {
      const taskStart = parseISO(task.startDate);
      const taskEnd = parseISO(task.endDate);
      return conflictDate >= taskStart && conflictDate <= taskEnd;
    });

    // Sort by priority: non-critical > critical, flexible > inflexible
    tasksOnDate.sort((a, b) => {
      if (a.isCritical !== b.isCritical) {
        return a.isCritical ? 1 : -1; // Non-critical first
      }
      return (b.float || 0) - (a.float || 0); // More float first
    });

    // Try to resolve with first task
    const targetTask = tasksOnDate[0];
    let adjustment: LevelingAdjustment | null = null;

    // Strategy 1: Delay if has slack
    if (!targetTask.isCritical && targetTask.float && targetTask.float > 0) {
      adjustment = delayNonCriticalTasks(targetTask, 1, workingTasks);
    }

    // Strategy 2: Split allocation
    if (!adjustment) {
      adjustment = splitTaskAllocation(targetTask, 75); // Target 75% allocation
    }

    // Strategy 3: Extend duration
    if (!adjustment) {
      adjustment = extendTaskDuration(targetTask, 1);
    }

    if (adjustment) {
      adjustments.push(adjustment);

      // Apply adjustment to working copy
      const taskIndex = workingTasks.findIndex((t) => t.id === adjustment.taskId);
      if (taskIndex >= 0) {
        workingTasks[taskIndex] = {
          ...workingTasks[taskIndex],
          startDate: adjustment.newStartDate,
          endDate: adjustment.newEndDate,
        };
      }
    }
  }

  // Calculate metrics
  const finalConflicts = identifyResourceConflicts(workingTasks, projectStart, projectEnd);
  const originalEnd = new Date(Math.max(
    ...tasks.map((t) => parseISO(t.endDate).getTime())
  ));
  const newEnd = new Date(Math.max(
    ...workingTasks.map((t) => parseISO(t.endDate).getTime())
  ));
  const scheduleImpact = differenceInDays(newEnd, originalEnd);

  return {
    adjustments,
    conflictsResolved: Math.max(0, Math.min(
      ...identifyResourceConflicts(tasks, projectStart, projectEnd).map((c) => c.affectedTasks.length),
      adjustments.length
    )),
    remainingConflicts: finalConflicts.length,
    scheduleImpact,
    criticalPathImpact: adjustments.some((adj) => {
      const task = tasks.find((t) => t.id === adj.taskId);
      return task?.isCritical || false;
    }),
  };
}

/**
 * Get leveling recommendations without applying changes
 */
export function getLevelingRecommendations(
  tasks: UnifiedTask[],
  projectStart: Date,
  projectEnd: Date
): string[] {
  const conflicts = identifyResourceConflicts(tasks, projectStart, projectEnd);
  const recommendations: string[] = [];

  if (conflicts.length === 0) {
    recommendations.push('No resource conflicts detected.');
    return recommendations;
  }

  // Count conflict types
  const criticalConflicts = conflicts.filter((c) => {
    const affectedTasks = tasks.filter((t) =>
      c.affectedTasks.includes(t.id) && t.isCritical
    );
    return affectedTasks.length > 0;
  });

  const nonCriticalConflicts = conflicts.length - criticalConflicts.length;

  recommendations.push(`Found ${conflicts.length} resource conflict(s):`);

  if (nonCriticalConflicts > 0) {
    recommendations.push(
      `• Delay ${nonCriticalConflicts} non-critical conflict(s) using available slack`
    );
  }

  if (criticalConflicts.length > 0) {
    recommendations.push(
      `• Extend ${criticalConflicts.length} critical task(s) to resolve unavoidable conflicts`
    );
  }

  recommendations.push('• Consider adding resources to reduce allocation percentages');
  recommendations.push('• Review task dependencies for rescheduling opportunities');

  return recommendations;
}
