/**
 * Earned Value Management (EVM) Calculator
 *
 * Tracks project performance using integrated cost-schedule analysis:
 * - PV (Planned Value): Budgeted cost of work scheduled
 * - EV (Earned Value): Budgeted cost of work performed
 * - AC (Actual Cost): Actual cost of work performed
 * - Schedule & Cost Variance, Performance Indexes
 * - Projections: EAC, ETC, forecast completion
 */

import { differenceInDays, parseISO, addDays } from 'date-fns';
import type { UnifiedTask } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface TaskActualData {
  taskId: string;
  percentComplete: number; // 0-100
  actualCost: number; // Actual cost spent to date
  actualStartDate?: string;
  actualEndDate?: string;
}

export interface EVMMetrics {
  pv: number; // Planned Value
  ev: number; // Earned Value
  ac: number; // Actual Cost
  sv: number; // Schedule Variance (EV - PV)
  cv: number; // Cost Variance (EV - AC)
  spi: number; // Schedule Performance Index (EV / PV)
  cpi: number; // Cost Performance Index (EV / AC)
  eac: number; // Estimate At Completion
  etc: number; // Estimate To Complete
  status: 'on-track' | 'at-risk' | 'off-track';
  scheduleHealth: number; // -100 to +100, negative = behind schedule
  costHealth: number; // -100 to +100, negative = over budget
}

export interface CompletionForecast {
  projectedCompletionDate: string;
  baselineCompletionDate: string;
  daysVariance: number;
  projectedCost: number;
  baselineCost: number;
  costVariance: number;
  confidence: 'high' | 'medium' | 'low';
  trend: 'improving' | 'stable' | 'deteriorating';
}

