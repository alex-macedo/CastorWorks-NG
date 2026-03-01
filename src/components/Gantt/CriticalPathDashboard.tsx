/**
 * Critical Path Dashboard - CPM Analytics & Visualization
 *
 * Displays Critical Path Method analysis including:
 * - Critical path tasks and chain
 * - Schedule metrics (early/late dates, float, slack)
 * - Task criticality indicators
 * - Schedule risk assessment
 * - Bottleneck identification
 */

import React, { useMemo } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  BarChart3,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { UnifiedTask } from './types';
import { cn } from '@/lib/utils';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface CriticalPathDashboardProps {
  /** Tasks to analyze */
  tasks: UnifiedTask[];

  /** Project start date */
  projectStartDate: Date;

  /** Project end date (calculated from tasks) */
  projectEndDate: Date;

  /** Show detailed metrics */
  showDetails?: boolean;

  /** Custom className */
  className?: string;
}

// ============================================================================
// TYPES
// ============================================================================

interface CriticalPathStats {
  criticalPathLength: number;
  criticalTaskCount: number;
  projectDuration: number;
  criticalTasks: UnifiedTask[];
  totalSlack: number;
  riskScore: number; // 0-100
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CriticalPathDashboard({
  tasks,
  projectStartDate,
  projectEndDate,
  showDetails = true,
  className,
}: CriticalPathDashboardProps) {
  // ========================================================================
  // DERIVED DATA
  // ========================================================================

  /**
   * Calculate CPM statistics
   */
  const stats = useMemo(() => {
    const criticalTasks = tasks.filter((t) => t.isCritical);
    const projectDuration = differenceInDays(projectEndDate, projectStartDate);

    // Calculate critical path length (longest sequence of critical tasks)
    let criticalPathLength = 0;
    let currentChainLength = 0;

    const sortedTasks = [...tasks].sort((a, b) =>
      parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
    );

    sortedTasks.forEach((task) => {
      if (task.isCritical) {
        currentChainLength += differenceInDays(
          parseISO(task.endDate),
          parseISO(task.startDate)
        );
      } else {
        criticalPathLength = Math.max(criticalPathLength, currentChainLength);
        currentChainLength = 0;
      }
    });

    criticalPathLength = Math.max(criticalPathLength, currentChainLength);

    // Calculate total slack (sum of float days for all tasks)
    const totalSlack = tasks.reduce((sum, task) => sum + (task.floatDays || 0), 0);

    // Risk score: percentage of project on critical path
    // Higher = more risk (less flexibility)
    const riskScore = criticalTasks.length > 0
      ? Math.round((criticalTasks.length / tasks.length) * 100)
      : 0;

    return {
      criticalPathLength,
      criticalTaskCount: criticalTasks.length,
      projectDuration,
      criticalTasks,
      totalSlack,
      riskScore,
    };
  }, [tasks, projectStartDate, projectEndDate]);

  /**
   * Get risk level based on risk score
   */
  const getRiskLevel = (score: number): { level: string; color: string; icon: React.ReactNode } => {
    if (score >= 70) {
      return {
        level: 'Critical',
        color: 'text-red-600 bg-red-50',
        icon: <AlertCircle className="h-4 w-4" />
      };
    }
    if (score >= 50) {
      return {
        level: 'High',
        color: 'text-orange-600 bg-orange-50',
        icon: <TrendingDown className="h-4 w-4" />
      };
    }
    return {
      level: 'Low',
      color: 'text-green-600 bg-green-50',
      icon: <CheckCircle2 className="h-4 w-4" />
    };
  };

  const riskLevel = getRiskLevel(stats.riskScore);

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Project Duration */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Project Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projectDuration}d</div>
            <p className="text-xs text-gray-500 mt-1">
              {format(projectStartDate, 'MMM d')} → {format(projectEndDate, 'MMM d')}
            </p>
          </CardContent>
        </Card>

        {/* Critical Path Length */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Critical Path
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalPathLength}d</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.criticalTaskCount} task{stats.criticalTaskCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Total Slack */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Slack
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalSlack}d</div>
            <p className="text-xs text-gray-500 mt-1">
              Flexibility available
            </p>
          </CardContent>
        </Card>

        {/* Risk Score */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Schedule Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', riskLevel.color)}>
              {stats.riskScore}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {riskLevel.level} risk
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Alert */}
      {stats.riskScore >= 70 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            High schedule risk detected. {stats.criticalTaskCount} critical tasks ({stats.riskScore}% of project) have zero float.
            Any delay will impact project completion.
          </AlertDescription>
        </Alert>
      )}

      {/* Critical Tasks Table */}
      {showDetails && stats.criticalTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Critical Path Tasks
            </CardTitle>
            <CardDescription>
              Tasks with zero float that determine project completion date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Task Name</TableHeader>
                  <TableHeader>Start Date</TableHeader>
                  <TableHeader>End Date</TableHeader>
                  <TableHeader>Duration</TableHeader>
                  <TableHeader>Float</TableHeader>
                  <TableHeader className="text-right">Completion</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.criticalTasks
                  .sort((a, b) =>
                    parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()
                  )
                  .map((task) => {
                    const duration = differenceInDays(
                      parseISO(task.endDate),
                      parseISO(task.startDate)
                    );

                    return (
                      <TableRow key={task.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-600" />
                            {task.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(parseISO(task.startDate), 'MMM d')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(parseISO(task.endDate), 'MMM d')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {duration}d
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-red-600">
                            {task.floatDays || 0}d
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-red-600 h-2 rounded-full"
                                style={{ width: `${task.completionPercentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-10">
                              {task.completionPercentage}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Non-Critical Tasks Summary */}
      {showDetails && stats.criticalTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Schedule Flexibility</CardTitle>
            <CardDescription>
              Non-critical tasks with scheduling flexibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Non-critical tasks:</span>
                <span className="font-medium">{tasks.length - stats.criticalTaskCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Average float per task:</span>
                <span className="font-medium">
                  {Math.round(
                    stats.totalSlack /
                      Math.max(1, tasks.length - stats.criticalTaskCount)
                  )}
                  d
                </span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span>Total project buffer:</span>
                <span className="font-medium text-blue-600">{stats.totalSlack}d</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Critical Path */}
      {stats.criticalTasks.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No critical tasks found. This may indicate tasks with high float or incomplete dependency relationships.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default CriticalPathDashboard;
