/**
 * Data Adapters for Unified Gantt Chart
 *
 * These adapters convert between different task formats:
 * - MSProjectTask (legacy format from MicrosoftProjectLike)
 * - GanttActivity (database format from project_activities)
 * - UnifiedTask (internal format)
 *
 * This allows the same UnifiedGanttChart component to work with multiple data sources
 */

import {
  UnifiedTask,
  MSProjectTask,
  GanttActivity,
  GanttDataAdapter,
  Dependency,
} from './types';
import { parseISO, format } from 'date-fns';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert a date to ISO string format (YYYY-MM-DD)
 */
function toISODate(date: string | Date | null | undefined): string {
  if (!date) return new Date().toISOString().split('T')[0];
  if (typeof date === 'string') {
    // Check if already in ISO format
    if (date.includes('T')) {
      return date.split('T')[0];
    }
    return date;
  }
  return format(date, 'yyyy-MM-dd');
}

/**
 * Calculate duration in days between two dates
 */
function calculateDurationDays(startDate: string, endDate: string): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

// ============================================================================
// ADAPTER: MSProjectTask → UnifiedTask
// ============================================================================

export class MSProjectTaskAdapter implements GanttDataAdapter {
  transformToUnified(tasks: MSProjectTask[]): UnifiedTask[] {
    const flattened: UnifiedTask[] = [];

    const flatten = (taskList: MSProjectTask[], level = 0, parentId?: string) => {
      taskList.forEach((task) => {
        const startDate = toISODate(task.startDate);
        const endDate = toISODate(task.endDate);

        const unifiedTask: UnifiedTask = {
          id: String(task.id),
          name: task.name,
          description: task.notes,
          startDate,
          endDate,
          duration: task.duration || calculateDurationDays(startDate, endDate),
          status: task.status,
          completionPercentage: task.progress,
          priority: task.priority,
          isMilestone: task.milestone,
          assignees: task.assignees,
          effortHours: task.effort,
          estimatedCost: task.cost,
          category: task.category,
          level,
          parentId,
          // Convert simple dependency IDs to full Dependency objects with default FS type
          dependencies: task.dependencies?.map((depId) => ({
            activityId: String(depId),
            type: 'FS' as const,
            lag: 0,
          })),
          subtasks: [],
        };

        flattened.push(unifiedTask);

        // Process subtasks
        if (task.subtasks && task.subtasks.length > 0) {
          const subtasks = flatten(task.subtasks, level + 1, String(task.id));
          unifiedTask.subtasks = subtasks;
        }
      });

      return flattened.filter((t) => t.level === level && t.parentId === parentId);
    };

    return flatten(tasks);
  }

  transformFromUnified(tasks: UnifiedTask[]): MSProjectTask[] {
    const transform = (task: UnifiedTask): MSProjectTask => ({
      id: task.id,
      name: task.name,
      startDate: task.startDate,
      endDate: task.endDate,
      duration: task.duration,
      progress: task.completionPercentage,
      status: task.status,
      priority: task.priority,
      assignees: task.assignees,
      dependencies: task.dependencies?.map((d) => d.activityId),
      milestone: task.isMilestone,
      effort: task.effortHours,
      cost: task.estimatedCost,
      notes: task.description,
      category: task.category,
      subtasks: task.subtasks?.map(transform),
    });

    return tasks.map(transform);
  }

  getContext() {
    return 'microsoft_project' as const;
  }
}

// ============================================================================
// ADAPTER: GanttActivity → UnifiedTask
// ============================================================================

export class GanttActivityAdapter implements GanttDataAdapter {
  transformToUnified(activities: GanttActivity[]): UnifiedTask[] {
    return activities.map((activity) => {
      const startDate = toISODate(activity.start_date);
      const endDate = toISODate(activity.end_date);

      return {
        id: activity.id,
        name: activity.name,
        description: activity.description,
        startDate,
        endDate,
        duration: activity.days_for_activity,
        status: 'in_progress', // Map from activity-specific statuses as needed
        completionPercentage: activity.completion_percentage || 0,
        priority: 'medium', // Default, may need to map from activity data
        assignees: [],
        dependencies: activity.dependencies,
        isCritical: activity.is_critical,
        earlyStart: activity.early_start || undefined,
        earlyFinish: activity.early_finish || undefined,
        lateStart: activity.late_start || undefined,
        lateFinish: activity.late_finish || undefined,
        floatDays: activity.float_days,
        level: 0,
        sequence: activity.sequence,
        phaseId: activity.phase_id || undefined,
        category: activity.activity_type,
        estimatedCost: activity.planned_cost,
        metadata: activity.metadata,
        subtasks: [],
      };
    });
  }

  transformFromUnified(tasks: UnifiedTask[]): GanttActivity[] {
    return tasks.map((task) => ({
      id: task.id,
      name: task.name,
      sequence: task.sequence || 0,
      start_date: task.startDate,
      end_date: task.endDate,
      days_for_activity: task.duration,
      phase_id: task.phaseId,
      dependencies: task.dependencies,
      is_critical: task.isCritical,
      completion_percentage: task.completionPercentage,
      early_start: task.earlyStart,
      early_finish: task.earlyFinish,
      late_start: task.lateStart,
      late_finish: task.lateFinish,
      float_days: task.floatDays,
      activity_type: task.category,
      description: task.description,
      planned_cost: task.estimatedCost,
      metadata: task.metadata,
    }));
  }

  getContext() {
    return 'project_activities' as const;
  }
}

// ============================================================================
// ADAPTER FACTORY
// ============================================================================

/**
 * Detect the data format and return the appropriate adapter
 */
export function getAdapterForData(data: any[]): GanttDataAdapter {
  if (!data || data.length === 0) {
    return new GanttActivityAdapter(); // Default
  }

  const first = data[0];

  // Detect MSProjectTask format (has 'progress' and 'assignees' as arrays)
  if ('progress' in first && 'assignees' in first) {
    return new MSProjectTaskAdapter();
  }

  // Detect GanttActivity format (has 'sequence' and 'days_for_activity')
  if ('sequence' in first && 'days_for_activity' in first) {
    return new GanttActivityAdapter();
  }

  // Default to GanttActivity (database format)
  return new GanttActivityAdapter();
}

/**
 * Create an adapter based on explicit context hint
 */
export function getAdapterForContext(
  context: 'project_activities' | 'microsoft_project' | 'phases' | 'schedule'
): GanttDataAdapter {
  switch (context) {
    case 'microsoft_project':
      return new MSProjectTaskAdapter();
    case 'project_activities':
    case 'phases':
    case 'schedule':
    default:
      return new GanttActivityAdapter();
  }
}
