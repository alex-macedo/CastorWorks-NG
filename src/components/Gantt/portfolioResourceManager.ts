/**
 * Portfolio Resource Manager
 *
 * Manages resources, dependencies, and scheduling across multiple projects:
 * - Cross-project dependencies
 * - Shared resource allocation
 * - Portfolio leveling
 * - Critical chain analysis
 * - Consolidated metrics
 */

import { differenceInDays, parseISO, addDays } from 'date-fns';
import type { UnifiedTask } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectDependency {
  sourceProjectId: string;
  targetProjectId: string;
  dependencyType: 'finish-to-start' | 'finish-to-finish' | 'start-to-start' | 'start-to-finish';
  lagDays?: number;
}

export interface SharedResourceAllocation {
  resourceId: string;
  projectId: string;
  allocationPercentage: number;
}

export interface Portfolio {
  id: string;
  name: string;
  projects: UnifiedTask[][];
  crossProjectDependencies: ProjectDependency[];
  sharedResources: SharedResourceAllocation[];
}

export interface PortfolioMetrics {
  totalDuration: number;
  resourceUtilization: number;
  criticalChainLength: number;
  portfolioRiskScore: number;
  totalProjectCost: number;
  projectCount: number;
  taskCount: number;
  resourceConflicts: number;
}

export interface PortfolioLevelingResult {
  adjustments: Array<{
    projectId: string;
    taskId: string;
    originalStartDate: string;
    originalEndDate: string;
    newStartDate: string;
    newEndDate: string;
    reason: string;
  }>;
  conflictsResolved: number;
  remainingConflicts: number;
  portfolioImpact: number; // Days added to portfolio duration
}

// ============================================================================
// PORTFOLIO CREATION
// ============================================================================

/**
 * Create a portfolio view from multiple projects
 */
export function createPortfolioView(
  projects: { id: string; tasks: UnifiedTask[] }[],
  dependencies: ProjectDependency[] = []
): Portfolio {
  return {
    id: `portfolio-${Date.now()}`,
    name: `Portfolio (${projects.length} projects)`,
    projects: projects.map((p) => p.tasks),
    crossProjectDependencies: dependencies,
    sharedResources: [],
  };
}

// ============================================================================
// METRICS CALCULATION
// ============================================================================

/**
 * Calculate portfolio-level metrics
 */
