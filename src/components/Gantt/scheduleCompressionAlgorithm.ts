/**
 * Schedule Compression Algorithm
 *
 * Accelerates project completion through:
 * - Fast-tracking: Perform tasks in parallel (reduce duration without cost increase)
 * - Crashing: Add resources to reduce task duration (increases cost)
 *
 * Generates Pareto frontier showing cost-duration trade-offs
 */

import { differenceInDays, parseISO, addDays } from 'date-fns';
import type { UnifiedTask } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface CompressionOption {
  taskId: string;
  taskName: string;
  method: 'fast-track' | 'crash';
  originalDuration: number;
  daysReduced: number;
  maxDaysReducible: number;
  costIncrease: number;
  costPerDayReduced: number;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
}

export interface CompressionResult {
  originalDuration: number;
  originalCost: number;
  compressedDuration: number;
  compressedCost: number;
  totalDaysReduced: number;
  totalCostIncrease: number;
  compressionPercentage: number;
  costPerDayReduced: number;
  options: CompressionOption[];
  paretoPoints: { duration: number; cost: number }[];
  recommendations: string[];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate estimated cost of a task based on resources
 */
function calculateTaskCost(task: UnifiedTask): number {
  const duration = differenceInDays(parseISO(task.endDate), parseISO(task.startDate));
  const hourlyRate = 50; // Placeholder estimate

  return task.resources?.reduce((sum, r) => {
    const dailyCost = (r.allocationPercentage || 0) * 0.01 * 8 * hourlyRate;
    return sum + (dailyCost * duration);
  }, 0) || 0;
}

/**
 * Calculate total project cost
 */
function calculateProjectCost(tasks: UnifiedTask[]): number {
  return tasks.reduce((sum, task) => sum + calculateTaskCost(task), 0);
}

/**
 * Calculate project duration
 */
function calculateProjectDuration(tasks: UnifiedTask[]): number {
  if (tasks.length === 0) return 0;

  const latestEnd = new Date(Math.max(
    ...tasks.map((t) => parseISO(t.endDate).getTime())
  ));

  // Assume project starts at earliest task start
  const earliestStart = new Date(Math.min(
    ...tasks.map((t) => parseISO(t.startDate).getTime())
  ));

  return differenceInDays(latestEnd, earliestStart);
}

// ============================================================================
// FAST-TRACKING STRATEGY
// ============================================================================

/**
 * Identify tasks that can be parallelized
 * Returns tasks that have no dependencies or can be shifted to start earlier
 */
function identifyParallelizableTasks(tasks: UnifiedTask[]): CompressionOption[] {
  const options: CompressionOption[] = [];

  tasks.forEach((task) => {
    // Check if task is non-critical and can be moved up
    if (!task.isCritical && task.float && task.float > 0) {
      const daysReducible = Math.min(task.float, Math.ceil(task.float / 2));

      options.push({
        taskId: task.id,
        taskName: task.name,
        method: 'fast-track',
        originalDuration: differenceInDays(
          parseISO(task.endDate),
          parseISO(task.startDate)
        ),
        daysReduced: daysReducible,
        maxDaysReducible: daysReducible,
        costIncrease: 0, // Fast-tracking doesn't increase cost
        costPerDayReduced: 0,
        riskLevel: daysReducible > 5 ? 'high' : daysReducible > 2 ? 'medium' : 'low',
        reason: `Can overlap with predecessor task(s) using available float (${task.float} days)`,
      });
    }
  });

  // Sort by risk level (low first) and days reducible (most first)
  return options.sort((a, b) => {
    const riskOrder = { low: 0, medium: 1, high: 2 };
    if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    }
    return b.daysReduced - a.daysReduced;
  });
}

// ============================================================================
// CRASHING STRATEGY
// ============================================================================

/**
 * Identify tasks that can be crashed (resources added)
 * Crashing reduces task duration but increases cost
 */
