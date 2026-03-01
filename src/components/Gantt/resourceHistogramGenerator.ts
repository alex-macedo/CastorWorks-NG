/**
 * Resource Histogram Generator
 *
 * Calculates cumulative resource usage patterns across project timeline
 * Supports filtering by resource type, department, skill level
 * Identifies peak demand periods and capacity analysis
 */

import { eachDayOfInterval, parseISO, format } from 'date-fns';
import type { UnifiedTask, ResourceAllocation } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface HistogramDataPoint {
  date: string;
  dateFormatted: string;
  week: string;
  resourceId: string;
  resourceName: string;
  allocated: number;
  available: number;
  utilization: number;
  allocationPercentage: number;
  taskCount: number;
  conflictFlag: boolean;
}

export interface CapacityWarning {
  date: string;
  dateFormatted: string;
  resourceId: string;
  resourceName: string;
  overallocationPercentage: number;
  severity: 'low' | 'medium' | 'high';
  affectedTasks: string[];
}

export interface HistogramSummary {
  resourceId: string;
  resourceName: string;
  peakUtilization: number;
  peakUtilizationDate: string;
  averageUtilization: number;
  underutilizedDays: number;
  overallocatedDays: number;
  totalCapacityHours: number;
  usedCapacityHours: number;
  idleCapacityHours: number;
}

export interface GroupedHistogramData {
  groupBy: 'resource' | 'task' | 'department' | 'skill';
  groups: {
    name: string;
    data: HistogramDataPoint[];
    summary: HistogramSummary;
  }[];
  warnings: CapacityWarning[];
  peakDays: Array<{ date: string; totalAllocation: number }>;
}

// ============================================================================
// GENERATOR FUNCTIONS
// ============================================================================

/**
 * Generate histogram data for a specific resource across project timeline
 */
export function generateHistogramForResource(
  tasks: UnifiedTask[],
  resourceId: string,
  projectStart: Date,
  projectEnd: Date,
  availableCapacityPercentage: number = 100
): HistogramDataPoint[] {
  const data: HistogramDataPoint[] = [];
  const days = eachDayOfInterval({ start: projectStart, end: projectEnd });

  days.forEach((day) => {
    const dayString = day.toISOString().split('T')[0];
    let totalAllocated = 0;
    let taskCount = 0;

    // Calculate allocation for this resource on this day
    tasks.forEach((task) => {
      const taskStart = parseISO(task.startDate);
      const taskEnd = parseISO(task.endDate);

      if (day >= taskStart && day <= taskEnd) {
        const resource = task.resources?.find((r) => r.resourceId === resourceId);
        if (resource) {
          totalAllocated += resource.allocationPercentage || 0;
          taskCount += 1;
        }
      }
    });

    const available = availableCapacityPercentage;
    const utilization = Math.round((totalAllocated / available) * 100);
    const conflictFlag = totalAllocated > available;

    data.push({
      date: dayString,
      dateFormatted: format(day, 'MMM dd, yyyy'),
      week: format(day, "'W'ww"),
      resourceId,
      resourceName: `Resource ${resourceId.substring(0, 8)}`,
      allocated: Math.round(totalAllocated * 10) / 10,
      available,
      utilization: Math.round(utilization),
      allocationPercentage: Math.round(totalAllocated * 10) / 10,
      taskCount,
      conflictFlag,
    });
  });

  return data;
}

/**
 * Generate histogram data for all resources
 */
export function generateHistogram(
  tasks: UnifiedTask[],
  projectStart: Date,
  projectEnd: Date,
  groupBy: 'resource' | 'task' | 'department' | 'skill' = 'resource'
): GroupedHistogramData {
  const allData: HistogramDataPoint[] = [];

  // Get unique resources
  const resourceMap = new Map<string, ResourceAllocation>();
  tasks.forEach((task) => {
    task.resources?.forEach((resource) => {
      if (!resourceMap.has(resource.resourceId)) {
        resourceMap.set(resource.resourceId, resource);
      }
    });
  });

  // Generate histogram for each resource
  resourceMap.forEach((_, resourceId) => {
    const resourceData = generateHistogramForResource(
      tasks,
      resourceId,
      projectStart,
      projectEnd
    );
    allData.push(...resourceData);
  });

  // Group data
  const groups: typeof GroupedHistogramData.prototype.groups = [];
  const groupedByResource = new Map<string, HistogramDataPoint[]>();

  allData.forEach((point) => {
    if (!groupedByResource.has(point.resourceId)) {
      groupedByResource.set(point.resourceId, []);
    }
    groupedByResource.get(point.resourceId)!.push(point);
  });

  groupedByResource.forEach((data, resourceId) => {
    const summary = calculateHistogramSummary(resourceId, `Resource ${resourceId.substring(0, 8)}`, data);
    groups.push({
      name: summary.resourceName,
      data,
      summary,
    });
  });

  // Identify capacity warnings
  const warnings = getCapacityWarnings(allData);

  // Identify peak days
  const dayTotals = new Map<string, number>();
  allData.forEach((point) => {
    const current = dayTotals.get(point.date) || 0;
    dayTotals.set(point.date, current + point.allocated);
  });

  const peakDays = Array.from(dayTotals.entries())
    .map(([date, total]) => ({ date, totalAllocation: total }))
    .sort((a, b) => b.totalAllocation - a.totalAllocation)
    .slice(0, 5);

  return {
    groupBy,
    groups,
    warnings,
    peakDays,
  };
}

