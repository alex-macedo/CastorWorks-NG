/**
 * Portfolio Dashboard Component
 *
 * Displays multi-project scheduling and resource management:
 * - Portfolio-level metrics
 * - Cross-project dependencies
 * - Resource allocation across projects
 * - Portfolio leveling controls
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { AlertCircle, CheckCircle2, Zap, Gauge } from 'lucide-react';
import type { UnifiedTask } from './types';
import {
  createPortfolioView,
  calculatePortfolioMetrics,
  levelPortfolioResources,
  getPortfolioRecommendations,
  type Portfolio,
  type ProjectDependency,
} from './portfolioResourceManager';

export interface PortfolioDashboardProps {
  projects: Array<{ id: string; name: string; tasks: UnifiedTask[] }>;
  crossProjectDependencies?: ProjectDependency[];
  onLevelingApply?: (adjustments: any[]) => void;
  disabled?: boolean;
}

export function PortfolioDashboard({
  projects,
  crossProjectDependencies = [],
  onLevelingApply,
  disabled = false,
}: PortfolioDashboardProps) {
  const { t } = useLocalization();
  const [showLevelingResults, setShowLevelingResults] = useState(false);
  const [levelingResult, setLevelingResult] = useState<any>(null);

  // Create portfolio view
  const portfolio = useMemo(() => {
    return createPortfolioView(
      projects.map((p) => ({ id: p.id, tasks: p.tasks })),
      crossProjectDependencies
    );
  }, [projects, crossProjectDependencies]);

  // Calculate metrics
  const metrics = useMemo(() => {
    return calculatePortfolioMetrics(portfolio);
  }, [portfolio]);

  // Generate recommendations
  const recommendations = useMemo(() => {
    return getPortfolioRecommendations(portfolio, metrics);
  }, [portfolio, metrics]);

  // Prepare chart data
  const projectMetrics = useMemo(() => {
    return projects.map((project) => {
      const allTasks = project.tasks;
      const cost = allTasks.reduce((sum, task) => {
        const duration = (new Date(task.endDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 60 * 60 * 24);
        const hourlyRate = 50;
        const taskCost = task.resources?.reduce((s, r) => {
          const dailyCost = (r.allocationPercentage || 0) * 0.01 * 8 * hourlyRate;
          return s + (dailyCost * duration);
        }, 0) || 0;
        return sum + taskCost;
      }, 0);

      return {
        projectName: project.name,
        projectId: project.id,
        taskCount: allTasks.length,
        cost: Math.round(cost),
        resourceCount: new Set(allTasks.flatMap((t) => t.resources?.map((r) => r.resourceId) || [])).size,
      };
    });
  }, [projects]);

  const handleApplyLeveling = () => {
    const result = levelPortfolioResources(portfolio);
    setLevelingResult(result);
    setShowLevelingResults(true);
    onLevelingApply?.(result.adjustments);
  };

  // Risk score color
  const riskColor =
    metrics.portfolioRiskScore < 40
      ? 'text-green-600'
      : metrics.portfolioRiskScore < 70
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <div className="space-y-4 w-full">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{metrics.projectCount}</div>
            <p className="text-xs text-muted-foreground">Projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{metrics.taskCount}</div>
            <p className="text-xs text-muted-foreground">Tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{metrics.totalDuration}d</div>
            <p className="text-xs text-muted-foreground">Total Duration</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${riskColor}`}>{metrics.portfolioRiskScore}</div>
            <p className="text-xs text-muted-foreground">Risk Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portfolio Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs font-medium text-blue-600">Total Cost</p>
              <p className="text-xl font-bold text-blue-900 mt-1">
                ${metrics.totalProjectCost.toLocaleString()}
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs font-medium text-blue-600">Resource Utilization</p>
              <p className="text-xl font-bold text-blue-900 mt-1">{metrics.resourceUtilization}%</p>
              <div className="w-full h-1.5 bg-blue-200 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${metrics.resourceUtilization}%` }}
                ></div>
              </div>
            </div>

            <div className="p-3 bg-orange-50 rounded border border-orange-200">
              <p className="text-xs font-medium text-orange-600">Resource Conflicts</p>
              <p className="text-xl font-bold text-orange-900 mt-1">{metrics.resourceConflicts}</p>
            </div>

            <div className="p-3 bg-green-50 rounded border border-green-200">
              <p className="text-xs font-medium text-green-600">Critical Chain</p>
              <p className="text-xl font-bold text-green-900 mt-1">{metrics.criticalChainLength}d</p>
            </div>

            <div className="p-3 bg-indigo-50 rounded border border-indigo-200">
              <p className="text-xs font-medium text-indigo-600">Cross-Project Deps</p>
              <p className="text-xl font-bold text-indigo-900 mt-1">
                {portfolio.crossProjectDependencies.length}
              </p>
            </div>

            <div className={`p-3 rounded border ${metrics.portfolioRiskScore < 40 ? 'bg-green-50 border-green-200' : metrics.portfolioRiskScore < 70 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-xs font-medium ${metrics.portfolioRiskScore < 40 ? 'text-green-600' : metrics.portfolioRiskScore < 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                Risk Level
              </p>
              <p className={`text-xl font-bold mt-1 ${metrics.portfolioRiskScore < 40 ? 'text-green-900' : metrics.portfolioRiskScore < 70 ? 'text-yellow-900' : 'text-red-900'}`}>
                {metrics.portfolioRiskScore < 40 ? 'Low' : metrics.portfolioRiskScore < 70 ? 'Medium' : 'High'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={projectMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="projectName" fontSize={12} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="taskCount"
                fill="#3b82f6"
                name="Tasks"
              />
              <Bar
                yAxisId="right"
                dataKey="cost"
                fill="#ef4444"
                name="Cost ($)"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Portfolio Leveling */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-base text-orange-900 flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Portfolio Leveling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-orange-800">
            Resolve resource conflicts across all projects by intelligently delaying non-critical tasks
            in lower-priority projects.
          </p>

          <Button
            onClick={handleApplyLeveling}
            disabled={disabled || metrics.resourceConflicts === 0}
            className="w-full bg-orange-600 hover:bg-orange-700"
            size="lg"
          >
            <Zap className="w-4 h-4 mr-2" />
            Apply Portfolio Leveling
          </Button>

          {metrics.resourceConflicts === 0 && (
            <p className="text-xs text-green-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              No resource conflicts detected
            </p>
          )}
        </CardContent>
      </Card>

      {/* Leveling Results */}
      {showLevelingResults && levelingResult && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-base text-green-900">Leveling Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-green-700 font-medium">Adjustments</p>
                <p className="text-lg font-bold text-green-900">{levelingResult.adjustments.length}</p>
              </div>
              <div>
                <p className="text-xs text-green-700 font-medium">Conflicts Resolved</p>
                <p className="text-lg font-bold text-green-900">{levelingResult.conflictsResolved}</p>
              </div>
              <div>
                <p className="text-xs text-green-700 font-medium">Portfolio Impact</p>
                <p className="text-lg font-bold text-green-900">+{levelingResult.portfolioImpact}d</p>
              </div>
            </div>

            {levelingResult.adjustments.length > 0 && (
              <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
                <p className="text-xs font-medium text-green-700">Task Adjustments:</p>
                {levelingResult.adjustments.slice(0, 5).map((adj, idx) => (
                  <div key={idx} className="text-xs bg-white p-2 rounded">
                    <p className="font-medium">Task {adj.taskId}</p>
                    <p className="text-green-600">{adj.reason}</p>
                  </div>
                ))}
                {levelingResult.adjustments.length > 5 && (
                  <p className="text-xs text-green-700 font-medium">
                    +{levelingResult.adjustments.length - 5} more adjustments...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base text-blue-900">Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-blue-800">
                <div className="mt-0.5">
                  {rec.includes('✓') ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
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
    </div>
  );
}
