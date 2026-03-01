/**
 * Scenario Comparison Component
 *
 * Visualizes and compares multiple what-if scenarios side-by-side
 * Displays metrics, recommendations, and allows scenario selection
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocalization } from '@/contexts/LocalizationContext';
import {
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Bar } from 'recharts/es6/cartesian/Bar';
import { TrendingDown, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ScenarioExecution, ComparisonResult } from './whatIfScenarioExecutor';

export interface ScenarioComparisonProps {
  comparison: ComparisonResult;
  onScenarioSelect?: (scenario: ScenarioExecution) => void;
  selectedScenarioId?: string;
}

export function ScenarioComparison({
  comparison,
  onScenarioSelect,
  selectedScenarioId,
}: ScenarioComparisonProps) {
  const { t } = useLocalization();
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  // Prepare chart data
  const chartData = useMemo(() => {
    return comparison.scenarios.map((scenario) => ({
      name: scenario.name,
      id: scenario.id,
      duration: scenario.metrics.duration,
      cost: scenario.metrics.estimatedCost,
      conflicts: scenario.metrics.resourceConflicts,
      utilization: scenario.metrics.averageResourceUtilization,
    }));
  }, [comparison.scenarios]);

  // Prepare comparison table data
  const metricsData = useMemo(() => {
    return comparison.scenarios.map((scenario) => ({
      scenario: scenario.name,
      id: scenario.id,
      duration: `${scenario.metrics.duration} days`,
      cost: `$${scenario.metrics.estimatedCost.toLocaleString()}`,
      conflicts: scenario.metrics.resourceConflicts,
      utilization: `${scenario.metrics.averageResourceUtilization}%`,
      isBestDuration: scenario.id === comparison.bestForDuration,
      isBestCost: scenario.id === comparison.bestForCost,
      isBestUtil: scenario.id === comparison.bestForResourceUtil,
    }));
  }, [comparison]);

  const baselineScenario = comparison.scenarios.find((s) => s.strategy === 'baseline');
  const selectedScenario = comparison.scenarios.find((s) => s.id === selectedScenarioId);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Scenario Comparison</h2>
        <p className="text-sm text-muted-foreground">
          {comparison.scenarios.length} scenario(s) analyzed across 4 key metrics
        </p>
      </div>

      {/* Recommendations */}
      {comparison.recommendations.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-900">Key Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {comparison.recommendations.map((rec, idx) => (
                <li key={idx} className="flex gap-2 text-sm text-blue-800">
                  <div className="mt-1">→</div>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Duration Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Duration Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="duration" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estimated Cost Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Bar dataKey="cost" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Multi-Metric Comparison Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resource Utilization & Conflicts</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="utilization"
                stroke="#f59e0b"
                name="Avg Utilization (%)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="conflicts"
                stroke="#ef4444"
                name="Resource Conflicts"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detailed Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left font-semibold py-2 px-3">Scenario</th>
                  <th className="text-center font-semibold py-2 px-3">Duration</th>
                  <th className="text-center font-semibold py-2 px-3">Cost</th>
                  <th className="text-center font-semibold py-2 px-3">Conflicts</th>
                  <th className="text-center font-semibold py-2 px-3">Utilization</th>
                  <th className="text-center font-semibold py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {metricsData.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b ${selectedScenarioId === row.id ? 'bg-blue-50' : ''}`}
                  >
                    <td className="py-3 px-3">
                      <div className="font-medium">{row.scenario}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.isBestDuration && <span className="text-green-600">⚡ Best Duration</span>}
                        {row.isBestCost && <span className="text-green-600">💰 Best Cost</span>}
                        {row.isBestUtil && <span className="text-green-600">📊 Best Util</span>}
                      </div>
                    </td>
                    <td className="text-center py-3 px-3">
                      <div className="font-medium">{row.duration}</div>
                      {baselineScenario && row.id !== baselineScenario.id && (
                        <div className="text-xs text-muted-foreground">
                          {baselineScenario.metrics.duration - parseInt(row.duration) > 0
                            ? `✓ ${baselineScenario.metrics.duration - parseInt(row.duration)} days saved`
                            : `${parseInt(row.duration) - baselineScenario.metrics.duration} days added`}
                        </div>
                      )}
                    </td>
                    <td className="text-center py-3 px-3">{row.cost}</td>
                    <td className="text-center py-3 px-3">
                      <span
                        className={`font-medium ${
                          row.conflicts === 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {row.conflicts}
                      </span>
                    </td>
                    <td className="text-center py-3 px-3">{row.utilization}</td>
                    <td className="text-center py-3 px-3">
                      <Button
                        size="sm"
                        variant={selectedScenarioId === row.id ? 'default' : 'outline'}
                        onClick={() => onScenarioSelect?.(
                          comparison.scenarios.find((s) => s.id === row.id)!
                        )}
                        className="h-7"
                      >
                        {selectedScenarioId === row.id ? 'Selected' : 'Select'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Selected Scenario Details */}
      {selectedScenario && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-base text-green-900">
              Selected: {selectedScenario.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedScenario.description && (
              <p className="text-sm text-green-800">{selectedScenario.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-green-700">Total Duration</p>
                <p className="text-lg font-bold text-green-900">
                  {selectedScenario.metrics.duration} days
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-green-700">Estimated Cost</p>
                <p className="text-lg font-bold text-green-900">
                  ${selectedScenario.metrics.estimatedCost.toLocaleString()}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-green-700">Resource Conflicts</p>
                <div className="flex items-center gap-2">
                  {selectedScenario.metrics.resourceConflicts === 0 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-lg font-bold text-green-900">None</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-lg font-bold text-green-900">
                        {selectedScenario.metrics.resourceConflicts}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-green-700">Avg Utilization</p>
                <p className="text-lg font-bold text-green-900">
                  {selectedScenario.metrics.averageResourceUtilization}%
                </p>
              </div>
            </div>

            {baselineScenario && baselineScenario.id !== selectedScenario.id && (
              <div className="border-t border-green-200 pt-3 mt-3">
                <p className="text-xs font-medium text-green-700 mb-2">Comparison to Baseline</p>
                <div className="space-y-1 text-sm text-green-800">
                  <p>
                    {selectedScenario.metrics.duration < baselineScenario.metrics.duration ? (
                      <span className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4" />
                        {baselineScenario.metrics.duration - selectedScenario.metrics.duration} day(s)
                        faster
                      </span>
                    ) : selectedScenario.metrics.duration > baselineScenario.metrics.duration ? (
                      <span className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        {selectedScenario.metrics.duration - baselineScenario.metrics.duration} day(s)
                        slower
                      </span>
                    ) : (
                      <span>Same duration as baseline</span>
                    )}
                  </p>
                  <p>
                    Cost difference: ${Math.abs(
                      selectedScenario.metrics.estimatedCost - baselineScenario.metrics.estimatedCost
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
