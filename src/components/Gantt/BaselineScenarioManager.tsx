/**
 * Baseline Scenario Manager - Schedule Comparison & What-If Analysis
 *
 * Manages baseline scenarios for schedule comparison:
 * - Create and manage multiple scenarios (Original, Optimistic, Pessimistic, etc.)
 * - Compare current schedule against baselines
 * - Track schedule variance
 * - What-if analysis with alternative dates
 */

import React, { useState, useMemo } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Plus,
  Copy,
  Trash2,
  Clock,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import type { UnifiedTask, BaselineScenario } from './types';
import { cn } from '@/lib/utils';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface BaselineScenarioManagerProps {
  /** Current tasks */
  tasks: UnifiedTask[];

  /** Available scenarios */
  scenarios: BaselineScenario[];

  /** Callback when scenario is created */
  onScenarioCreate: (scenario: BaselineScenario) => void;

  /** Callback when scenario is deleted */
  onScenarioDelete: (scenarioId: string) => void;

  /** Callback when baseline is set */
  onBaselineSet: (scenarioId: string) => void;

  /** Custom className */
  className?: string;
}

// ============================================================================
// STATE TYPES
// ============================================================================

interface NewScenarioForm {
  name: string;
  description: string;
  type: 'baseline' | 'optimistic' | 'pessimistic' | 'alternative';
}

// ============================================================================
// HELPERS
// ============================================================================

