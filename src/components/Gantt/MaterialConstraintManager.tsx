/**
 * Material Constraint Manager - Material/Supply Availability & Conflict Detection
 *
 * Manages material constraints that affect project scheduling:
 * - Define material availability windows
 * - Track material usage across tasks
 * - Identify scheduling conflicts (material unavailable during task)
 * - Impact analysis on project timeline
 */

import React, { useState, useMemo } from 'react';
import { format, parseISO, differenceInDays, eachDayOfInterval } from 'date-fns';
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
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Plus,
  Trash2,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import type { UnifiedTask } from './types';
import { cn } from '@/lib/utils';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface MaterialConstraint {
  id: string;
  name: string;
  description?: string;
  availableFrom: string;
  availableTo: string;
  quantity: number;
  unit: string;
  createdAt: Date;
}

export interface TaskMaterialUsage {
  taskId: string;
  taskName: string;
  materialId: string;
  requiredQuantity: number;
  conflictStatus: 'available' | 'partial' | 'unavailable';
}

export interface MaterialConstraintManagerProps {
  /** Tasks in project */
  tasks: UnifiedTask[];

  /** Project date range */
  projectStart: Date;
  projectEnd: Date;

  /** Material constraints */
  constraints: MaterialConstraint[];

  /** Callback when constraint is added */
  onConstraintAdd: (constraint: MaterialConstraint) => void;

  /** Callback when constraint is removed */
  onConstraintRemove: (constraintId: string) => void;

  /** Custom className */
  className?: string;
}

// ============================================================================
// STATE TYPES
// ============================================================================

