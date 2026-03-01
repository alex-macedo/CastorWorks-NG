/**
 * What-If Scenario Executor
 *
 * Enables project managers to test multiple scheduling strategies and compare outcomes:
 * - Execute leveling with different strategies (delay, split, extend)
 * - Simulate resource additions/removals
 * - Test critical path changes
 * - Compress schedule with various methods
 * - Compare metrics across scenarios
 */

import { differenceInDays, parseISO } from 'date-fns';
import type { UnifiedTask } from './types';
import { applyResourceLeveling } from './resourceLevelingAlgorithm';

// ============================================================================
// TYPES
// ============================================================================

export interface ScenarioMetrics {
  duration: number;
  resourceConflicts: number;
  criticalPathLength: number;
  estimatedCost: number;
  totalResourceAllocation: number;
  averageResourceUtilization: number;
}

export interface ScenarioExecution {
  id: string;
  name: string;
  description?: string;
  strategy: ScenarioStrategy;
  parameters: Record<string, unknown>;
  tasks: UnifiedTask[];
  metrics: ScenarioMetrics;
  createdAt: Date;
}

export type ScenarioStrategy =
  | 'baseline'
  | 'aggressive-leveling'
  | 'conservative-leveling'
  | 'add-resources'
  | 'remove-resources'
  | 'compress-schedule'
  | 'delay-non-critical'
  | 'parallel-execution'
  | 'custom';

export interface ComparisonResult {
  scenarios: ScenarioExecution[];
  bestForDuration?: string; // scenario id
  bestForCost?: string;
  bestForResourceUtil?: string;
  recommendations: string[];
}

// ============================================================================
// METRICS CALCULATION
// ============================================================================

/**
 * Calculate key metrics for a set of tasks
 */
export function calculateScenarioMetrics(
  tasks: UnifiedTask[],
  projectStart: Date,
  projectEnd: Date
): ScenarioMetrics {
  // Duration: from project start to latest task end
  const latestEnd = new Date(Math.max(
    ...tasks.map((t) => parseISO(t.endDate).getTime())
  ));
  const duration = differenceInDays(latestEnd, projectStart);

  // Resource conflicts: identify over-allocation days
  const dayMap = new Map<string, number>();
  tasks.forEach((task) => {
    const taskStart = parseISO(task.startDate);
    const taskEnd = parseISO(task.endDate);

    for (let d = new Date(taskStart); d <= taskEnd; d.setDate(d.getDate() + 1)) {
      const dayKey = d.toISOString().split('T')[0];
      if (task.resources) {
        task.resources.forEach((r) => {
          const current = dayMap.get(dayKey) || 0;
          dayMap.set(dayKey, current + (r.allocationPercentage || 0));
        });
      }
    }
  });

  const resourceConflicts = Array.from(dayMap.values()).filter((v) => v > 100).length;
  const totalResourceAllocation = Array.from(dayMap.values()).reduce((a, b) => a + b, 0);
  const averageResourceUtilization = dayMap.size > 0
    ? Math.round(totalResourceAllocation / dayMap.size)
    : 0;

  // Critical path length
  const criticalTasks = tasks.filter((t) => t.isCritical);
  const criticalPathLength = criticalTasks.length > 0
    ? Math.max(...criticalTasks.map((t) =>
        differenceInDays(parseISO(t.endDate), parseISO(t.startDate))
      ))
    : 0;

  // Estimated cost (sum of all resource allocations × task duration × hourly rate estimate)
  const estimatedCost = tasks.reduce((total, task) => {
    const taskDuration = differenceInDays(parseISO(task.endDate), parseISO(task.startDate));
    const taskCost = task.resources?.reduce((sum, r) => {
      // Estimate: allocation % × 8 hours/day × 50 $/hour (placeholder)
      const hourlyRate = 50;
      const dailyCost = (r.allocationPercentage || 0) * 0.01 * 8 * hourlyRate;
      return sum + (dailyCost * taskDuration);
    }, 0) || 0;
    return total + taskCost;
  }, 0);

  return {
    duration,
    resourceConflicts,
    criticalPathLength,
    estimatedCost: Math.round(estimatedCost),
    totalResourceAllocation: Math.round(totalResourceAllocation),
    averageResourceUtilization,
  };
}

// ============================================================================
// SCENARIO STRATEGIES
// ============================================================================

/**
 * Strategy: Baseline (no changes)
 */
export function executeBaseline(
  baseTasks: UnifiedTask[],
  projectStart: Date,
  projectEnd: Date
): ScenarioExecution {
  return {
    id: `scenario-${Date.now()}-baseline`,
    name: 'Baseline',
    description: 'Current schedule without any adjustments',
    strategy: 'baseline',
    parameters: {},
    tasks: baseTasks,
    metrics: calculateScenarioMetrics(baseTasks, projectStart, projectEnd),
    createdAt: new Date(),
  };
}

