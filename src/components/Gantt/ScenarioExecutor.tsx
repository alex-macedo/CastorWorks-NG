/**
 * What-If Scenario Executor Component
 *
 * Allows project managers to:
 * - Select multiple strategies to execute
 * - Run scenario simulations
 * - Compare outcomes
 * - Apply selected scenario to project
 */

import { useCallback, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocalization } from '@/contexts/LocalizationContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import type { UnifiedTask } from './types';
import {
  executeMultipleScenarios,
  compareScenarios,
  type ScenarioStrategy,
  type ScenarioExecution,
  type ComparisonResult,
} from './whatIfScenarioExecutor';
import { ScenarioComparison } from './ScenarioComparison';

export interface ScenarioExecutorProps {
  tasks: UnifiedTask[];
  projectStartDate: string;
  projectEndDate: string;
  onScenarioApply?: (scenario: ScenarioExecution) => void;
  disabled?: boolean;
}

const AVAILABLE_STRATEGIES: { id: ScenarioStrategy; label: string; description: string }[] = [
  {
    id: 'baseline',
    label: 'Baseline',
    description: 'Current schedule without changes',
  },
  {
    id: 'aggressive-leveling',
    label: 'Aggressive Leveling',
    description: 'Resolve all conflicts with up to 20 iterations',
  },
  {
    id: 'conservative-leveling',
    label: 'Conservative Leveling',
    description: 'Resolve conflicts with minimal impact (5 iterations)',
  },
  {
    id: 'add-resources',
    label: 'Add Resources',
    description: 'Increase resource allocation across tasks',
  },
  {
    id: 'remove-resources',
    label: 'Remove Resources',
    description: 'Decrease resource allocation across tasks',
  },
  {
    id: 'parallel-execution',
    label: 'Parallel Execution',
    description: 'Run independent tasks in parallel',
  },
];

