/**
 * Dependency Validator for Gantt Chart
 *
 * Handles validation of task dependencies including:
 * - Circular dependency detection
 * - Dependency chain validation
 * - Self-reference prevention
 * - Duplicate dependency prevention
 */

import { UnifiedTask, Dependency } from './types';

// ============================================================================
// CIRCULAR DEPENDENCY DETECTION
// ============================================================================

/**
 * Build adjacency list for dependency graph
 */
function buildDependencyGraph(tasks: UnifiedTask[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  // Initialize all tasks in graph
  tasks.forEach((task) => {
    if (!graph.has(task.id)) {
      graph.set(task.id, []);
    }
  });

  // Add edges from dependencies
  tasks.forEach((task) => {
    if (task.dependencies) {
      task.dependencies.forEach((dep) => {
        const deps = graph.get(task.id) || [];
        deps.push(dep.activityId);
        graph.set(task.id, deps);
      });
    }
  });

  return graph;
}

/**
 * DFS traversal to detect cycles
 */
function hasCycleDFS(
  node: string,
  graph: Map<string, string[]>,
  visited: Set<string>,
  recursionStack: Set<string>,
  cycleNodes: string[]
): boolean {
  visited.add(node);
  recursionStack.add(node);
  cycleNodes.push(node);

  const neighbors = graph.get(node) || [];

  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      if (hasCycleDFS(neighbor, graph, visited, recursionStack, cycleNodes)) {
        return true;
      }
    } else if (recursionStack.has(neighbor)) {
      // Found a cycle
      return true;
    }
  }

  recursionStack.delete(node);
  return false;
}

/**
 * Detect if adding a dependency would create a cycle
 * This is the key validation function for the UI
 */
export function wouldCreateCycle(
  sourceTaskId: string,
  targetTaskId: string,
  allTasks: UnifiedTask[]
): { hasCycle: boolean; cycle: string[] } {
  // Self-reference check
  if (sourceTaskId === targetTaskId) {
    return { hasCycle: true, cycle: [sourceTaskId] };
  }

  // Build graph with the new edge
  const taskMap = new Map(allTasks.map((t) => [t.id, t]));
  const graph = buildDependencyGraph(allTasks);

  // Temporarily add the new edge
  const sourceEdges = graph.get(sourceTaskId) || [];
  sourceEdges.push(targetTaskId);
  graph.set(sourceTaskId, sourceEdges);

  // Check for cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  for (const taskId of graph.keys()) {
    if (!visited.has(taskId)) {
      const cycleNodes: string[] = [];
      if (hasCycleDFS(taskId, graph, visited, recursionStack, cycleNodes)) {
        return { hasCycle: true, cycle: cycleNodes };
      }
    }
  }

  return { hasCycle: false, cycle: [] };
}

/**
 * Check if there are any circular dependencies in the entire task set
 */
export function checkForCircularDependencies(tasks: UnifiedTask[]): {
  valid: boolean;
  cycles: string[][];
} {
  const graph = buildDependencyGraph(tasks);
  const visited = new Set<string>();
  const cycles: string[][] = [];

  const dfs = (
    node: string,
    recursionStack: Set<string>,
    path: string[]
  ): boolean => {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, recursionStack, [...path])) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found cycle
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), neighbor]);
        }
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  };

  for (const taskId of graph.keys()) {
    if (!visited.has(taskId)) {
      dfs(taskId, new Set(), []);
    }
  }

  return {
    valid: cycles.length === 0,
    cycles,
  };
}

// ============================================================================
// DUPLICATE DEPENDENCY PREVENTION
// ============================================================================

/**
 * Check if a dependency already exists
 */
export function dependencyExists(
  task: UnifiedTask,
  targetTaskId: string,
  dependencyType?: string
): boolean {
  if (!task.dependencies) return false;

  return task.dependencies.some((dep) => {
    if (dep.activityId !== targetTaskId) return false;
    return !dependencyType || dep.type === dependencyType;
  });
}

/**
 * Remove duplicate dependency before adding new one
 */
export function removeDuplicate(
  task: UnifiedTask,
  targetTaskId: string
): UnifiedTask {
  return {
    ...task,
    dependencies: task.dependencies?.filter((dep) => dep.activityId !== targetTaskId),
  };
}

// ============================================================================
// DEPENDENCY CHAIN ANALYSIS
// ============================================================================

/**
 * Get all predecessors of a task (transitive closure)
 */
