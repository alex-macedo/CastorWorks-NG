/**
 * Resource Leveling Visualization - Resource Allocation & Conflict Detection
 *
 * Visualizes resource allocation across the project timeline:
 * - Resource utilization heatmap
 * - Allocation conflicts (overallocation)
 * - Resource smoothing recommendations
 * - Leveling alternatives
 * - Resource profiles and capacity
 */

import React, { useMemo, useState, useCallback } from 'react';
import { format, parseISO, differenceInDays, eachDayOfInterval } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  TrendingUp,
  Users,
  Zap,
  Activity,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import type { UnifiedTask, ResourceAllocation } from './types';
import { cn } from '@/lib/utils';
import {
  applyResourceLeveling,
  getLevelingRecommendations,
  type LevelingResult,
  type LevelingAdjustment,
} from './resourceLevelingAlgorithm';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface ResourceLevelingVisualizationProps {
  /** Tasks with resource allocations */
  tasks: UnifiedTask[];

  /** Project start date */
  projectStartDate: Date;

  /** Project end date */
  projectEndDate: Date;

  /** Callback when leveling is applied */
  onLevelingApplied?: (adjustments: { taskId: string; newStartDate: string }[]) => void;

  /** Custom className */
  className?: string;
}

// ============================================================================
// TYPES
// ============================================================================

interface DailyResourceLoad {
  date: Date;
  resourceAllocations: Map<string, number>; // resourceId -> percentage
  totalLoad: number;
  isConflict: boolean;
}

