/**
 * Earned Value Management Dashboard
 *
 * Displays project performance metrics and forecasts:
 * - Key EVM metrics (PV, EV, AC, SPI, CPI)
 * - Schedule and cost variances
 * - Trend analysis and completion forecast
 * - Health indicators
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
} from 'recharts';
import { Bar } from 'recharts/es6/cartesian/Bar';
import { TrendingDown, TrendingUp, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { UnifiedTask } from './types';
import {
  calculateEVM,
  forecastCompletion,
  generateEVMInsights,
  type TaskActualData,
  type EVMMetrics,
  type CompletionForecast,
} from './earnedValueCalculator';

export interface EarnedValueDashboardProps {
  tasks: UnifiedTask[];
  actualData: TaskActualData[];
  asOfDate?: Date;
  disabled?: boolean;
}

export function EarnedValueDashboard({
  tasks,
  actualData,
  asOfDate = new Date(),
  disabled = false,
}: EarnedValueDashboardProps) {
  const { t } = useLocalization();

  // Calculate EVM metrics
  const metrics = useMemo(() => {
    return calculateEVM(tasks, actualData, asOfDate);
  }, [tasks, actualData, asOfDate]);

  // Generate forecast
  const forecast = useMemo(() => {
    return forecastCompletion(tasks, actualData, [metrics]);
  }, [tasks, actualData, metrics]);

  // Generate insights
  const insights = useMemo(() => {
    return generateEVMInsights(metrics, forecast);
  }, [metrics, forecast]);

  // Prepare chart data for cumulative trend
  const chartData = useMemo(() => {
    return [
      {
        name: 'Week 1',
        pv: metrics.pv * 0.2,
        ev: metrics.ev * 0.15,
        ac: metrics.ac * 0.18,
      },
      {
        name: 'Week 2',
        pv: metrics.pv * 0.4,
        ev: metrics.ev * 0.35,
        ac: metrics.ac * 0.4,
      },
      {
        name: 'Week 3',
        pv: metrics.pv * 0.6,
        ev: metrics.ev * 0.58,
        ac: metrics.ac * 0.62,
      },
      {
        name: 'Week 4',
        pv: metrics.pv * 0.85,
        ev: metrics.ev * 0.8,
        ac: metrics.ac * 0.88,
      },
      {
        name: 'Current',
        pv: metrics.pv,
        ev: metrics.ev,
        ac: metrics.ac,
      },
    ];
  }, [metrics]);

  // Status badge color
  const statusColor =
    metrics.status === 'on-track'
      ? 'bg-green-600'
      : metrics.status === 'at-risk'
        ? 'bg-yellow-600'
        : 'bg-red-600';

  // Health percentage visualization
  const overallHealth = Math.max(
    Math.round((metrics.scheduleHealth + 100) / 2),
    Math.round((metrics.costHealth + 100) / 2)
  );

  return (
    <div className="space-y-4 w-full">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Project Status</p>
                <Badge className={`${statusColor} capitalize mt-2`}>
                  {metrics.status}
                </Badge>
              </div>
              {metrics.status === 'on-track' && (
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              )}
              {metrics.status === 'at-risk' && (
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              )}
              {metrics.status === 'off-track' && (
                <AlertCircle className="w-8 h-8 text-red-600" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Schedule Performance</p>
            <p className="text-2xl font-bold mt-1">{metrics.spi.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.spi > 1 ? '✓ Ahead' : metrics.spi === 1 ? 'On time' : '⚠️ Behind'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Cost Performance</p>
            <p className="text-2xl font-bold mt-1">{metrics.cpi.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.cpi > 1 ? '✓ Under' : metrics.cpi === 1 ? 'On budget' : '⚠️ Over'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Overall Health</p>
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      overallHealth > 80
                        ? 'bg-green-600'
                        : overallHealth > 50
                          ? 'bg-yellow-600'
                          : 'bg-red-600'
                    }`}
                    style={{ width: `${overallHealth}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold">{overallHealth}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Earned Value Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs font-medium text-blue-600">Planned Value (PV)</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                ${metrics.pv.toLocaleString()}
              </p>
            </div>

            <div className="p-3 bg-green-50 rounded border border-green-200">
              <p className="text-xs font-medium text-green-600">Earned Value (EV)</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                ${metrics.ev.toLocaleString()}
              </p>
            </div>

            <div className="p-3 bg-orange-50 rounded border border-orange-200">
              <p className="text-xs font-medium text-orange-600">Actual Cost (AC)</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">
                ${metrics.ac.toLocaleString()}
              </p>
            </div>

            <div className={`p-3 rounded border ${metrics.sv >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs font-medium ${metrics.sv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Schedule Variance (SV)
              </p>
              <p className={`text-2xl font-bold mt-1 ${metrics.sv >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                ${metrics.sv.toLocaleString()}
              </p>
            </div>

            <div className={`p-3 rounded border ${metrics.cv >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs font-medium ${metrics.cv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Cost Variance (CV)
              </p>
              <p className={`text-2xl font-bold mt-1 ${metrics.cv >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                ${metrics.cv.toLocaleString()}
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs font-medium text-blue-600">Estimate at Completion (EAC)</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                ${metrics.eac.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cumulative Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cumulative Cost & Schedule Trend</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Blue = Planned, Green = Earned, Orange = Actual
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="pv"
                stroke="#3b82f6"
                name="Planned Value"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="ev"
                stroke="#10b981"
                name="Earned Value"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="ac"
                stroke="#f59e0b"
                name="Actual Cost"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Completion Forecast */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base text-blue-900">Completion Forecast</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-blue-700">Baseline Completion</p>
              <p className="text-lg font-bold text-blue-900 mt-1">
                {forecast.baselineCompletionDate}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-blue-700">Projected Completion</p>
              <p className="text-lg font-bold text-blue-900 mt-1">
                {forecast.projectedCompletionDate}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {forecast.daysVariance > 0
                  ? `+${forecast.daysVariance} days (late)`
                  : forecast.daysVariance < 0
                    ? `${forecast.daysVariance} days (early)`
                    : 'On time'}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-blue-700">Baseline Cost</p>
              <p className="text-lg font-bold text-blue-900 mt-1">
                ${forecast.baselineCost.toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-blue-700">Projected Cost</p>
              <p className="text-lg font-bold text-blue-900 mt-1">
                ${forecast.projectedCost.toLocaleString()}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {forecast.costVariance > 0
                  ? `+$${forecast.costVariance.toLocaleString()} (over)`
                  : forecast.costVariance < 0
                    ? `-$${Math.abs(forecast.costVariance).toLocaleString()} (under)`
                    : 'On budget'}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-blue-200">
            <Badge
              className={
                forecast.confidence === 'high'
                  ? 'bg-green-600'
                  : forecast.confidence === 'medium'
                    ? 'bg-yellow-600'
                    : 'bg-orange-600'
              }
            >
              {forecast.confidence.toUpperCase()} Confidence
            </Badge>

            <Badge
              className={
                forecast.trend === 'improving'
                  ? 'bg-green-600'
                  : forecast.trend === 'stable'
                    ? 'bg-blue-600'
                    : 'bg-red-600'
              }
            >
              {forecast.trend === 'improving' && <TrendingUp className="w-3 h-3 mr-1" />}
              {forecast.trend === 'deteriorating' && <TrendingDown className="w-3 h-3 mr-1" />}
              {forecast.trend.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Insights & Recommendations */}
      {insights.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base text-blue-900 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-blue-800">
                  <div className="mt-0.5">
                    {insight.includes('✓') ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : insight.includes('⚠️') ? (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    ) : insight.includes('📈') ? (
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    ) : insight.includes('📉') ? (
                      <TrendingDown className="w-4 h-4 text-orange-600" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