export function getPredecessors(
  taskId: string,
  tasks: UnifiedTask[]
): UnifiedTask[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const task = taskMap.get(taskId);
  if (!task?.dependencies) return [];

  const predecessors: UnifiedTask[] = [];
  const visited = new Set<string>();

  const collect = (depId: string) => {
    if (visited.has(depId)) return;
    visited.add(depId);

    const depTask = taskMap.get(depId);
    if (depTask) {
      predecessors.push(depTask);

      // Recursively collect predecessors of this predecessor
      depTask.dependencies?.forEach((d) => collect(d.activityId));
    }
  };

  task.dependencies.forEach((dep) => collect(dep.activityId));

  return predecessors;
}

/**
 * Get all successors of a task (transitive closure)
 */
export function getSuccessors(
  taskId: string,
  tasks: UnifiedTask[]
): UnifiedTask[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const successors: UnifiedTask[] = [];
  const visited = new Set<string>();

  const collect = (currentTaskId: string) => {
    tasks.forEach((task) => {
      if (visited.has(task.id)) return;

      if (task.dependencies?.some((dep) => dep.activityId === currentTaskId)) {
        visited.add(task.id);
        successors.push(task);

        // Recursively collect successors of this successor
        collect(task.id);
      }
    });
  };

  collect(taskId);

  return successors;
}

/**
 * Get complete dependency chain for a task (predecessors + successors)
 */
export function getDependencyChain(
  taskId: string,
  tasks: UnifiedTask[]
): {
  predecessors: UnifiedTask[];
  successors: UnifiedTask[];
} {
  return {
    predecessors: getPredecessors(taskId, tasks),
    successors: getSuccessors(taskId, tasks),
  };
}

// ============================================================================
// VALIDATION RESULTS
// ============================================================================

export interface DependencyValidationError {
  type: 'self-reference' | 'circular' | 'duplicate' | 'invalid-task';
  message: string;
  sourceTaskId: string;
  targetTaskId: string;
  affectedTasks?: string[];
}

/**
 * Comprehensive validation of a proposed dependency
 */
export function validateDependency(
  sourceTaskId: string,
  targetTaskId: string,
  dependencyType: string,
  allTasks: UnifiedTask[]
): {
  valid: boolean;
  errors: DependencyValidationError[];
} {
  const errors: DependencyValidationError[] = [];
  const taskMap = new Map(allTasks.map((t) => [t.id, t]));

  // Check if tasks exist
  if (!taskMap.has(sourceTaskId)) {
    errors.push({
      type: 'invalid-task',
      message: `Source task "${sourceTaskId}" not found`,
      sourceTaskId,
      targetTaskId,
    });
  }

  if (!taskMap.has(targetTaskId)) {
    errors.push({
      type: 'invalid-task',
      message: `Target task "${targetTaskId}" not found`,
      sourceTaskId,
      targetTaskId,
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Self-reference check
  if (sourceTaskId === targetTaskId) {
    errors.push({
      type: 'self-reference',
      message: 'A task cannot depend on itself',
      sourceTaskId,
      targetTaskId,
    });
  }

  // Circular dependency check
  const { hasCycle, cycle } = wouldCreateCycle(sourceTaskId, targetTaskId, allTasks);
  if (hasCycle) {
    errors.push({
      type: 'circular',
      message: `Adding this dependency would create a circular dependency: ${cycle.join(' → ')}`,
      sourceTaskId,
      targetTaskId,
      affectedTasks: cycle,
    });
  }

  // Duplicate check
  const sourceTask = taskMap.get(sourceTaskId);
  if (sourceTask && dependencyExists(sourceTask, targetTaskId, dependencyType)) {
    errors.push({
      type: 'duplicate',
      message: `This dependency already exists`,
      sourceTaskId,
      targetTaskId,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// USER-FRIENDLY MESSAGES
// ============================================================================

/**
 * Get human-readable error message for display in UI
 */
export function getErrorMessage(error: DependencyValidationError): string {
  switch (error.type) {
    case 'self-reference':
      return 'A task cannot depend on itself';
    case 'circular':
      return `This would create a circular dependency. Cycle: ${error.affectedTasks?.join(' → ')}`;
    case 'duplicate':
      return 'This dependency already exists';
    case 'invalid-task':
      return error.message;
    default:
      return 'Unknown validation error';
  }
}

/**
 * Suggest alternative dependency paths if circular dependency detected
 */
export function suggestAlternatives(
  sourceTaskId: string,
  targetTaskId: string,
  allTasks: UnifiedTask[]
): UnifiedTask[] {
  const taskMap = new Map(allTasks.map((t) => [t.id, t]));
  const sourceTask = taskMap.get(sourceTaskId);
  const targetTask = taskMap.get(targetTaskId);

  if (!sourceTask || !targetTask) return [];

  // Get all predecessors of source that aren't dependencies yet
  const predecessors = getPredecessors(sourceTaskId, allTasks);
  return predecessors.filter(
    (p) =>
      p.id !== targetTaskId &&
      !sourceTask.dependencies?.some((d) => d.activityId === p.id)
  );
}