interface ResourceProfile {
  resourceId: string;
  resourceName: string;
  totalCapacity: number;
  peakLoad: number;
  avgLoad: number;
  conflictDays: number;
  conflictPercentage: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ResourceLevelingVisualization({
  tasks,
  projectStartDate,
  projectEndDate,
  onLevelingApplied,
  className,
}: ResourceLevelingVisualizationProps) {
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [levelingResult, setLevelingResult] = useState<LevelingResult | null>(null);
  const [showAdjustments, setShowAdjustments] = useState(false);

  // ========================================================================
  // DERIVED DATA
  // ========================================================================

  /**
   * Calculate daily resource loads
   */
  const dailyLoads = useMemo(() => {
    const days = eachDayOfInterval({ start: projectStartDate, end: projectEndDate });
    const loads: DailyResourceLoad[] = [];

    days.forEach((day) => {
      const dayString = format(day, 'yyyy-MM-dd');
      const resourceMap = new Map<string, number>();
      let totalLoad = 0;

      // Calculate resource allocation for this day
      tasks.forEach((task) => {
        const taskStart = parseISO(task.startDate);
        const taskEnd = parseISO(task.endDate);

        if (day >= taskStart && day <= taskEnd && task.resources) {
          task.resources.forEach((resource) => {
            const current = resourceMap.get(resource.resourceId) || 0;
            const allocation = resource.allocationPercentage || 0;
            resourceMap.set(resource.resourceId, current + allocation);
            totalLoad += allocation;
          });
        }
      });

      // Check for conflicts (>100% allocation)
      const isConflict = totalLoad > 100;

      loads.push({
        date: day,
        resourceAllocations: resourceMap,
        totalLoad,
        isConflict,
      });
    });

    return loads;
  }, [tasks, projectStartDate, projectEndDate]);

  /**
   * Calculate resource profiles
   */
  const resourceProfiles = useMemo(() => {
    const profiles = new Map<string, ResourceProfile>();

    // Collect all resources
    const resourceIds = new Set<string>();
    tasks.forEach((task) => {
      task.resources?.forEach((r) => resourceIds.add(r.resourceId));
    });

    // Calculate metrics for each resource
    resourceIds.forEach((resourceId) => {
      let peakLoad = 0;
      let totalLoad = 0;
      let conflictDays = 0;

      dailyLoads.forEach((load) => {
        const allocation = load.resourceAllocations.get(resourceId) || 0;
        if (allocation > 0) {
          peakLoad = Math.max(peakLoad, allocation);
          totalLoad += allocation;
          if (allocation > 100) {
            conflictDays++;
          }
        }
      });

      const avgLoad = dailyLoads.length > 0 ? totalLoad / dailyLoads.length : 0;
      const conflictPercentage = dailyLoads.length > 0
        ? (conflictDays / dailyLoads.length) * 100
        : 0;

      // Get resource name from tasks
      let resourceName = resourceId;
      for (const task of tasks) {
        const resource = task.resources?.find((r) => r.resourceId === resourceId);
        if (resource) {
          resourceName = resource.resourceName || resourceId;
          break;
        }
      }

      profiles.set(resourceId, {
        resourceId,
        resourceName,
        totalCapacity: 100,
        peakLoad,
        avgLoad,
        conflictDays,
        conflictPercentage,
      });
    });

    return Array.from(profiles.values()).sort((a, b) => b.peakLoad - a.peakLoad);
  }, [dailyLoads, tasks]);

  /**
   * Get all resource IDs
   */
  const allResourceIds = useMemo(
    () => resourceProfiles.map((p) => p.resourceId),
    [resourceProfiles]
  );

  /**
   * Filter loads based on selected resource
   */
  const filteredLoads = useMemo(() => {
    if (selectedResource === 'all') {
      return dailyLoads.map((load) => ({
        ...load,
        displayLoad: load.totalLoad,
      }));
    }

    return dailyLoads.map((load) => ({
      ...load,
      displayLoad: load.resourceAllocations.get(selectedResource) || 0,
    }));
  }, [dailyLoads, selectedResource]);

  /**
   * Count conflicts
   */
  const conflictStats = useMemo(() => {
    let totalConflictDays = 0;
    let maxLoad = 0;

    dailyLoads.forEach((load) => {
      if (load.isConflict) totalConflictDays++;
      maxLoad = Math.max(maxLoad, load.totalLoad);
    });

    return {
      totalConflictDays,
      conflictPercentage: (totalConflictDays / dailyLoads.length) * 100,
      maxLoad,
    };
  }, [dailyLoads]);

  /**
   * Compute resource leveling adjustments
   */
  const handleComputeLeveling = useCallback(() => {
    const result = applyResourceLeveling(tasks, projectStartDate, projectEndDate);
    setLevelingResult(result);
    setShowAdjustments(true);
  }, [tasks, projectStartDate, projectEndDate]);

  /**
   * Get leveling recommendations
   */
  const levelingRecommendations = useMemo(() => {
    return getLevelingRecommendations(tasks, projectStartDate, projectEndDate);
  }, [tasks, projectStartDate, projectEndDate]);

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================

  const getHeatmapColor = (load: number): string => {
    if (load <= 50) return 'bg-green-100 text-green-900';
    if (load <= 75) return 'bg-yellow-100 text-yellow-900';
    if (load <= 100) return 'bg-orange-100 text-orange-900';
    return 'bg-red-100 text-red-900';
  };

  const getLoadStatus = (load: number): { label: string; variant: string } => {
    if (load <= 50) return { label: 'Light', variant: 'bg-green-500' };
    if (load <= 75) return { label: 'Moderate', variant: 'bg-yellow-500' };
    if (load <= 100) return { label: 'Heavy', variant: 'bg-orange-500' };
    return { label: 'Overallocated', variant: 'bg-red-500' };
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className={cn('space-y-4', className)}>
      {/* Resource Selection */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">View Resource:</label>
        <Select value={selectedResource} onValueChange={setSelectedResource}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Resources (Total Load)</SelectItem>
            {resourceProfiles.map((profile) => (
              <SelectItem key={profile.resourceId} value={profile.resourceId}>
                {profile.resourceName} (Peak: {Math.round(profile.peakLoad)}%)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conflict Alert */}
      {conflictStats.totalConflictDays > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {conflictStats.totalConflictDays} days ({Math.round(conflictStats.conflictPercentage)}%)
            have resource overallocation. Consider resource leveling.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Peak Load */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Peak Load
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                selectedResource === 'all'
                  ? conflictStats.maxLoad
                  : (resourceProfiles.find((p) => p.resourceId === selectedResource)?.peakLoad || 0)
              )}
              %
            </div>
          </CardContent>
        </Card>

        {/* Average Load */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Avg Load
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                selectedResource === 'all'
                  ? dailyLoads.reduce((sum, load) => sum + load.totalLoad, 0) / dailyLoads.length
                  : (resourceProfiles.find((p) => p.resourceId === selectedResource)?.avgLoad || 0)
              )}
              %
            </div>
          </CardContent>
        </Card>

        {/* Conflict Days */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-2xl font-bold',
              conflictStats.totalConflictDays > 0 ? 'text-red-600' : 'text-green-600'
            )}>
              {conflictStats.totalConflictDays}d
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(conflictStats.conflictPercentage)}% of project
            </p>
          </CardContent>
        </Card>

        {/* Resource Count */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allResourceIds.length}</div>
            <p className="text-xs text-gray-500 mt-1">Assigned to tasks</p>
          </CardContent>
        </Card>
      </div>

      {/* Resource Profiles Table */}
      {resourceProfiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resource Profiles</CardTitle>
            <CardDescription>
              Peak and average utilization per resource
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resourceProfiles.map((profile) => {
                const status = getLoadStatus(profile.peakLoad);

                return (
                  <div key={profile.resourceId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{profile.resourceName}</p>
                        <p className="text-xs text-gray-500">
                          Peak: {Math.round(profile.peakLoad)}% | Avg: {Math.round(profile.avgLoad)}%
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          'text-white',
                          status.variant
                        )}
                      >
                        {status.label}
                      </Badge>
                    </div>

                    {/* Visual Bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            profile.peakLoad <= 50
                              ? 'bg-green-500'
                              : profile.peakLoad <= 75
                                ? 'bg-yellow-500'
                                : profile.peakLoad <= 100
                                  ? 'bg-orange-500'
                                  : 'bg-red-500'
                          )}
                          style={{ width: `${Math.min(profile.peakLoad, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-12 text-right">
                        {Math.round(profile.peakLoad)}%
                      </span>
                    </div>

                    {/* Conflict Info */}
                    {profile.conflictDays > 0 && (
                      <p className="text-xs text-red-600">
                        Overallocated on {profile.conflictDays} day(s)
                        ({Math.round(profile.conflictPercentage)}% of project)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resource Load Timeline</CardTitle>
          <CardDescription>
            {selectedResource === 'all'
              ? 'Total project resource utilization by day'
              : `${resourceProfiles.find((p) => p.resourceId === selectedResource)?.resourceName} allocation by day`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="flex gap-1 min-w-full pb-4">
              {filteredLoads.map((load, index) => {
                const load_value = load.displayLoad;
                const isConflict = load_value > 100;

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-1 flex-shrink-0"
                  >
                    <div
                      className={cn(
                        'w-6 h-12 rounded transition-colors',
                        getHeatmapColor(load_value),
                        isConflict && 'ring-2 ring-red-600'
                      )}
                      title={`${format(load.date, 'MMM d')}: ${Math.round(load_value)}%`}
                    />
                    {index % 7 === 0 && (
                      <span className="text-xs text-gray-500">
                        {format(load.date, 'MMM')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100" />
              <span>≤50%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100" />
              <span>51-75%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-100" />
              <span>76-100%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 ring-2 ring-red-600" />
              <span>&gt;100% (Conflict)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leveling Recommendations & Results */}
      {conflictStats.totalConflictDays > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resource Leveling</CardTitle>
            <CardDescription>
              Automated conflict resolution with computational analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recommendations */}
            <div className="space-y-2 text-sm bg-blue-50 p-3 rounded border border-blue-200">
              <p className="font-medium text-blue-900">Algorithm Recommendations:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                {levelingRecommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>

            {/* Leveling Results */}
            {levelingResult && showAdjustments && (
              <div className="space-y-3">
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-sm font-medium text-green-900">
                    Leveling Results:
                  </p>
                  <div className="text-sm text-green-800 mt-2 space-y-1">
                    <p>✓ Adjustments: {levelingResult.adjustments.length}</p>
                    <p>✓ Conflicts Resolved: {levelingResult.conflictsResolved}</p>
                    <p>✓ Remaining Conflicts: {levelingResult.remainingConflicts}</p>
                    <p>
                      ✓ Schedule Impact: {levelingResult.scheduleImpact} day(s)
                      {levelingResult.criticalPathImpact && (
                        <span className="text-orange-600 ml-2">(affects critical path)</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Adjustments Details */}
                {levelingResult.adjustments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Task Adjustments:</p>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {levelingResult.adjustments.map((adj, idx) => (
                        <div
                          key={idx}
                          className="text-xs bg-gray-50 p-2 rounded border border-gray-200"
                        >
                          <p className="font-medium">
                            Task {adj.taskId}:{' '}
                            <span className="text-blue-600 font-semibold capitalize">
                              {adj.strategy}
                            </span>
                          </p>
                          <p className="text-gray-600 mt-1">{adj.reason}</p>
                          {adj.daysDelayed > 0 && (
                            <p className="text-orange-600 mt-1">
                              Delayed: {adj.daysDelayed} day(s)
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleComputeLeveling}
                className="flex-1"
              >
                {levelingResult ? 'Recompute' : 'Compute'} Leveling
              </Button>

              {levelingResult && onLevelingApplied && (
                <Button
                  onClick={() => onLevelingApplied(
                    levelingResult.adjustments.map(adj => ({
                      taskId: adj.taskId,
                      newStartDate: adj.newStartDate,
                    }))
                  )}
                  className="flex-1"
                >
                  Apply Adjustments
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ResourceLevelingVisualization;