interface NewConstraintForm {
  name: string;
  description: string;
  availableFrom: string;
  availableTo: string;
  quantity: number;
  unit: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function MaterialConstraintManager({
  tasks,
  projectStart,
  projectEnd,
  constraints,
  onConstraintAdd,
  onConstraintRemove,
  className,
}: MaterialConstraintManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [newConstraint, setNewConstraint] = useState<NewConstraintForm>({
    name: '',
    description: '',
    availableFrom: format(projectStart, 'yyyy-MM-dd'),
    availableTo: format(projectEnd, 'yyyy-MM-dd'),
    quantity: 0,
    unit: 'unit',
  });

  // ========================================================================
  // DERIVED DATA
  // ========================================================================

  /**
   * Calculate impact on tasks
   */
  const impactAnalysis = useMemo(() => {
    let affectedTasks = 0;
    const conflictingTaskIds = new Set<string>();
    let severeConflicts = 0;

    constraints.forEach((constraint) => {
      const constraintStart = parseISO(constraint.availableFrom);
      const constraintEnd = parseISO(constraint.availableTo);

      tasks.forEach((task) => {
        const taskStart = parseISO(task.startDate);
        const taskEnd = parseISO(task.endDate);

        // Check if task falls outside material availability
        if (taskEnd > constraintEnd || taskStart < constraintStart) {
          // Task uses material when it's unavailable
          conflictingTaskIds.add(task.id);
          if (task.isCritical) {
            severeConflicts++;
          }
        } else if (taskStart === constraintStart && taskEnd === constraintEnd) {
          // Task exactly matches material availability
          conflictingTaskIds.add(task.id);
        }
      });
    });

    affectedTasks = conflictingTaskIds.size;

    return {
      affectedTaskCount: affectedTasks,
      severeConflicts,
      totalConflicts: conflictingTaskIds.size,
      conflictPercentage: tasks.length > 0 ? (affectedTasks / tasks.length) * 100 : 0,
    };
  }, [constraints, tasks]);

  /**
   * Get constraint color by availability
   */
  const getConstraintStatusColor = (constraint: MaterialConstraint) => {
    const today = new Date();
    const availStart = parseISO(constraint.availableFrom);
    const availEnd = parseISO(constraint.availableTo);

    if (today < availStart) {
      return 'bg-blue-100 text-blue-900 border-blue-300';
    } else if (today > availEnd) {
      return 'bg-gray-100 text-gray-900 border-gray-300';
    }
    return 'bg-green-100 text-green-900 border-green-300';
  };

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  /**
   * Handle adding constraint
   */
  const handleAddConstraint = () => {
    if (!newConstraint.name.trim() || newConstraint.quantity <= 0) return;

    const constraint: MaterialConstraint = {
      id: `constraint-${Date.now()}`,
      name: newConstraint.name,
      description: newConstraint.description,
      availableFrom: newConstraint.availableFrom,
      availableTo: newConstraint.availableTo,
      quantity: newConstraint.quantity,
      unit: newConstraint.unit,
      createdAt: new Date(),
    };

    onConstraintAdd(constraint);

    // Reset form
    setNewConstraint({
      name: '',
      description: '',
      availableFrom: format(projectStart, 'yyyy-MM-dd'),
      availableTo: format(projectEnd, 'yyyy-MM-dd'),
      quantity: 0,
      unit: 'unit',
    });
    setShowDialog(false);
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Material & Supply Constraints
          </h3>
          <p className="text-sm text-gray-500">
            Manage material availability and scheduling conflicts
          </p>
        </div>
        <Button
          onClick={() => setShowDialog(true)}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Material
        </Button>
      </div>

      {/* Impact Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Materials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{constraints.length}</div>
            <p className="text-xs text-gray-500 mt-1">Tracked items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Affected Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{impactAnalysis.affectedTaskCount}</div>
            <p className="text-xs text-gray-500 mt-1">With conflicts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Severe Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                impactAnalysis.severeConflicts > 0 ? 'text-red-600' : 'text-green-600'
              )}
            >
              {impactAnalysis.severeConflicts}
            </div>
            <p className="text-xs text-gray-500 mt-1">Critical tasks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(impactAnalysis.conflictPercentage)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Of project</p>
          </CardContent>
        </Card>
      </div>

      {/* Conflict Alert */}
      {impactAnalysis.severeConflicts > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {impactAnalysis.severeConflicts} critical task(s) conflict with material availability.
            Consider schedule adjustments or material procurement timelines.
          </AlertDescription>
        </Alert>
      )}

      {/* Constraints List */}
      {constraints.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No material constraints defined. Add constraints to account for supply availability.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          {constraints.map((constraint) => {
            const duration = differenceInDays(
              parseISO(constraint.availableTo),
              parseISO(constraint.availableFrom)
            );

            return (
              <div
                key={constraint.id}
                className={cn(
                  'p-3 rounded-lg border-2',
                  getConstraintStatusColor(constraint)
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{constraint.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {constraint.quantity} {constraint.unit}
                      </Badge>
                    </div>

                    {constraint.description && (
                      <p className="text-sm text-gray-600 mt-1">{constraint.description}</p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1">
                        {format(parseISO(constraint.availableFrom), 'MMM d')} -
                        {' '}
                        {format(parseISO(constraint.availableTo), 'MMM d')}
                      </span>
                      <span className="text-gray-600">
                        ({duration} days)
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onConstraintRemove(constraint.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Constraint Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Material Constraint</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Material Name */}
            <div className="space-y-2">
              <Label htmlFor="material-name">Material Name</Label>
              <Input
                id="material-name"
                placeholder="e.g., Steel Reinforcement, Concrete, Lumber"
                value={newConstraint.name}
                onChange={(e) =>
                  setNewConstraint((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="material-desc">Description (optional)</Label>
              <Input
                id="material-desc"
                placeholder="Add notes about this material..."
                value={newConstraint.description}
                onChange={(e) =>
                  setNewConstraint((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            {/* Availability From */}
            <div className="space-y-2">
              <Label htmlFor="available-from">Available From</Label>
              <Input
                id="available-from"
                type="date"
                value={newConstraint.availableFrom}
                onChange={(e) =>
                  setNewConstraint((prev) => ({
                    ...prev,
                    availableFrom: e.target.value,
                  }))
                }
              />
            </div>

            {/* Availability To */}
            <div className="space-y-2">
              <Label htmlFor="available-to">Available To</Label>
              <Input
                id="available-to"
                type="date"
                value={newConstraint.availableTo}
                onChange={(e) =>
                  setNewConstraint((prev) => ({
                    ...prev,
                    availableTo: e.target.value,
                  }))
                }
              />
            </div>

            {/* Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newConstraint.quantity}
                  onChange={(e) =>
                    setNewConstraint((prev) => ({
                      ...prev,
                      quantity: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  placeholder="e.g., tons, units, m³"
                  value={newConstraint.unit}
                  onChange={(e) =>
                    setNewConstraint((prev) => ({
                      ...prev,
                      unit: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddConstraint}
              disabled={!newConstraint.name.trim() || newConstraint.quantity <= 0}
            >
              Add Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MaterialConstraintManager;