export function calculatePortfolioMetrics(portfolio: Portfolio): PortfolioMetrics {
  // Flatten all tasks
  const allTasks = portfolio.projects.flat();

  // Calculate total duration
  const projectDurations = portfolio.projects.map((projectTasks) => {
    if (projectTasks.length === 0) return 0;
    const startDates = projectTasks.map((t) => parseISO(t.startDate).getTime());
    const endDates = projectTasks.map((t) => parseISO(t.endDate).getTime());
    return differenceInDays(new Date(Math.max(...endDates)), new Date(Math.min(...startDates)));
  });

  const totalDuration = Math.max(...projectDurations, 0);

  // Calculate resource utilization
  let totalAllocation = 0;
  let dayCount = 0;

  portfolio.projects.forEach((projectTasks) => {
    if (projectTasks.length === 0) return;

    const startDates = projectTasks.map((t) => parseISO(t.startDate).getTime());
    const endDates = projectTasks.map((t) => parseISO(t.endDate).getTime());
    const projectStart = new Date(Math.min(...startDates));
    const projectEnd = new Date(Math.max(...endDates));
    const days = differenceInDays(projectEnd, projectStart);

    projectTasks.forEach((task) => {
      task.resources?.forEach((r) => {
        totalAllocation += r.allocationPercentage || 0;
      });
    });

    dayCount += days;
  });

  const resourceUtilization = dayCount > 0 ? Math.round(totalAllocation / (allTasks.length * dayCount) * 100) : 0;

  // Calculate critical chain length
  const criticalTasks = allTasks.filter((t) => t.isCritical);
  const criticalChainLength = criticalTasks.length > 0
    ? Math.max(...criticalTasks.map((t) =>
        differenceInDays(parseISO(t.endDate), parseISO(t.startDate))
      ))
    : 0;

  // Count resource conflicts
  const resourceConflicts = countPortfolioResourceConflicts(portfolio);

  // Calculate portfolio risk score (0-100)
  let riskScore = 0;
  if (resourceConflicts > 0) riskScore += 30;
  if (resourceUtilization > 80) riskScore += 20;
  if (portfolio.crossProjectDependencies.length > 5) riskScore += 20;
  riskScore = Math.min(100, riskScore);

  // Calculate total cost
  const totalCost = allTasks.reduce((sum, task) => {
    const duration = differenceInDays(parseISO(task.endDate), parseISO(task.startDate));
    const hourlyRate = 50;
    const taskCost = task.resources?.reduce((s, r) => {
      const dailyCost = (r.allocationPercentage || 0) * 0.01 * 8 * hourlyRate;
      return s + (dailyCost * duration);
    }, 0) || 0;
    return sum + taskCost;
  }, 0);

  return {
    totalDuration,
    resourceUtilization: Math.min(100, resourceUtilization),
    criticalChainLength,
    portfolioRiskScore: riskScore,
    totalProjectCost: Math.round(totalCost),
    projectCount: portfolio.projects.length,
    taskCount: allTasks.length,
    resourceConflicts,
  };
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Count resource conflicts across portfolio
 */
function countPortfolioResourceConflicts(portfolio: Portfolio): number {
  const allTasks = portfolio.projects.flat();
  if (allTasks.length === 0) return 0;

  // Get date range
  const startDates = allTasks.map((t) => parseISO(t.startDate).getTime());
  const endDates = allTasks.map((t) => parseISO(t.endDate).getTime());
  const portfolioStart = new Date(Math.min(...startDates));
  const portfolioEnd = new Date(Math.max(...endDates));

  let conflictCount = 0;
  const dayMs = 24 * 60 * 60 * 1000;

  for (let time = portfolioStart.getTime(); time <= portfolioEnd.getTime(); time += dayMs) {
    const day = new Date(time);
    const resourceLoads = new Map<string, number>();

    allTasks.forEach((task) => {
      const taskStart = parseISO(task.startDate);
      const taskEnd = parseISO(task.endDate);

      if (day >= taskStart && day <= taskEnd && task.resources) {
        task.resources.forEach((resource) => {
          const current = resourceLoads.get(resource.resourceId) || 0;
          resourceLoads.set(resource.resourceId, current + (resource.allocationPercentage || 0));
        });
      }
    });

    resourceLoads.forEach((load) => {
      if (load > 100) conflictCount++;
    });
  }

  return conflictCount;
}

// ============================================================================
// PORTFOLIO LEVELING
// ============================================================================

/**
 * Apply resource leveling across portfolio
 * Resolves conflicts by delaying non-critical tasks in lower-priority projects
 */
export function levelPortfolioResources(
  portfolio: Portfolio,
  projectPriorities?: Map<string, number>
): PortfolioLevelingResult {
  const adjustments: PortfolioLevelingResult['adjustments'] = [];
  const workingProjects = portfolio.projects.map((tasks) =>
    JSON.parse(JSON.stringify(tasks))
  ) as UnifiedTask[][];

  // Default priorities: earlier projects have higher priority
  if (!projectPriorities) {
    projectPriorities = new Map();
    portfolio.projects.forEach((_, idx) => {
      projectPriorities!.set(`project-${idx}`, 100 - idx * 10);
    });
  }

  // Identify and resolve conflicts iteratively
  let iteration = 0;
  const maxIterations = 10;

  while (iteration < maxIterations) {
    iteration++;

    // Get all tasks with project context
    const allTasksWithProject: Array<{ projectId: string; projectIdx: number; task: UnifiedTask }> = [];
    workingProjects.forEach((tasks, projectIdx) => {
      tasks.forEach((task) => {
        allTasksWithProject.push({
          projectId: `project-${projectIdx}`,
          projectIdx,
          task,
        });
      });
    });

    // Check for conflicts
    const conflicts = countPortfolioResourceConflicts(createPortfolioView(
      portfolio.projects.map((_, idx) => ({
        id: `project-${idx}`,
        tasks: workingProjects[idx],
      })),
      portfolio.crossProjectDependencies
    ));

    if (conflicts === 0) break;

    // Find a non-critical task with float to delay
    let adjusted = false;

    for (const { projectId, projectIdx, task } of allTasksWithProject) {
      if (task.isCritical || !task.float || task.float <= 0) continue;

      // Check priority
      const priority = projectPriorities.get(projectId) || 50;
      if (priority > 75) continue; // High priority projects don't get delayed

      // Try delaying by 1 day
      const delayDays = 1;
      if (delayDays <= (task.float || 0)) {
        const newStart = addDays(parseISO(task.startDate), delayDays);
        const newEnd = addDays(parseISO(task.endDate), delayDays);

        adjustments.push({
          projectId,
          taskId: task.id,
          originalStartDate: task.startDate,
          originalEndDate: task.endDate,
          newStartDate: newStart.toISOString().split('T')[0],
          newEndDate: newEnd.toISOString().split('T')[0],
          reason: `Delayed ${delayDays} day(s) to resolve portfolio resource conflict`,
        });

        // Apply adjustment
        workingProjects[projectIdx] = workingProjects[projectIdx].map((t) =>
          t.id === task.id
            ? {
                ...t,
                startDate: newStart.toISOString().split('T')[0],
                endDate: newEnd.toISOString().split('T')[0],
              }
            : t
        );

        adjusted = true;
        break;
      }
    }

    if (!adjusted) break;
  }

  // Calculate final metrics
  const finalPortfolio = createPortfolioView(
    portfolio.projects.map((_, idx) => ({
      id: `project-${idx}`,
      tasks: workingProjects[idx],
    })),
    portfolio.crossProjectDependencies
  );

  const finalConflicts = countPortfolioResourceConflicts(finalPortfolio);

  // Calculate portfolio duration impact
  const originalMetrics = calculatePortfolioMetrics(portfolio);
  const finalMetrics = calculatePortfolioMetrics(finalPortfolio);
  const portfolioImpact = finalMetrics.totalDuration - originalMetrics.totalDuration;

  return {
    adjustments,
    conflictsResolved: Math.max(0, Math.min(
      countPortfolioResourceConflicts(portfolio),
      adjustments.length
    )),
    remainingConflicts: finalConflicts,
    portfolioImpact,
  };
}

/**
 * Get portfolio-level recommendations
 */
export function getPortfolioRecommendations(portfolio: Portfolio, metrics: PortfolioMetrics): string[] {
  const recommendations: string[] = [];

  if (metrics.resourceConflicts > 5) {
    recommendations.push(
      `⚠️ High resource conflicts: ${metrics.resourceConflicts} conflicts detected. Consider portfolio leveling.`
    );
  }

  if (metrics.portfolioRiskScore > 60) {
    recommendations.push(
      `📊 Portfolio risk is elevated (${metrics.portfolioRiskScore}/100). Monitor critical path closely.`
    );
  }

  if (portfolio.crossProjectDependencies.length > 10) {
    recommendations.push(
      `🔗 Many cross-project dependencies (${portfolio.crossProjectDependencies.length}). Consider dependency chain optimization.`
    );
  }

  if (metrics.resourceUtilization > 85) {
    recommendations.push(
      `📈 Resource utilization is high (${metrics.resourceUtilization}%). Limited flexibility for changes.`
    );
  } else if (metrics.resourceUtilization < 50) {
    recommendations.push(
      `📉 Low resource utilization (${metrics.resourceUtilization}%). Consider consolidating projects or reallocating resources.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✓ Portfolio is well-balanced with healthy metrics');
  }

  return recommendations;
}