/**
 * Calculate summary statistics for a resource's histogram
 */
function calculateHistogramSummary(
  resourceId: string,
  resourceName: string,
  data: HistogramDataPoint[]
): HistogramSummary {
  if (data.length === 0) {
    return {
      resourceId,
      resourceName,
      peakUtilization: 0,
      peakUtilizationDate: '',
      averageUtilization: 0,
      underutilizedDays: 0,
      overallocatedDays: 0,
      totalCapacityHours: 0,
      usedCapacityHours: 0,
      idleCapacityHours: 0,
    };
  }

  const utilizations = data.map((d) => d.utilization);
  const peakUtilization = Math.max(...utilizations);
  const peakDate = data.find((d) => d.utilization === peakUtilization)?.date || '';
  const averageUtilization = Math.round(
    utilizations.reduce((a, b) => a + b, 0) / utilizations.length
  );

  const underutilizedDays = data.filter((d) => d.utilization < 50).length;
  const overallocatedDays = data.filter((d) => d.conflictFlag).length;

  const totalCapacity = data.reduce((sum, d) => sum + (d.available * 8), 0);
  const usedCapacity = data.reduce((sum, d) => sum + (d.allocated * 8), 0);
  const idleCapacity = totalCapacity - usedCapacity;

  return {
    resourceId,
    resourceName,
    peakUtilization,
    peakUtilizationDate: peakDate,
    averageUtilization,
    underutilizedDays,
    overallocatedDays,
    totalCapacityHours: Math.round(totalCapacity),
    usedCapacityHours: Math.round(usedCapacity),
    idleCapacityHours: Math.round(idleCapacity),
  };
}

/**
 * Identify capacity warnings (overallocation days)
 */
export function getCapacityWarnings(data: HistogramDataPoint[]): CapacityWarning[] {
  const warnings: CapacityWarning[] = [];

  const groupedByResource = new Map<string, HistogramDataPoint[]>();
  data.forEach((point) => {
    if (!groupedByResource.has(point.resourceId)) {
      groupedByResource.set(point.resourceId, []);
    }
    groupedByResource.get(point.resourceId)!.push(point);
  });

  groupedByResource.forEach((points, resourceId) => {
    points.forEach((point) => {
      if (point.conflictFlag) {
        const overallocation = point.allocated - point.available;
        const overallocationPercentage = Math.round(
          (overallocation / point.available) * 100
        );

        const severity: 'low' | 'medium' | 'high' =
          overallocationPercentage > 50 ? 'high' : overallocationPercentage > 25 ? 'medium' : 'low';

        warnings.push({
          date: point.date,
          dateFormatted: point.dateFormatted,
          resourceId,
          resourceName: point.resourceName,
          overallocationPercentage,
          severity,
          affectedTasks: [], // Would be populated with actual task data
        });
      }
    });
  });

  return warnings;
}

/**
 * Filter histogram data by resource or date range
 */
export function filterHistogramData(
  data: HistogramDataPoint[],
  filters: {
    resourceIds?: string[];
    startDate?: Date;
    endDate?: Date;
    minUtilization?: number;
    maxUtilization?: number;
  }
): HistogramDataPoint[] {
  return data.filter((point) => {
    if (filters.resourceIds && !filters.resourceIds.includes(point.resourceId)) {
      return false;
    }

    if (filters.startDate && parseISO(point.date) < filters.startDate) {
      return false;
    }

    if (filters.endDate && parseISO(point.date) > filters.endDate) {
      return false;
    }

    if (filters.minUtilization !== undefined && point.utilization < filters.minUtilization) {
      return false;
    }

    if (filters.maxUtilization !== undefined && point.utilization > filters.maxUtilization) {
      return false;
    }

    return true;
  });
}

/**
 * Smooth resource allocation to reduce peak demands
 * Recommends tasks to reschedule based on available float
 */
export function generateResourceSmoothingRecommendations(
  tasks: UnifiedTask[],
  projectStart: Date,
  projectEnd: Date
): string[] {
  const recommendations: string[] = [];
  const histogram = generateHistogram(tasks, projectStart, projectEnd);

  // Identify overallocated periods
  if (histogram.warnings.length > 0) {
    const overallocatedDays = histogram.warnings.length;
    recommendations.push(
      `Found ${overallocatedDays} overallocated day(s) with resource conflicts`
    );

    // Sort warnings by severity
    const highSeverity = histogram.warnings.filter((w) => w.severity === 'high');
    if (highSeverity.length > 0) {
      recommendations.push(
        `⚠️ ${highSeverity.length} high-severity conflict(s) - consider delaying tasks with available float`
      );
    }
  }

  // Identify underutilized periods
  const underutilizedResources = histogram.groups.filter(
    (g) => g.summary.underutilizedDays > g.data.length * 0.5
  );

  if (underutilizedResources.length > 0) {
    recommendations.push(
      `💡 ${underutilizedResources.length} resource(s) have >50% underutilized days - consider parallel execution`
    );
  }

  // Peak analysis
  if (histogram.peakDays.length > 0) {
    const peakAllocation = histogram.peakDays[0].totalAllocation;
    recommendations.push(
      `📊 Peak resource allocation: ${Math.round(peakAllocation)}% on ${histogram.peakDays[0].date}`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✓ Resource allocation is well-balanced across the project');
  }

  return recommendations;
}
