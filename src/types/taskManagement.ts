// ============================================================================
// CONFIGURABLE TASK STATUSES
// ============================================================================

/**
 * Configurable task status for a project
 * Each project can define its own set of statuses
 */
export interface ProjectTaskStatus {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  color: string;
  icon?: string;
  sort_order: number;
  is_default: boolean;
  is_completed: boolean;
  is_system: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// LEGACY TYPES (Backward Compatibility)
// ============================================================================

/**
 * @deprecated Use ProjectTaskStatus instead
 * Legacy hardcoded task statuses - kept for backward compatibility
 */
export type TaskStatus = "not_started" | "in_progress" | "completed" | "blocked";

export type TaskPriority = "low" | "medium" | "high" | "critical";

/**
 * Task interface with support for both legacy and new status system
 */
export interface Task {
  id: string;
  phase_id: string;
  title: string;
  description: string | null;
  category: string;
  status: TaskStatus; // Legacy - deprecated
  status_id?: string; // New - reference to project_task_statuses
  task_status?: ProjectTaskStatus; // Joined status data
  priority: TaskPriority;
  completion_percentage: number;
  assigned_user_id: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * @deprecated Use ProjectTaskStatus instead
 * Legacy status interface
 */
export interface Status {
  id: TaskStatus;
  label: string;
  color: string;
  icon: string;
}

/**
 * @deprecated Use dynamic statuses from useProjectTaskStatuses hook
 * Legacy hardcoded statuses - kept for backward compatibility
 */
export const TASK_STATUSES: Status[] = [
  {
    id: "not_started",
    label: "Not Started",
    color: "gray",
    icon: "circle",
  },
  {
    id: "in_progress",
    label: "In Progress",
    color: "blue",
    icon: "clock",
  },
  {
    id: "completed",
    label: "Completed",
    color: "green",
    icon: "check-circle",
  },
  {
    id: "blocked",
    label: "Blocked",
    color: "red",
    icon: "alert-circle",
  },
];

/**
 * Group tasks by status ID (works with both legacy and new system)
 */
export function groupTasksByStatus(tasks: Task[]): Record<string, Task[]> {
  const grouped: Record<string, Task[]> = {};

  tasks.forEach((task) => {
    // Use status_id if available, otherwise fall back to legacy status
    const statusKey = task.status_id || task.status;
    
    if (!grouped[statusKey]) {
      grouped[statusKey] = [];
    }
    
    grouped[statusKey].push(task);
  });

  return grouped;
}

/**
 * Group tasks by ProjectTaskStatus objects
 */
export function groupTasksByProjectStatus(
  tasks: Task[],
  statuses: ProjectTaskStatus[]
): Record<string, Task[]> {
  // Initialize groups for all statuses
  const grouped: Record<string, Task[]> = {};
  statuses.forEach(status => {
    grouped[status.id] = [];
  });

  // Group tasks
  tasks.forEach((task) => {
    const statusId = task.status_id;
    if (statusId && grouped[statusId]) {
      grouped[statusId].push(task);
    }
  });

  return grouped;
}

// Checklist types for architect tasks
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  created_at: string;
}

export interface TaskWithChecklist {
  id: string;
  project_id: string;
  phase_id: string | null;
  title: string;
  description: string | null;
  assignee_id: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  tags: any[];
  checklist_items: ChecklistItem[];
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}