/**
 * Strategy: Aggressive leveling - resolve all conflicts even if it impacts schedule
 */
export function executeAggressiveLeveling(
  baseTasks: UnifiedTask[],
  projectStart: Date,
  projectEnd: Date
): ScenarioExecution {
  const levelingResult = applyResourceLeveling(baseTasks, projectStart, projectEnd, 20);

  const adjustedTasks = baseTasks.map((task) => {
    const adjustment = levelingResult.adjustments.find((a) => a.taskId === task.id);
    if (adjustment) {
      return {
        ...task,
        startDate: adjustment.newStartDate,
        endDate: adjustment.newEndDate,
      };
    }
    return task;
  });

  return {
    id: `scenario-${Date.now()}-aggressive`,
    name: 'Aggressive Leveling',
    description: 'Resolve all resource conflicts (max 20 iterations)',
    strategy: 'aggressive-leveling',
    parameters: { iterations: 20 },
    tasks: adjustedTasks,
    metrics: calculateScenarioMetrics(adjustedTasks, projectStart, projectEnd),
    createdAt: new Date(),
  };
}

/**
 * Strategy: Conservative leveling - minimal schedule impact
 */
export function executeConservativeLeveling(
  baseTasks: UnifiedTask[],
  projectStart: Date,
  projectEnd: Date
): ScenarioExecution {
  const levelingResult = applyResourceLeveling(baseTasks, projectStart, projectEnd, 5);

  const adjustedTasks = baseTasks.map((task) => {
    const adjustment = levelingResult.adjustments.find((a) => a.taskId === task.id);
    if (adjustment) {
      return {
        ...task,
        startDate: adjustment.newStartDate,
        endDate: adjustment.newEndDate,
      };
    }
    return task;
  });

  return {
    id: `scenario-${Date.now()}-conservative`,
    name: 'Conservative Leveling',
    description: 'Resolve conflicts with minimal schedule impact (max 5 iterations)',
    strategy: 'conservative-leveling',
    parameters: { iterations: 5 },
    tasks: adjustedTasks,
    metrics: calculateScenarioMetrics(adjustedTasks, projectStart, projectEnd),
    createdAt: new Date(),
  };
}

/**
 * Strategy: Add resources - increase allocation percentages across the board
 */
export function executeAddResources(
  baseTasks: UnifiedTask[],
  projectStart: Date,
  projectEnd: Date,
  percentageIncrease: number = 20
): ScenarioExecution {
  const adjustedTasks = baseTasks.map((task) => ({
    ...task,
    resources: task.resources?.map((r) => ({
      ...r,
      allocationPercentage: Math.min(100, (r.allocationPercentage || 0) * (1 + percentageIncrease / 100)),
    })),
  }));

  return {
    id: `scenario-${Date.now()}-add-resources`,
    name: `Add Resources (+${percentageIncrease}%)`,
    description: `Increase resource allocation by ${percentageIncrease}% across all tasks`,
    strategy: 'add-resources',
    parameters: { percentageIncrease },
    tasks: adjustedTasks,
    metrics: calculateScenarioMetrics(adjustedTasks, projectStart, projectEnd),
    createdAt: new Date(),
  };
}

/**
 * Strategy: Remove resources - reduce allocation percentages
 */
export function executeRemoveResources(
  baseTasks: UnifiedTask[],
  projectStart: Date,
  projectEnd: Date,
  percentageDecrease: number = 20
): ScenarioExecution {
  const adjustedTasks = baseTasks.map((task) => ({
    ...task,
    resources: task.resources?.map((r) => ({
      ...r,
      allocationPercentage: Math.max(10, (r.allocationPercentage || 0) * (1 - percentageDecrease / 100)),
    })),
  }));

  return {
    id: `scenario-${Date.now()}-remove-resources`,
    name: `Remove Resources (-${percentageDecrease}%)`,
    description: `Decrease resource allocation by ${percentageDecrease}% across all tasks`,
    strategy: 'remove-resources',
    parameters: { percentageDecrease },
    tasks: adjustedTasks,
    metrics: calculateScenarioMetrics(adjustedTasks, projectStart, projectEnd),
    createdAt: new Date(),
  };
}

/**
 * Strategy: Parallel execution - make non-dependent tasks run in parallel
 */
