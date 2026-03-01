/**
 * Resource Histogram Visualization Component
 *
 * Displays cumulative resource usage patterns with:
 * - Stacked bar histogram by date
 * - Resource utilization trends
 * - Capacity analysis and warnings
 * - Peak demand identification
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';
import {
  BarChart,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import { Bar } from 'recharts/es6/cartesian/Bar';
import { AlertCircle, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { UnifiedTask } from './types';
import {
  generateHistogram,
  getCapacityWarnings,
  generateResourceSmoothingRecommendations,
  type GroupedHistogramData,
} from './resourceHistogramGenerator';

export interface ResourceHistogramProps {
  tasks: UnifiedTask[];
  projectStartDate: string;
  projectEndDate: string;
  disabled?: boolean;
}

export function ResourceHistogram({
  tasks,
  projectStartDate,
  projectEndDate,
  disabled = false,
}: ResourceHistogramProps) {
  const { t } = useLocalization();
  const [selectedResource, setSelectedResource] = useState<string | null>(null);

  const projectStart = useMemo(() => new Date(projectStartDate), [projectStartDate]);
  const projectEnd = useMemo(() => new Date(projectEndDate), [projectEndDate]);

  // Generate histogram data
  const histogramData = useMemo(() => {
    return generateHistogram(tasks, projectStart, projectEnd, 'resource');
  }, [tasks, projectStart, projectEnd]);

  // Generate recommendations
  const recommendations = useMemo(() => {
    return generateResourceSmoothingRecommendations(tasks, projectStart, projectEnd);
  }, [tasks, projectStart, projectEnd]);

  // Prepare chart data - daily allocation by resource
  const chartData = useMemo(() => {
    if (histogramData.groups.length === 0) return [];

    // Get all dates
    const dateMap = new Map<string, any>();

    histogramData.groups.forEach((group) => {
      group.data.forEach((point) => {
        if (!dateMap.has(point.date)) {
          dateMap.set(point.date, {
            date: point.dateFormatted,
            dateKey: point.date,
          });
        }
        const entry = dateMap.get(point.date);
        entry[group.summary.resourceName] = point.allocated;
      });
    });

    return Array.from(dateMap.values()).slice(0, 30); // Limit to first 30 days for readability
  }, [histogramData]);

  // Prepare summary statistics
  const totalResources = histogramData.groups.length;
  const overallocatedWarnings = histogramData.warnings.filter((w) => w.severity === 'high').length;
  const peakAllocation = histogramData.peakDays[0]?.totalAllocation || 0;

  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#6366f1',
    '#06b6d4',
    '#14b8a6',
  ];

  return (
    <div className="space-y-4 w-full">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalResources}</div>
            <p className="text-xs text-muted-foreground">Resources</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{Math.round(peakAllocation)}%</div>
            <p className="text-xs text-muted-foreground">Peak Allocation</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${overallocatedWarnings > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {histogramData.warnings.length}
            </div>
            <p className="text-xs text-muted-foreground">Conflicts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{histogramData.peakDays.length}</div>
            <p className="text-xs text-muted-foreground">Peak Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Stacked Bar Chart - Resource Allocation by Day */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Resource Allocation</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Cumulative allocation percentage by resource
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis label={{ value: 'Allocation %', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {histogramData.groups.map((group, idx) => (
                <Bar
                  key={group.summary.resourceName}
                  dataKey={group.summary.resourceName}
                  stackId="allocation"
                  fill={colors[idx % colors.length]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Resource Utilization Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resource Utilization Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-semibold py-2 px-3">Resource</th>
                  <th className="text-center font-semibold py-2 px-3">Avg Util.</th>
                  <th className="text-center font-semibold py-2 px-3">Peak Util.</th>
                  <th className="text-center font-semibold py-2 px-3">Overallocated</th>
                  <th className="text-center font-semibold py-2 px-3">Underutilized</th>
                  <th className="text-center font-semibold py-2 px-3">Used / Total</th>
                </tr>
              </thead>
              <tbody>
                {histogramData.groups.map((group, idx) => {
                  const { summary } = group;
                  const utilPercentage = Math.round(
                    (summary.usedCapacityHours / summary.totalCapacityHours) * 100
                  );

                  return (
                    <tr
                      key={summary.resourceId}
                      className={`border-b cursor-pointer hover:bg-gray-50 ${
                        selectedResource === summary.resourceId ? 'bg-blue-50' : ''
                      }`}
                      onClick={() =>
                        setSelectedResource(
                          selectedResource === summary.resourceId ? null : summary.resourceId
                        )
                      }
                    >
                      <td className="py-3 px-3 font-medium">{summary.resourceName}</td>
                      <td className="text-center py-3 px-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                            {summary.averageUtilization}%
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-3">
                        <Badge
                          variant={
                            summary.peakUtilization > 100 ? 'destructive' : 'default'
                          }
                        >
                          {summary.peakUtilization}%
                        </Badge>
                      </td>
                      <td className="text-center py-3 px-3">
                        {summary.overallocatedDays > 0 ? (
                          <span className="text-red-600 font-semibold">
                            {summary.overallocatedDays}d
                          </span>
                        ) : (
                          <span className="text-green-600">✓</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-3">
                        {summary.underutilizedDays > 0 ? (
                          <span className="text-orange-600">{summary.underutilizedDays}d</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-3 text-xs">
                        <span className="font-mono">
                          {summary.usedCapacityHours}h / {summary.totalCapacityHours}h
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Capacity Warnings */}
      {histogramData.warnings.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-base text-orange-900">Capacity Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {histogramData.warnings.slice(0, 10).map((warning, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-2 rounded text-xs ${
                    warning.severity === 'high'
                      ? 'bg-red-100 text-red-800'
                      : warning.severity === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  <div className="mt-0.5">
                    {warning.severity === 'high' ? (
                      <AlertTriangle className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {warning.resourceName} - {warning.dateFormatted}
                    </p>
                    <p>
                      Overallocation: +{warning.overallocationPercentage}% above capacity
                    </p>
                  </div>
                </div>
              ))}
              {histogramData.warnings.length > 10 && (
                <p className="text-xs text-orange-700 font-medium">
                  +{histogramData.warnings.length - 10} more warnings...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Peak Days Analysis */}
      {histogramData.peakDays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Peak Demand Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {histogramData.peakDays.map((peak, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium text-sm">{peak.date}</p>
                    <p className="text-xs text-muted-foreground">Peak Day #{idx + 1}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-blue-600">
                      {Math.round(peak.totalAllocation)}%
                    </p>
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{
                          width: `${Math.min(peak.totalAllocation, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base text-blue-900">Resource Smoothing Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-blue-800">
                <div className="mt-0.5">
                  {rec.includes('✓') ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : rec.includes('⚠️') ? (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