export interface EVMTrendPoint {
  date: string;
  week: string;
  pv: number;
  ev: number;
  ac: number;
  spi: number;
  cpi: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate task baseline cost
 */
function calculateTaskBaselineCost(task: UnifiedTask): number {
  const duration = differenceInDays(parseISO(task.endDate), parseISO(task.startDate));
  const hourlyRate = 50; // Placeholder

  return task.resources?.reduce((sum, r) => {
    const dailyCost = (r.allocationPercentage || 0) * 0.01 * 8 * hourlyRate;
    return sum + (dailyCost * duration);
  }, 0) || 0;
}

/**
 * Calculate Planned Value (PV) for a task as of a given date
 */
function calculatePlannedValue(task: UnifiedTask, asOfDate: Date): number {
  const taskStart = parseISO(task.startDate);
  const taskEnd = parseISO(task.endDate);

  if (asOfDate < taskStart) {
    return 0; // Task hasn't started yet
  }

  if (asOfDate >= taskEnd) {
    return calculateTaskBaselineCost(task); // Task is complete
  }

  // Task is in progress - prorate based on schedule
  const totalDuration = differenceInDays(taskEnd, taskStart);
  const elapsed = differenceInDays(asOfDate, taskStart);
  const proratePercentage = elapsed / totalDuration;

  return calculateTaskBaselineCost(task) * proratePercentage;
}

// ============================================================================
// EVM CALCULATION
// ============================================================================

/**
 * Calculate EVM metrics as of a given date
 */
export function calculateEVM(
  tasks: UnifiedTask[],
  actualData: TaskActualData[],
  asOfDate: Date
): EVMMetrics {
  // Create actual data map for quick lookup
  const actualMap = new Map(actualData.map((a) => [a.taskId, a]));

  let totalPV = 0;
  let totalEV = 0;
  let totalAC = 0;

  tasks.forEach((task) => {
    // Calculate PV (Planned Value)
    const taskPV = calculatePlannedValue(task, asOfDate);
    totalPV += taskPV;

    // Calculate EV (Earned Value)
    const actual = actualMap.get(task.id);
    let taskEV = 0;

    if (actual) {
      const taskBaselineCost = calculateTaskBaselineCost(task);
      taskEV = taskBaselineCost * (actual.percentComplete / 100);
    }
    totalEV += taskEV;

    // Get AC (Actual Cost)
    if (actual) {
      totalAC += actual.actualCost;
    }
  });

  // Calculate variances
  const sv = totalEV - totalPV; // Schedule Variance
  const cv = totalEV - totalAC; // Cost Variance

  // Calculate performance indexes
  const spi = totalPV > 0 ? totalEV / totalPV : 0; // Schedule Performance Index
  const cpi = totalAC > 0 ? totalEV / totalAC : 0; // Cost Performance Index

  // Calculate EAC and ETC
  const baselineProjectCost = tasks.reduce((sum, t) => sum + calculateTaskBaselineCost(t), 0);
  let eac = baselineProjectCost; // Default: baseline cost

  if (cpi > 0) {
    // Estimate at Completion = BAC / CPI
    eac = baselineProjectCost / cpi;
  }

  const etc = Math.max(0, eac - totalAC); // Estimate to Complete

  // Determine status
  let status: 'on-track' | 'at-risk' | 'off-track' = 'on-track';
  if (spi < 0.9 || cpi < 0.9) {
    status = 'at-risk';
  }
  if (spi < 0.8 || cpi < 0.8) {
    status = 'off-track';
  }

  // Calculate health metrics (-100 to +100)
  const scheduleHealth = Math.max(-100, Math.min(100, (spi - 1) * 100));
  const costHealth = Math.max(-100, Math.min(100, (cpi - 1) * 100));

  return {
    pv: Math.round(totalPV),
    ev: Math.round(totalEV),
    ac: Math.round(totalAC),
    sv: Math.round(sv),
    cv: Math.round(cv),
    spi: Math.round(spi * 100) / 100,
    cpi: Math.round(cpi * 100) / 100,
    eac: Math.round(eac),
    etc: Math.round(etc),
    status,
    scheduleHealth: Math.round(scheduleHealth),
    costHealth: Math.round(costHealth),
  };
}

// ============================================================================
// FORECASTING
// ============================================================================

/**
 * Forecast project completion based on historical trends
 */
export function forecastCompletion(
  tasks: UnifiedTask[],
  actualData: TaskActualData[],
  historicalMetrics: EVMMetrics[]
): CompletionForecast {
  // Get baseline information
  const baselineStart = new Date(Math.min(
    ...tasks.map((t) => parseISO(t.startDate).getTime())
  ));
  const baselineEnd = new Date(Math.max(
    ...tasks.map((t) => parseISO(t.endDate).getTime())
  ));
  const baselineDuration = differenceInDays(baselineEnd, baselineStart);
  const baselineCost = tasks.reduce((sum, t) => sum + calculateTaskBaselineCost(t), 0);

  // Get current metrics
  const currentMetrics = calculateEVM(tasks, actualData, new Date());

  // Calculate trend from historical data
  let avgSPI = 1.0;
  if (historicalMetrics.length > 0) {
    avgSPI =
      historicalMetrics.reduce((sum, m) => sum + m.spi, 0) /
      historicalMetrics.length;
  } else {
    avgSPI = currentMetrics.spi;
  }

  // Forecast completion date using SPI
  let projectedCompletionDate = baselineEnd;
  if (avgSPI > 0) {
    const remainingDuration = Math.ceil(baselineDuration / avgSPI);
    projectedCompletionDate = addDays(baselineStart, remainingDuration);
  }

  // Forecast cost using CPI
  let projectedCost = baselineCost;
  if (currentMetrics.cpi > 0) {
    projectedCost = currentMetrics.eac;
  }

  // Calculate variances
  const daysVariance = differenceInDays(projectedCompletionDate, baselineEnd);
  const costVariance = projectedCost - baselineCost;

  // Determine confidence and trend
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  if (historicalMetrics.length >= 8) {
    confidence = 'high'; // More data = higher confidence
  } else if (historicalMetrics.length < 3) {
    confidence = 'low'; // Limited data = lower confidence
  }

  let trend: 'improving' | 'stable' | 'deteriorating' = 'stable';
  if (historicalMetrics.length >= 2) {
    const recent = historicalMetrics.slice(-2);
    const spiTrend = recent[1].spi - recent[0].spi;

    if (spiTrend > 0.02) {
      trend = 'improving';
    } else if (spiTrend < -0.02) {
      trend = 'deteriorating';
    }
  }

  return {
    projectedCompletionDate: projectedCompletionDate.toISOString().split('T')[0],
    baselineCompletionDate: baselineEnd.toISOString().split('T')[0],
    daysVariance,
    projectedCost: Math.round(projectedCost),
    baselineCost: Math.round(baselineCost),
    costVariance: Math.round(costVariance),
    confidence,
    trend,
  };
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

/**
 * Generate EVM trend data over time
 */
export function generateEVMTrends(
  tasks: UnifiedTask[],
  actualDataTimeseries: { date: string; data: TaskActualData[] }[]
): EVMTrendPoint[] {
  const trends: EVMTrendPoint[] = [];

  actualDataTimeseries.forEach((entry) => {
    const date = parseISO(entry.date);
    const metrics = calculateEVM(tasks, entry.data, date);

    const week = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      week: 'numeric',
    }).format(date);

    trends.push({
      date: entry.date,
      week,
      pv: metrics.pv,
      ev: metrics.ev,
      ac: metrics.ac,
      spi: metrics.spi,
      cpi: metrics.cpi,
    });
  });