let scenarioIdCounter = 0;
const generateUniqueScenarioId = () => {
  scenarioIdCounter += 1;
  return `scenario-${Date.now()}-${scenarioIdCounter}`;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function BaselineScenarioManager({
  tasks,
  scenarios,
  onScenarioCreate,
  onScenarioDelete,
  onBaselineSet,
  className,
}: BaselineScenarioManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newScenario, setNewScenario] = useState<NewScenarioForm>({
    name: '',
    description: '',
    type: 'baseline',
  });

  // ========================================================================
  // DERIVED DATA
  // ========================================================================

  /**
   * Calculate scenario statistics
   */
  const scenarioStats = useMemo(() => {
    return scenarios.map((scenario) => {
      const scenarioTasks = scenario.tasks || [];
      const scenarioEnd = Math.max(
        ...scenarioTasks.map((t) =>
          parseISO(t.endDate).getTime()
        )
      );
      const currentEnd = Math.max(
        ...tasks.map((t) => parseISO(t.endDate).getTime())
      );

      const variance = differenceInDays(
        new Date(scenarioEnd),
        new Date(currentEnd)
      );

      const currentProgress = tasks.reduce(
        (sum, t) => sum + (t.completionPercentage || 0),
        0
      ) / Math.max(1, tasks.length);

      return {
        scenario,
        variance,
        endDate: new Date(scenarioEnd),
        completionPercentage: currentProgress,
      };
    });
  }, [scenarios, tasks]);

  /**
   * Get current project end date
   */
  const currentEndDate = useMemo(() => {
    const endDates = tasks.map((t) => parseISO(t.endDate).getTime());
    return endDates.length > 0 ? new Date(Math.max(...endDates)) : new Date();
  }, [tasks]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  /**
   * Handle creating a new scenario
   */
  const handleCreateScenario = () => {
    if (!newScenario.name.trim()) return;

    const scenario: BaselineScenario = {
      id: generateUniqueScenarioId(),
      name: newScenario.name,
      description: newScenario.description,
      type: newScenario.type,
      tasks: tasks.map((t) => ({
        id: t.id,
        name: t.name,
        startDate: t.startDate,
        endDate: t.endDate,
      })),
      createdAt: new Date(),
      isBaseline: newScenario.type === 'baseline',
    };

    onScenarioCreate(scenario);

    // Reset form
    setNewScenario({ name: '', description: '', type: 'baseline' });
    setShowCreateDialog(false);
  };

  /**
   * Handle duplicating a scenario
   */
  const handleDuplicateScenario = (scenario: BaselineScenario) => {
    const duplicated: BaselineScenario = {
      ...scenario,
      id: generateUniqueScenarioId(),
      name: `${scenario.name} (Copy)`,
      createdAt: new Date(),
    };

    onScenarioCreate(duplicated);
  };

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-orange-600'; // Schedule slip
    if (variance < 0) return 'text-green-600'; // Ahead of schedule
    return 'text-gray-600'; // On schedule
  };

  const getVarianceLabel = (variance: number) => {
    if (variance > 0) return `${variance}d slip`;
    if (variance < 0) return `${Math.abs(variance)}d ahead`;
    return 'On schedule';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'baseline':
        return 'bg-blue-100 text-blue-800';
      case 'optimistic':
        return 'bg-green-100 text-green-800';
      case 'pessimistic':
        return 'bg-red-100 text-red-800';
      case 'alternative':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Baseline Scenarios
          </h3>
          <p className="text-sm text-gray-500">
            Create and compare schedule scenarios
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          New Scenario
        </Button>
      </div>

      {/* Scenarios Grid */}
      {scenarioStats.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No baseline scenarios created. Create one to start tracking schedule changes.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current Schedule Card */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Current Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">End Date:</span>
                <span className="font-semibold">
                  {format(currentEndDate, 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tasks:</span>
                <span className="font-semibold">{tasks.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Progress:</span>
                <span className="font-semibold">
                  {Math.round(
                    tasks.reduce((sum, t) => sum + (t.completionPercentage || 0), 0) /
                    Math.max(1, tasks.length)
                  )}
                  %
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Scenario Cards */}
          {scenarioStats.map(({ scenario, variance, endDate, completionPercentage }) => (
            <Card key={scenario.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{scenario.name}</CardTitle>
                      <Badge className={getTypeColor(scenario.type)}>
                        {scenario.type}
                      </Badge>
                    </div>
                    {scenario.description && (
                      <p className="text-xs text-gray-500 mt-1">
                        {scenario.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* End Date */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">End Date:</span>
                  <span className="font-semibold">
                    {format(endDate, 'MMM d, yyyy')}
                  </span>
                </div>

                {/* Variance */}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Schedule Variance:</span>
                  <span className={cn('font-semibold', getVarianceColor(variance))}>
                    {getVarianceLabel(variance)}
                  </span>
                </div>

                {/* Created Date */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-500">Created:</span>
                  <span className="text-gray-600">
                    {format(scenario.createdAt, 'MMM d, yyyy')}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  {!scenario.isBaseline && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onBaselineSet(scenario.id)}
                      className="flex-1 text-xs"
                    >
                      Set as Baseline
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicateScenario(scenario)}
                    className="gap-1"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onScenarioDelete(scenario.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Scenario Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Scenario</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Scenario Name */}
            <div className="space-y-2">
              <Label htmlFor="scenario-name">Scenario Name</Label>
              <Input
                id="scenario-name"
                placeholder="e.g., Optimistic Schedule"
                value={newScenario.name}
                onChange={(e) =>
                  setNewScenario((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>

            {/* Scenario Type */}
            <div className="space-y-2">
              <Label htmlFor="scenario-type">Type</Label>
              <Select value={newScenario.type} onValueChange={(val) =>
                setNewScenario((prev) => ({
                  ...prev,
                  type: val as any,
                }))
              }>
                <SelectTrigger id="scenario-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baseline">Baseline</SelectItem>
                  <SelectItem value="optimistic">Optimistic</SelectItem>
                  <SelectItem value="pessimistic">Pessimistic</SelectItem>
                  <SelectItem value="alternative">Alternative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="scenario-desc">Description (optional)</Label>
              <Input
                id="scenario-desc"
                placeholder="Add notes about this scenario..."
                value={newScenario.description}
                onChange={(e) =>
                  setNewScenario((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateScenario}
              disabled={!newScenario.name.trim()}
            >
              Create Scenario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BaselineScenarioManager;