function identifyCrashableTasks(tasks: UnifiedTask[]): CompressionOption[] {
  const options: CompressionOption[] = [];

  tasks.forEach((task) => {
    const duration = differenceInDays(parseISO(task.endDate), parseISO(task.startDate));
    const currentCost = calculateTaskCost(task);

    // Max reduction: 50% of original duration
    const maxDaysReducible = Math.max(1, Math.floor(duration * 0.5));

    // Crash cost: add 30% to cost per day crashed
    const costIncrease = currentCost * 0.3 * (maxDaysReducible / duration);
    const costPerDayReduced = costIncrease / maxDaysReducible;

    options.push({
      taskId: task.id,
      taskName: task.name,
      method: 'crash',
      originalDuration: duration,
      daysReduced: maxDaysReducible,
      maxDaysReducible,
      costIncrease,
      costPerDayReduced,
      riskLevel: task.isCritical ? 'high' : 'medium',
      reason: `Add resources to reduce from ${duration} to ${duration - maxDaysReducible} days`,
    });
  });

  // Sort by cost per day reduced (cheapest first)
  return options.sort((a, b) => a.costPerDayReduced - b.costPerDayReduced);
}

// ============================================================================
// MAIN COMPRESSION ALGORITHM
// ============================================================================

/**
 * Analyze schedule compression options and generate Pareto frontier
 *
 * Algorithm:
 * 1. Identify fast-tracking opportunities (parallel execution)
 * 2. Identify crashing opportunities (add resources)
 * 3. Generate Pareto frontier of cost-duration combinations
 * 4. Calculate metrics and recommendations
 */
export function analyzeCompression(
  baseTasks: UnifiedTask[],
  projectStart?: Date,
  projectEnd?: Date
): CompressionResult {
  if (baseTasks.length === 0) {
    return {
      originalDuration: 0,
      originalCost: 0,
      compressedDuration: 0,
      compressedCost: 0,
      totalDaysReduced: 0,
      totalCostIncrease: 0,
      compressionPercentage: 0,
      costPerDayReduced: 0,
      options: [],
      paretoPoints: [],
      recommendations: ['No tasks to analyze'],
    };
  }

  // Calculate baseline metrics
  const originalDuration = calculateProjectDuration(baseTasks);
  const originalCost = calculateProjectCost(baseTasks);

  // Identify all compression options
  const fastTrackOptions = identifyParallelizableTasks(baseTasks);
  const crashOptions = identifyCrashableTasks(baseTasks);
  const allOptions = [...fastTrackOptions, ...crashOptions];

  // Generate Pareto frontier
  const paretoPoints: { duration: number; cost: number }[] = [];

  // Add baseline point
  paretoPoints.push({ duration: originalDuration, cost: originalCost });

  // Apply fast-tracking options (no cost increase)
  let fastTrackReduction = 0;
  fastTrackOptions.forEach((option) => {
    fastTrackReduction += option.daysReduced;
    paretoPoints.push({
      duration: Math.max(1, originalDuration - fastTrackReduction),
      cost: originalCost, // No cost increase for fast-tracking
    });
  });

  // Apply crashing options (cost increase)
  let crashReduction = 0;
  let crashCost = 0;
  crashOptions.slice(0, 5).forEach((option) => {
    crashReduction += option.maxDaysReducible;
    crashCost += option.costIncrease;
    paretoPoints.push({
      duration: Math.max(1, originalDuration - fastTrackReduction - crashReduction),
      cost: originalCost + crashCost,
    });
  });

  // Remove duplicates and sort by duration
  const uniquePoints = Array.from(
    new Map(paretoPoints.map((p) => [p.duration, p])).values()
  ).sort((a, b) => a.duration - b.duration);

  // Calculate best compression point
  const maxCompression = uniquePoints[uniquePoints.length - 1];
  const totalDaysReduced = originalDuration - maxCompression.duration;
  const totalCostIncrease = maxCompression.cost - originalCost;
  const compressionPercentage = ((totalDaysReduced / originalDuration) * 100);
  const costPerDayReduced = totalDaysReduced > 0
    ? Math.round(totalCostIncrease / totalDaysReduced)
    : 0;

  // Generate recommendations
  const recommendations: string[] = [];

  if (fastTrackOptions.length > 0) {
    recommendations.push(
      `✓ ${fastTrackOptions.length} task(s) can be parallelized for up to ${
        fastTrackOptions.reduce((sum, o) => sum + o.daysReduced, 0)
      } day(s) with NO cost increase`
    );
  }

  if (crashOptions.length > 0) {
    const cheapestCrash = crashOptions[0];
    recommendations.push(
      `• Crashing ${cheapestCrash.taskName} costs $${Math.round(cheapestCrash.costPerDayReduced)}/day (cheapest option)`
    );
  }

  if (totalDaysReduced > 0) {
    recommendations.push(
      `• Maximum compression: ${totalDaysReduced} days reduction at +$${Math.round(totalCostIncrease)} cost`
    );
    recommendations.push(
      `• Cost per day compressed: $${costPerDayReduced}/day (average)`
    );
  } else {
    recommendations.push('• No compression opportunities identified');
  }

  if (compressionPercentage >= 10) {
    recommendations.push(
      `⚡ Significant compression available: ${Math.round(compressionPercentage)}% time reduction possible`
    );
  }

  return {
    originalDuration,
    originalCost: Math.round(originalCost),
    compressedDuration: maxCompression.duration,
    compressedCost: Math.round(maxCompression.cost),
    totalDaysReduced,
    totalCostIncrease: Math.round(totalCostIncrease),
    compressionPercentage: Math.round(compressionPercentage * 10) / 10,
    costPerDayReduced,
    options: allOptions,
    paretoPoints: uniquePoints,
    recommendations,
  };
}

