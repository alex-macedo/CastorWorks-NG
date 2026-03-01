/**
 * Compression Analyzer Component
 *
 * Visualizes schedule compression options and cost-duration trade-offs
 * Allows users to select compression levels and apply strategies
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
} from 'recharts';
import { Bar } from 'recharts/es6/cartesian/Bar';
import { AlertCircle, TrendingDown, CheckCircle2, Zap } from 'lucide-react';
import type { UnifiedTask } from './types';
import {
  analyzeCompression,
  applyCompression,
  getCompressionForTargetDuration,
  type CompressionResult,
} from './scheduleCompressionAlgorithm';

export interface CompressionAnalyzerProps {
  tasks: UnifiedTask[];
  projectStartDate: string;
  projectEndDate: string;
  onCompressionApply?: (adjustedTasks: UnifiedTask[], level: 'light' | 'moderate' | 'aggressive') => void;
  disabled?: boolean;
}

export function CompressionAnalyzer({
  tasks,
  projectStartDate,
  projectEndDate,
  onCompressionApply,
  disabled = false,
}: CompressionAnalyzerProps) {
  const { t } = useLocalization();
  const [compressionLevel, setCompressionLevel] = useState<'light' | 'moderate' | 'aggressive'>('moderate');
  const [selectedParetoDuration, setSelectedParetoDuration] = useState<number | null>(null);

  // Analyze compression options
  const compression = useMemo(() => {
    return analyzeCompression(tasks);
  }, [tasks]);

  // Prepare Pareto frontier chart data
  const paretoChartData = useMemo(() => {
    return compression.paretoPoints.map((point) => ({
      duration: point.duration,
      cost: point.cost,
      costDisplay: `$${point.cost.toLocaleString()}`,
      durationDisplay: `${point.duration}d`,
    }));
  }, [compression]);

  // Prepare compression options by method
  const fastTrackOptions = useMemo(() => {
    return compression.options
      .filter((o) => o.method === 'fast-track')
      .sort((a, b) => b.daysReduced - a.daysReduced)
      .slice(0, 5);
  }, [compression]);

  const crashOptions = useMemo(() => {
    return compression.options
      .filter((o) => o.method === 'crash')
      .sort((a, b) => a.costPerDayReduced - b.costPerDayReduced)
      .slice(0, 5);
  }, [compression]);

  // Prepare comparison chart data
  const comparisonData = useMemo(() => {
    return [
      {
        level: 'Baseline',
        duration: compression.originalDuration,
        cost: compression.originalCost,
      },
      {
        level: 'Light',
        duration: compression.compressedDuration * 0.9,
        cost: compression.originalCost + compression.totalCostIncrease * 0.2,
      },
      {
        level: 'Moderate',
        duration: compression.compressedDuration * 0.7,
        cost: compression.originalCost + compression.totalCostIncrease * 0.6,
      },
      {
        level: 'Aggressive',
        duration: compression.compressedDuration,
        cost: compression.originalCost + compression.totalCostIncrease,
      },
    ];
  }, [compression]);

  const handleApplyCompression = (level: 'light' | 'moderate' | 'aggressive') => {
    const adjustedTasks = applyCompression(tasks, level);
    onCompressionApply?.(adjustedTasks, level);
    setCompressionLevel(level);
  };

  const compressionPercentage = compression.compressionPercentage;
  const hasSignificantCompression = compressionPercentage >= 10;

  return (
    <div className="space-y-4 w-full">
      {/* Header Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compression Analysis Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Original Duration</p>
              <p className="text-2xl font-bold">{compression.originalDuration}d</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Min Duration</p>
              <p className="text-2xl font-bold text-blue-600">{compression.compressedDuration}d</p>
              <p className="text-xs text-blue-600">
                {compression.totalDaysReduced}d reduction
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Original Cost</p>
              <p className="text-2xl font-bold">${compression.originalCost.toLocaleString()}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Max Cost</p>
              <p className="text-2xl font-bold text-red-600">
                ${compression.compressedCost.toLocaleString()}
              </p>
              <p className="text-xs text-red-600">
                +${compression.totalCostIncrease.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Compression Metrics */}
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">Compression Potential</span>
              <Badge
                className={hasSignificantCompression ? 'bg-green-600' : 'bg-orange-600'}
              >
                {compressionPercentage.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-sm text-blue-800">
              Cost per day reduced: <span className="font-semibold">${compression.costPerDayReduced}/day</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pareto Frontier Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost-Duration Trade-off (Pareto Frontier)</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Optimal compression strategies showing cost vs. schedule reduction
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="duration"
                name="Duration (days)"
                label={{ value: 'Duration (days)', position: 'insideBottomRight', offset: -10 }}
              />
              <YAxis
                type="number"
                dataKey="cost"
                name="Cost ($)"
                label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                formatter={(value) => {
                  if (typeof value === 'number') {
                    return value > 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${value}`;
                  }
                  return value;
                }}
              />
              <Scatter
                name="Compression Options"
                data={paretoChartData}
                fill="#3b82f6"
                isAnimationActive={false}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Compression Level Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compression Levels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="level" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="duration"
                fill="#3b82f6"
                name="Duration (days)"
              />
              <Bar
                yAxisId="right"
                dataKey="cost"
                fill="#ef4444"
                name="Cost ($)"
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Level Selection Buttons */}
          <div className="grid grid-cols-3 gap-2">
            {['light', 'moderate', 'aggressive'].map((level) => (
              <Button
                key={level}
                onClick={() => handleApplyCompression(level as 'light' | 'moderate' | 'aggressive')}
                disabled={disabled}
                variant={compressionLevel === level ? 'default' : 'outline'}
                className="capitalize"
              >
                {level}
              </Button>
            ))}
          </div>

          {/* Level Descriptions */}
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div>
              <p className="font-medium mb-1">Light</p>
              <p>Fast-track low-risk tasks only. Minimal cost increase.</p>
            </div>
            <div>
              <p className="font-medium mb-1">Moderate</p>
              <p>Mix of fast-tracking and low-risk crashing. Balanced approach.</p>
            </div>
            <div>
              <p className="font-medium mb-1">Aggressive</p>
              <p>Maximize compression. Apply all strategies regardless of cost.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fast-Track Options */}
      {fastTrackOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Fast-Tracking Options
              <Badge className="ml-2 bg-green-100 text-green-800">No Cost</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fastTrackOptions.map((option, idx) => (
                <div key={idx} className="p-3 border rounded-lg bg-green-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{option.taskName}</p>
                      <p className="text-xs text-muted-foreground">{option.reason}</p>
                    </div>
                    <Badge className="bg-green-600">
                      -{option.daysReduced}d
                    </Badge>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="text-green-700 font-medium">
                      Risk: {option.riskLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crashing Options */}
      {crashOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Top Crashing Options
              <Badge className="ml-2 bg-orange-100 text-orange-800">Adds Cost</Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Sorted by cost per day reduced (most efficient first)
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {crashOptions.map((option, idx) => (
                <div key={idx} className="p-3 border rounded-lg bg-orange-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{option.taskName}</p>
                      <p className="text-xs text-muted-foreground">{option.reason}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-orange-600">
                        -{option.maxDaysReducible}d
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-orange-700">
                    <span>Cost: ${option.costIncrease.toLocaleString()}</span>
                    <span className="font-medium">
                      ${Math.round(option.costPerDayReduced)}/day
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {compression.recommendations.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base text-blue-900">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {compression.recommendations.map((rec, idx) => (
                <li
                  key={idx}
                  className="flex gap-2 text-sm text-blue-800"
                >
                  <div className="mt-0.5">
                    {rec.includes('✓') ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : rec.includes('⚡') ? (
                      <Zap className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