export function ScenarioExecutor({
  tasks,
  projectStartDate,
  projectEndDate,
  onScenarioApply,
  disabled = false,
}: ScenarioExecutorProps) {
  const { t } = useLocalization();
  const [selectedStrategies, setSelectedStrategies] = useState<ScenarioStrategy[]>(['baseline']);
  const [resourceIncreasePercent, setResourceIncreasePercent] = useState([20]);
  const [resourceDecreasePercent, setResourceDecreasePercent] = useState([20]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const projectStart = useMemo(() => new Date(projectStartDate), [projectStartDate]);
  const projectEnd = useMemo(() => new Date(projectEndDate), [projectEndDate]);

  const toggleStrategy = useCallback((strategy: ScenarioStrategy) => {
    setSelectedStrategies((prev) => {
      if (prev.includes(strategy)) {
        return prev.filter((s) => s !== strategy);
      }
      return [...prev, strategy];
    });
  }, []);

  const executeScenarios = useCallback(async () => {
    if (selectedStrategies.length === 0 || disabled) return;

    setIsExecuting(true);
    const startTime = Date.now();

    try {
      // Build parameter map for strategies that need them
      const parameterMap: Record<ScenarioStrategy, Record<string, unknown>> = {
        'add-resources': { percentageIncrease: resourceIncreasePercent[0] },
        'remove-resources': { percentageDecrease: resourceDecreasePercent[0] },
        baseline: {},
        'aggressive-leveling': {},
        'conservative-leveling': {},
        'parallel-execution': {},
        custom: {},
      };

      // Execute all selected strategies
      const scenarios = executeMultipleScenarios(
        tasks,
        selectedStrategies,
        projectStart,
        projectEnd
      );

      // Compare and generate recommendations
      const comparison = compareScenarios(scenarios);

      // Set the first scenario as selected by default
      if (scenarios.length > 0) {
        setSelectedScenarioId(scenarios[0].id);
      }

      setComparisonResult(comparison);
      const elapsed = Date.now() - startTime;
      setExecutionTime(elapsed);
    } catch (error) {
      console.error('Error executing scenarios:', error);
    } finally {
      setIsExecuting(false);
    }
  }, [selectedStrategies, tasks, projectStart, projectEnd, resourceIncreasePercent, resourceDecreasePercent, disabled]);

  const handleApplyScenario = useCallback(() => {
    if (!comparisonResult || !selectedScenarioId) return;

    const scenario = comparisonResult.scenarios.find((s) => s.id === selectedScenarioId);
    if (scenario) {
      onScenarioApply?.(scenario);
    }
  }, [comparisonResult, selectedScenarioId, onScenarioApply]);

  const scenarioCount = selectedStrategies.length;
  const isBasicOnly = selectedStrategies.length === 1 && selectedStrategies[0] === 'baseline';

  return (
    <div className="space-y-4 w-full">
      <Tabs defaultValue="setup" variant="pill" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="setup">Scenario Setup</TabsTrigger>
          <TabsTrigger value="comparison" disabled={!comparisonResult}>
            Results {comparisonResult && <Badge className="ml-2">{comparisonResult.scenarios.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Strategies to Execute</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {AVAILABLE_STRATEGIES.map((strategy) => (
                  <div key={strategy.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id={strategy.id}
                      checked={selectedStrategies.includes(strategy.id)}
                      onCheckedChange={() => toggleStrategy(strategy.id)}
                      disabled={disabled || (strategy.id === 'baseline' && selectedStrategies.length === 1)}
                    />
                    <div className="flex-1">
                      <label htmlFor={strategy.id} className="font-medium cursor-pointer">
                        {strategy.label}
                      </label>
                      <p className="text-sm text-muted-foreground">{strategy.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Conditional Parameters */}
              {selectedStrategies.includes('add-resources') && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <label className="text-sm font-medium block mb-2">
                    Resource Increase: {resourceIncreasePercent[0]}%
                  </label>
                  <Slider
                    value={resourceIncreasePercent}
                    onValueChange={setResourceIncreasePercent}
                    min={5}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-blue-600 mt-2">
                    Will increase allocation percentage on all tasks
                  </p>
                </div>
              )}

              {selectedStrategies.includes('remove-resources') && (
                <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <label className="text-sm font-medium block mb-2">
                    Resource Decrease: {resourceDecreasePercent[0]}%
                  </label>
                  <Slider
                    value={resourceDecreasePercent}
                    onValueChange={setResourceDecreasePercent}
                    min={5}
                    max={80}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-orange-600 mt-2">
                    Will decrease allocation percentage on all tasks
                  </p>
                </div>
              )}

              {/* Summary */}
              <div className="mt-6 p-3 bg-gray-50 rounded-lg border">
                <p className="text-sm font-medium mb-2">Execution Summary</p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>• {scenarioCount} scenario(s) will be executed</p>
                  <p>• {tasks.length} task(s) will be analyzed</p>
                  {comparisonResult && (
                    <p className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Last execution: {executionTime}ms
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <Button
                onClick={executeScenarios}
                disabled={disabled || isExecuting || scenarioCount === 0}
                className="w-full"
                size="lg"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Executing {scenarioCount} Scenario(s)...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Execute Scenarios
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison Tab */}
        {comparisonResult && (
          <TabsContent value="comparison" className="space-y-4">
            <ScenarioComparison
              comparison={comparisonResult}
              selectedScenarioId={selectedScenarioId}
              onScenarioSelect={(scenario) => setSelectedScenarioId(scenario.id)}
            />

            {/* Apply Selected Scenario */}
            {selectedScenarioId && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-base text-green-900">Apply to Project</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-green-800 mb-4">
                    Click below to apply the selected scenario to your project schedule
                  </p>
                  <Button
                    onClick={handleApplyScenario}
                    disabled={!selectedScenarioId || disabled}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Apply Selected Scenario
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