/**
 * Apply compression strategy to tasks
 * Returns modified tasks with reduced durations
 */
export function applyCompression(
  baseTasks: UnifiedTask[],
  compressionLevel: 'light' | 'moderate' | 'aggressive'
): UnifiedTask[] {
  const compression = analyzeCompression(baseTasks);

  if (compression.options.length === 0) {
    return baseTasks;
  }

  // Select options based on compression level
  let selectedOptions: CompressionOption[] = [];

  if (compressionLevel === 'light') {
    // Only apply fast-tracking, low-risk options
    selectedOptions = compression.options
      .filter((o) => o.method === 'fast-track' && o.riskLevel === 'low')
      .slice(0, 2);
  } else if (compressionLevel === 'moderate') {
    // Fast-tracking + some low-risk crashing
    selectedOptions = [
      ...compression.options.filter(
        (o) => o.method === 'fast-track' && o.riskLevel === 'low'
      ),
      ...compression.options
        .filter((o) => o.method === 'crash' && o.riskLevel === 'low')
        .slice(0, 2),
    ];
  } else {
    // Aggressive: apply all options
    selectedOptions = compression.options.slice(0, 8);
  }

  // Apply selected options
  const adjustedTasks = baseTasks.map((task) => {
    const option = selectedOptions.find((o) => o.taskId === task.id);

    if (option) {
      const daysToReduce = option.daysReduced;
      const newEnd = addDays(parseISO(task.endDate), -daysToReduce);

      return {
        ...task,
        endDate: newEnd.toISOString().split('T')[0],
      };
    }

    return task;
  });

  return adjustedTasks;
}

/**
 * Get specific compression recommendations for a given target duration
 */
export function getCompressionForTargetDuration(
  baseTasks: UnifiedTask[],
  targetDuration: number
): CompressionOption[] {
  const compression = analyzeCompression(baseTasks);
  const currentDuration = compression.originalDuration;

  if (targetDuration >= currentDuration) {
    return [];
  }

  const daysNeeded = currentDuration - targetDuration;
  const selectedOptions: CompressionOption[] = [];
  let daysReduced = 0;

  // First, apply fast-tracking (no cost)
  for (const option of compression.options.filter((o) => o.method === 'fast-track')) {
    if (daysReduced >= daysNeeded) break;
    selectedOptions.push(option);
    daysReduced += option.daysReduced;
  }

  // Then, apply crashing (sorted by cost per day)
  if (daysReduced < daysNeeded) {
    for (const option of compression.options.filter((o) => o.method === 'crash')) {
      if (daysReduced >= daysNeeded) break;
      const daysNeededStill = daysNeeded - daysReduced;
      const daysToApply = Math.min(option.maxDaysReducible, daysNeededStill);

      selectedOptions.push({
        ...option,
        daysReduced: daysToApply,
        costIncrease: (option.costIncrease / option.maxDaysReducible) * daysToApply,
      });

      daysReduced += daysToApply;
    }
  }

  return selectedOptions;
}