  return trends;
}

// ============================================================================
// INSIGHTS & RECOMMENDATIONS
// ============================================================================

/**
 * Generate actionable insights based on EVM metrics
 */
export function generateEVMInsights(metrics: EVMMetrics, forecast: CompletionForecast): string[] {
  const insights: string[] = [];

  // Schedule Performance
  if (metrics.spi < 0.9) {
    insights.push(
      `⚠️ Schedule at risk: SPI is ${metrics.spi.toFixed(2)} (< 0.90). Project is ${Math.round((1 - metrics.spi) * 100)}% behind schedule.`
    );
  } else if (metrics.spi > 1.05) {
    insights.push(
      `✓ Ahead of schedule: SPI is ${metrics.spi.toFixed(2)}. Project is ${Math.round((metrics.spi - 1) * 100)}% ahead.`
    );
  }

  // Cost Performance
  if (metrics.cpi < 0.9) {
    insights.push(
      `⚠️ Cost overrun: CPI is ${metrics.cpi.toFixed(2)} (< 0.90). Project is ${Math.round((1 - metrics.cpi) * 100)}% over budget.`
    );
  } else if (metrics.cpi > 1.05) {
    insights.push(
      `✓ Under budget: CPI is ${metrics.cpi.toFixed(2)}. Project is ${Math.round((metrics.cpi - 1) * 100)}% under budget.`
    );
  }

  // Forecast
  if (forecast.daysVariance > 0) {
    insights.push(
      `📅 Projected to complete ${forecast.daysVariance} day(s) ${forecast.daysVariance > 0 ? 'late' : 'early'}`
    );
  }

  if (forecast.costVariance > 0) {
    insights.push(
      `💰 Projected cost overrun: $${forecast.costVariance.toLocaleString()}`
    );
  } else if (forecast.costVariance < 0) {
    insights.push(
      `💰 Projected cost savings: $${Math.abs(forecast.costVariance).toLocaleString()}`
    );
  }

  // Trend
  if (forecast.trend === 'improving') {
    insights.push(
      `📈 Positive trend: Project performance is improving. Confidence: ${forecast.confidence}`
    );
  } else if (forecast.trend === 'deteriorating') {
    insights.push(
      `📉 Negative trend: Project performance is deteriorating. Confidence: ${forecast.confidence}`
    );
  }

  if (insights.length === 0) {
    insights.push('✓ Project is on track with healthy performance metrics');
  }

  return insights;
}
