/**
 * Dependency Form Dialog - Form-Based Dependency Management
 *
 * Provides a traditional form interface for managing task dependencies:
 * - Add predecessors/successors via autocomplete
 * - Edit dependency types (FS, SS, FF, SF)
 * - Manage lag/lead time
 * - View and remove existing dependencies
 * - Comprehensive validation via dependencyValidator
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import { UnifiedTask, DependencyType, Dependency } from './types';
import {
  validateDependency,
  getErrorMessage,
  getPredecessors,
  getSuccessors
} from './dependencyValidator';
import { cn } from '@/lib/utils';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface DependencyFormDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;

  /** Callback when dialog closes */
  onClose: () => void;

  /** Task being edited */
  selectedTask: UnifiedTask | null;

  /** All tasks for dependency selection */
  allTasks: UnifiedTask[];

  /** Callback when dependency is added */
  onDependencyAdd: (sourceId: string, targetId: string, type: DependencyType, lag: number) => void;

  /** Callback when dependency is removed */
  onDependencyRemove: (sourceId: string, targetId: string) => void;
}

// ============================================================================
// STATE TYPES
// ============================================================================

interface PendingDependencyEdit {
  targetId: string;
  type: DependencyType;
  lag: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DependencyFormDialog({
  isOpen,
  onClose,
  selectedTask,
  allTasks,
  onDependencyAdd,
  onDependencyRemove,
}: DependencyFormDialogProps) {
  const [pendingEdit, setPendingEdit] = useState<PendingDependencyEdit | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const taskMap = useMemo(() => new Map(allTasks.map((t) => [t.id, t])), [allTasks]);

  // ========================================================================
  // DERIVED DATA
  // ========================================================================

  /**
   * Get list of tasks that can be predecessors (not self, not successors)
   */
  const availablePredecessors = useMemo(() => {
    if (!selectedTask) return [];

    const successors = getSuccessors(selectedTask.id, allTasks);
    const successorIds = new Set(successors.map((s) => s.id));
    const existingPredIds = new Set(selectedTask.dependencies?.map((d) => d.activityId) || []);

    return allTasks.filter(
      (task) =>
        task.id !== selectedTask.id &&
        !successorIds.has(task.id) &&
        !existingPredIds.has(task.id)
    );
  }, [selectedTask, allTasks]);

  /**
   * Get list of tasks that can be successors (not self, not predecessors)
   */
  const availableSuccessors = useMemo(() => {
    if (!selectedTask) return [];

    const predecessors = getPredecessors(selectedTask.id, allTasks);
    const predecessorIds = new Set(predecessors.map((p) => p.id));

    // Find tasks that depend on this task
    const successorIds = new Set<string>();
    allTasks.forEach((task) => {
      if (task.dependencies?.some((dep) => dep.activityId === selectedTask.id)) {
        successorIds.add(task.id);
      }
    });

    const existingSuccIds = new Set<string>();
    allTasks.forEach((task) => {
      if (task.dependencies?.some((dep) => dep.activityId === selectedTask.id)) {
        existingSuccIds.add(task.id);
      }
    });

    return allTasks.filter(
      (task) =>
        task.id !== selectedTask.id &&
        !predecessorIds.has(task.id) &&
        !existingSuccIds.has(task.id)
    );
  }, [selectedTask, allTasks]);

  /**
   * Filter tasks by search term
   */
  const filteredTasks = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return availablePredecessors.filter(
      (task) =>
        task.name.toLowerCase().includes(term) ||
        task.id.toLowerCase().includes(term)
    );
  }, [availablePredecessors, searchTerm]);

  /**
   * Get existing dependencies (predecessors this task depends on)
   */
  const existingDependencies = useMemo(() => {
    if (!selectedTask?.dependencies) return [];
    return selectedTask.dependencies.map((dep) => ({
      task: taskMap.get(dep.activityId),
      dependency: dep,
    })).filter((item) => item.task !== undefined);
  }, [selectedTask, taskMap]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  /**
   * Handle adding a dependency
   */
  const handleAddDependency = (targetTaskId: string) => {
    if (!selectedTask) return;

    // Validate the dependency
    const validation = validateDependency(selectedTask.id, targetTaskId, 'FS', allTasks);

    if (!validation.valid) {
      setValidationError(validation.errors.map(getErrorMessage).join('; '));
      return;
    }

    setValidationError(null);

    // Show form to set type and lag
    setPendingEdit({
      targetId: targetTaskId,
      type: 'FS',
      lag: 0,
    });
  };

  /**
   * Confirm adding the dependency
   */
  const handleConfirmAdd = () => {
    if (!selectedTask || !pendingEdit) return;

    onDependencyAdd(selectedTask.id, pendingEdit.targetId, pendingEdit.type, pendingEdit.lag);

    // Reset form
    setPendingEdit(null);
    setSearchTerm('');
    setValidationError(null);
  };

  /**
   * Cancel pending edit
   */
  const handleCancelEdit = () => {
    setPendingEdit(null);
    setValidationError(null);
  };

  /**
   * Remove an existing dependency
   */
  const handleRemoveDependency = (targetTaskId: string) => {
    if (!selectedTask) return;
    onDependencyRemove(selectedTask.id, targetTaskId);
  };

  /**
   * Close dialog
   */
  const handleClose = () => {
    setPendingEdit(null);
    setSearchTerm('');
    setValidationError(null);
    onClose();
  };

  if (!isOpen || !selectedTask) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Dependencies</DialogTitle>
          <DialogDescription>
            Add predecessors or successors for{' '}
            <span className="font-semibold text-foreground">{selectedTask.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Validation Error */}
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Existing Dependencies Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Existing Dependencies</Label>

            {existingDependencies.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                This task has no dependencies
              </p>
            ) : (
              <div className="space-y-2 bg-slate-50 p-3 rounded-lg border">
                {existingDependencies.map((item) => {
                  const task = item.task!;
                  const dep = item.dependency;

                  return (
                    <div
                      key={dep.activityId}
                      className="flex items-center justify-between p-2 bg-white rounded border"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{task.name}</p>
                        <p className="text-xs text-muted-foreground">
                          <Badge variant="outline" className="mr-2">
                            {dep.type}
                          </Badge>
                          {dep.lag > 0 && <span>Lag: +{dep.lag}d</span>}
                          {dep.lag < 0 && <span>Lead: {dep.lag}d</span>}
                          {dep.lag === 0 && <span>No lag</span>}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveDependency(dep.activityId)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Predecessor Section */}
          <div className="space-y-3 border-t pt-4">
            <Label htmlFor="search-predecessor" className="text-base font-semibold">
              Add Predecessor
            </Label>

            {/* Search Input */}
            <Input
              id="search-predecessor"
              type="text"
              placeholder="Search tasks by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="font-mono text-sm"
            />

            {/* Task List */}
            {searchTerm && (
              <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg bg-slate-50">
                {filteredTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3 italic">No matching tasks</p>
                ) : (
                  filteredTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleAddDependency(task.id)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-slate-200 transition-colors border-b last:border-b-0',
                        'flex justify-between items-center'
                      )}
                    >
                      <div>
                        <p className="font-medium">{task.name}</p>
                        <p className="text-xs text-muted-foreground">{task.id}</p>
                      </div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Dependency Type & Lag Editor - Shows when adding */}
          {pendingEdit && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-amber-900">Configure New Dependency:</span>
                <span className="font-semibold">
                  {selectedTask.name} →{' '}
                  {taskMap.get(pendingEdit.targetId)?.name || pendingEdit.targetId}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Dependency Type */}
                <div className="space-y-2">
                  <Label htmlFor="dep-type-form">Dependency Type</Label>
                  <Select value={pendingEdit.type} onValueChange={(val) =>
                    setPendingEdit({ ...pendingEdit, type: val as DependencyType })
                  }>
                    <SelectTrigger id="dep-type-form">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FS">
                        <span className="font-mono">FS</span> - Finish-to-Start
                      </SelectItem>
                      <SelectItem value="SS">
                        <span className="font-mono">SS</span> - Start-to-Start
                      </SelectItem>
                      <SelectItem value="FF">
                        <span className="font-mono">FF</span> - Finish-to-Finish
                      </SelectItem>
                      <SelectItem value="SF">
                        <span className="font-mono">SF</span> - Start-to-Finish
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Lag Days */}
                <div className="space-y-2">
                  <Label htmlFor="lag-days-form">Lag / Lead (days)</Label>
                  <Input
                    id="lag-days-form"
                    type="number"
                    value={pendingEdit.lag}
                    onChange={(e) =>
                      setPendingEdit({ ...pendingEdit, lag: parseInt(e.target.value) || 0 })
                    }
                    placeholder="0"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1">
                <p>• <span className="font-mono">{pendingEdit.type}</span>: {
                  pendingEdit.type === 'FS' && 'Predecessor finishes, then this task starts'
                }
                {pendingEdit.type === 'SS' && 'Predecessor starts, then this task starts'
                }
                {pendingEdit.type === 'FF' && 'Predecessor finishes, then this task finishes'
                }
                {pendingEdit.type === 'SF' && 'Predecessor starts, then this task finishes'
                }</p>
                <p>• Positive lag = delay | Negative lag = overlap (lead)</p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={handleConfirmAdd}
                >
                  Add Dependency
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DependencyFormDialog;