export function executeParallelExecution(
  baseTasks: UnifiedTask[],
  projectStart: Date,
  projectEnd: Date
): ScenarioExecution {
  // Identify tasks with no predecessors
  const taskMap = new Map(baseTasks.map((t) => [t.id, t]));
  const tasksWithDeps = new Set<string>();

  baseTasks.forEach((task) => {
    task.dependencies?.forEach((dep) => {
      tasksWithDeps.add(task.id);
    });
  });

  // For tasks without dependencies, move them to start if not critical path
  const adjustedTasks = baseTasks.map((task) => {
    if (!tasksWithDeps.has(task.id) && !task.isCritical) {
      return {
        ...task,
        startDate: projectStart.toISOString().split('T')[0],
      };
    }
    return task;
  });

  return {
    id: `scenario-${Date.now()}-parallel`,
    name: 'Parallel Execution',
    description: 'Execute non-dependent tasks in parallel to compress schedule',
    strategy: 'parallel-execution',
    parameters: {},
    tasks: adjustedTasks,
    metrics: calculateScenarioMetrics(adjustedTasks, projectStart, projectEnd),
    createdAt: new Date(),
  };
}

// ============================================================================
// MAIN EXECUTION ENGINE
// ============================================================================

/**
 * Execute a scenario with specified strategy
 */
export function executeScenario(
  baseTasks: UnifiedTask[],
  strategy: ScenarioStrategy,
  parameters: Record<string, unknown>,
  projectStart: Date,
  projectEnd: Date
): ScenarioExecution {
  switch (strategy) {
    case 'baseline':
      return executeBaseline(baseTasks, projectStart, projectEnd);

    case 'aggressive-leveling':
      return executeAggressiveLeveling(baseTasks, projectStart, projectEnd);

    case 'conservative-leveling':
      return executeConservativeLeveling(baseTasks, projectStart, projectEnd);

    case 'add-resources':
      return executeAddResources(
        baseTasks,
        projectStart,
        projectEnd,
        (parameters.percentageIncrease as number) || 20
      );

    case 'remove-resources':
      return executeRemoveResources(
        baseTasks,
        projectStart,
        projectEnd,
        (parameters.percentageDecrease as number) || 20
      );

    case 'parallel-execution':
      return executeParallelExecution(baseTasks, projectStart, projectEnd);

    default:
      return executeBaseline(baseTasks, projectStart, projectEnd);
  }
}

/**
 * Execute multiple scenarios for comparison
 */
export function executeMultipleScenarios(
  baseTasks: UnifiedTask[],
  strategies: ScenarioStrategy[],
  projectStart: Date,
  projectEnd: Date
): ScenarioExecution[] {
  return strategies.map((strategy) =>
    executeScenario(baseTasks, strategy, {}, projectStart, projectEnd)
  );
}

/**
 * Compare scenarios and generate recommendations
 */
export function compareScenarios(scenarios: ScenarioExecution[]): ComparisonResult {
  if (scenarios.length === 0) {
    return {
      scenarios: [],
      recommendations: ['No scenarios to compare'],
    };
  }

  // Find best scenarios
  let bestForDuration = scenarios[0].id;
  let bestForCost = scenarios[0].id;
  let bestForResourceUtil = scenarios[0].id;
  let minDuration = scenarios[0].metrics.duration;
  let minCost = scenarios[0].metrics.estimatedCost;
  let minResourceConflicts = scenarios[0].metrics.resourceConflicts;

  scenarios.forEach((scenario) => {
    if (scenario.metrics.duration < minDuration) {
      minDuration = scenario.metrics.duration;
      bestForDuration = scenario.id;
    }
    if (scenario.metrics.estimatedCost < minCost) {
      minCost = scenario.metrics.estimatedCost;
      bestForCost = scenario.id;
    }
    if (scenario.metrics.resourceConflicts < minResourceConflicts) {
      minResourceConflicts = scenario.metrics.resourceConflicts;
      bestForResourceUtil = scenario.id;
    }
  });

  // Generate recommendations
  const recommendations: string[] = [];

  const baselineScenario = scenarios.find((s) => s.strategy === 'baseline');
  const bestDurationScenario = scenarios.find((s) => s.id === bestForDuration);
  const bestCostScenario = scenarios.find((s) => s.id === bestForCost);

  if (baselineScenario && bestDurationScenario) {
    const timeSavings = baselineScenario.metrics.duration - bestDurationScenario.metrics.duration;
    if (timeSavings > 0) {
      recommendations.push(`Schedule can be compressed by ${timeSavings} day(s) using "${bestDurationScenario.name}"`);
    }
  }

  if (baselineScenario && bestCostScenario) {
    const costSavings = baselineScenario.metrics.estimatedCost - bestCostScenario.metrics.estimatedCost;
    if (Math.abs(costSavings) > 100) {
      recommendations.push(`Cost can be ${costSavings > 0 ? 'reduced' : 'increased'} by $${Math.abs(costSavings)} using "${bestCostScenario.name}"`);
    }
  }

  if (minResourceConflicts > 0) {
    recommendations.push(`Current resource conflicts: ${minResourceConflicts} day(s). Consider leveling strategies.`);
  } else {
    recommendations.push('✓ All scenarios have optimal resource utilization');
  }

  return {
    scenarios,
    bestForDuration,
    bestForCost,
    bestForResourceUtil,
    recommendations,
  };
}
