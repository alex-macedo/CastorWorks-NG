/**
 * Gantt Dependency Editor - Visual Drag-to-Link Mode
 *
 * Allows users to create dependencies by:
 * 1. Clicking "Link Mode" button to activate editor
 * 2. Clicking on a source task bar
 * 3. Dragging to a target task bar
 * 4. Selecting dependency type (FS, SS, FF, SF) and lag in a dialog
 *
 * Includes circular dependency prevention and visual feedback
 */

import React, { useState, useRef, useEffect } from 'react';
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
import { AlertCircle, Link2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { UnifiedTask, DependencyType } from './types';
import { wouldCreateCycle, validateDependency, getErrorMessage } from './dependencyValidator';
import { calculateDependencyPath, TaskPosition, BarPosition } from './svgUtils';
import { cn } from '@/lib/utils';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface GanttDependencyEditorProps {
  /** Whether linking mode is active */
  isActive: boolean;

  /** Callback to toggle linking mode */
  onToggle: (active: boolean) => void;

  /** All tasks in the chart */
  tasks: UnifiedTask[];

  /** Callback when dependency is successfully created */
  onDependencyAdd: (sourceId: string, targetId: string, type: DependencyType, lag: number) => void;

  /** Task bar positions for visual feedback */
  taskPositions: Map<string, TaskPosition>;

  /** Row height for positioning calculations */
  rowHeight: number;
}

// ============================================================================
// STATE TYPES
// ============================================================================

interface LinkingState {
  sourceTaskId: string | null;
  targetTaskId: string | null;
  isDrawing: boolean;
  mouseX: number;
  mouseY: number;
  previewPath: string | null;
}

interface PendingDependency {
  sourceTaskId: string;
  targetTaskId: string;
  sourceTask: UnifiedTask;
  targetTask: UnifiedTask;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function GanttDependencyEditor({
  isActive,
  onToggle,
  tasks,
  onDependencyAdd,
  taskPositions,
  rowHeight,
}: GanttDependencyEditorProps) {
  const canvasRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [linkingState, setLinkingState] = useState<LinkingState>({
    sourceTaskId: null,
    targetTaskId: null,
    isDrawing: false,
    mouseX: 0,
    mouseY: 0,
    previewPath: null,
  });

  const [pendingDependency, setPendingDependency] = useState<PendingDependency | null>(null);
  const [dependencyType, setDependencyType] = useState<DependencyType>('FS');
  const [lagDays, setLagDays] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // ========================================================================
  // VISUAL FEEDBACK
  // ========================================================================

  /**
   * Render visual preview of dependency being created
   */
  useEffect(() => {
    if (!isActive || !linkingState.sourceTaskId || !canvasRef.current) {
      return;
    }

    const sourcePos = taskPositions.get(linkingState.sourceTaskId);
    if (!sourcePos) return;

    // Get source task row index by finding it in filtered tasks
    const sourceTaskIndex = tasks.findIndex((t) => t.id === linkingState.sourceTaskId);
    if (sourceTaskIndex === -1) return;

    const sourceY = sourceTaskIndex * rowHeight + rowHeight / 2;
    const sourceX = sourcePos.barPosition.x + sourcePos.barPosition.width / 2;

    let previewPath = `M ${sourceX} ${sourceY}`;

    if (linkingState.isDrawing) {
      // Draw preview line to mouse position
      const controlX = sourceX + Math.abs(linkingState.mouseX - sourceX) / 3;
      previewPath += ` Q ${controlX} ${sourceY}, ${linkingState.mouseX} ${linkingState.mouseY}`;
    } else if (linkingState.targetTaskId) {
      // Draw preview line to target task
      const targetPos = taskPositions.get(linkingState.targetTaskId);
      if (targetPos) {
        const targetTaskIndex = tasks.findIndex((t) => t.id === linkingState.targetTaskId);
        if (targetTaskIndex !== -1) {
          const targetY = targetTaskIndex * rowHeight + rowHeight / 2;
          const targetX = targetPos.barPosition.x + targetPos.barPosition.width / 2;

          const controlX = sourceX + Math.abs(targetX - sourceX) / 3;
          previewPath += ` Q ${controlX} ${sourceY}, ${targetX} ${targetY}`;
        }
      }
    }

    setLinkingState((prev) => ({
      ...prev,
      previewPath,
    }));

    // Draw on canvas
    const path = canvasRef.current.querySelector('path');
    if (path) {
      path.setAttribute('d', previewPath);
      path.setAttribute('opacity', linkingState.isDrawing || linkingState.targetTaskId ? '1' : '0.5');
    }
  }, [linkingState, taskPositions, tasks, rowHeight, isActive]);

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  /**
   * Handle clicking on a task bar to select it as source or target
   */
  const handleTaskBarClick = (e: React.MouseEvent, taskId: string) => {
    if (!isActive) return;
    e.stopPropagation();

    // If no source selected, this becomes the source
    if (!linkingState.sourceTaskId) {
      setLinkingState({
        sourceTaskId: taskId,
        targetTaskId: null,
        isDrawing: true,
        mouseX: e.clientX,
        mouseY: e.clientY,
        previewPath: null,
      });
      setValidationError(null);
      return;
    }

    // If source is selected and we click on a different task, it becomes the target
    if (linkingState.sourceTaskId && linkingState.sourceTaskId !== taskId) {
      const sourceTask = taskMap.get(linkingState.sourceTaskId);
      const targetTask = taskMap.get(taskId);

      if (!sourceTask || !targetTask) return;

      // Validate the dependency
      const validation = validateDependency(
        linkingState.sourceTaskId,
        taskId,
        'FS',
        tasks
      );

      if (!validation.valid) {
        setValidationError(validation.errors.map(getErrorMessage).join('; '));
        return;
      }

      // Show dialog to confirm and set dependency type
      setPendingDependency({
        sourceTaskId: linkingState.sourceTaskId,
        targetTaskId: taskId,
        sourceTask,
        targetTask,
      });

      setLinkingState({
        sourceTaskId: null,
        targetTaskId: null,
        isDrawing: false,
        mouseX: 0,
        mouseY: 0,
        previewPath: null,
      });
    }
  };

  /**
   * Handle mouse movement during drag
   */
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isActive || !linkingState.sourceTaskId) return;

    setLinkingState((prev) => ({
      ...prev,
      mouseX: e.clientX,
      mouseY: e.clientY,
    }));
  };

  /**
   * Handle mouse up to detect target task
   */
  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isActive || !linkingState.sourceTaskId || !linkingState.isDrawing) return;

    // Try to find task under mouse cursor
    const element = document.elementFromPoint(e.clientX, e.clientY);
    const taskBar = element?.closest('[data-task-id]');

    if (taskBar) {
      const targetTaskId = taskBar.getAttribute('data-task-id');
      if (targetTaskId && targetTaskId !== linkingState.sourceTaskId) {
        handleTaskBarClick(e as any, targetTaskId);
      }
    } else {
      // No target found, reset
      setLinkingState({
        sourceTaskId: null,
        targetTaskId: null,
        isDrawing: false,
        mouseX: 0,
        mouseY: 0,
        previewPath: null,
      });
    }
  };

  /**
   * Handle escape key to cancel linking
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isActive) {
        setLinkingState({
          sourceTaskId: null,
          targetTaskId: null,
          isDrawing: false,
          mouseX: 0,
          mouseY: 0,
          previewPath: null,
        });
        setPendingDependency(null);
        setValidationError(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  // ========================================================================
  // DIALOG HANDLERS
  // ========================================================================

  /**
   * Confirm and create the dependency
   */
  const handleConfirmDependency = () => {
    if (!pendingDependency) return;

    onDependencyAdd(
      pendingDependency.sourceTaskId,
      pendingDependency.targetTaskId,
      dependencyType,
      lagDays
    );

    // Reset state
    setPendingDependency(null);
    setDependencyType('FS');
    setLagDays(0);
    setValidationError(null);
  };

  /**
   * Cancel dependency creation
   */
  const handleCancelDependency = () => {
    setPendingDependency(null);
    setDependencyType('FS');
    setLagDays(0);
    setValidationError(null);
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div ref={containerRef} className="relative">
      {/* Linking Mode Button */}
      <div className="absolute top-2 right-2 z-10">
        <Button
          size="sm"
          variant={isActive ? 'default' : 'outline'}
          onClick={() => {
            onToggle(!isActive);
            setLinkingState({
              sourceTaskId: null,
              targetTaskId: null,
              isDrawing: false,
              mouseX: 0,
              mouseY: 0,
              previewPath: null,
            });
            setValidationError(null);
          }}
          className={cn(isActive && 'bg-amber-500 hover:bg-amber-600')}
        >
          <Link2 className="h-4 w-4 mr-2" />
          {isActive ? 'Linking Mode (Press ESC to exit)' : 'Link Tasks'}
        </Button>
      </div>

      {/* SVG Canvas for preview lines */}
      {isActive && (
        <svg
          ref={canvasRef}
          className="absolute top-0 left-0 w-full pointer-events-none"
          style={{ zIndex: 5 }}
        >
          <defs>
            <marker
              id="arrowhead-preview"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#f59e0b" />
            </marker>
          </defs>
          <path
            stroke="#f59e0b"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrowhead-preview)"
            className="transition-all duration-100"
          />
        </svg>
      )}

      {/* Validation Error Alert */}
      {isActive && validationError && (
        <Alert variant="destructive" className="absolute top-12 right-2 z-20 max-w-xs">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {/* Task Bar Wrapper - Detects clicks */}
      {isActive && (
        <div
          className="absolute inset-0 pointer-events-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Task bars should have data-task-id attribute and pointer-events-auto */}
        </div>
      )}

      {/* Dependency Type Dialog */}
      <Dialog open={!!pendingDependency} onOpenChange={handleCancelDependency}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Dependency</DialogTitle>
            <DialogDescription>
              Link{' '}
              <span className="font-semibold text-foreground">
                {pendingDependency?.sourceTask.name}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-foreground">
                {pendingDependency?.targetTask.name}
              </span>
            </DialogDescription>
          </DialogHeader>

          {/* Dependency Type Selection */}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dep-type">Dependency Type</Label>
              <Select value={dependencyType} onValueChange={(val) => setDependencyType(val as DependencyType)}>
                <SelectTrigger id="dep-type">
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
              <p className="text-xs text-muted-foreground">
                {dependencyType === 'FS' && 'Target starts when source finishes'}
                {dependencyType === 'SS' && 'Target starts when source starts'}
                {dependencyType === 'FF' && 'Target finishes when source finishes'}
                {dependencyType === 'SF' && 'Target finishes when source starts'}
              </p>
            </div>

            {/* Lag Days */}
            <div className="space-y-2">
              <Label htmlFor="lag-days">Lag / Lead Time (days)</Label>
              <Input
                id="lag-days"
                type="number"
                value={lagDays}
                onChange={(e) => setLagDays(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Positive = lag (delay), Negative = lead (overlap)
              </p>
            </div>

            {/* Visual Preview */}
            <div className="bg-slate-50 p-3 rounded-md border">
              <p className="text-sm font-medium mb-2">Preview:</p>
              <p className="text-sm font-mono text-slate-600">
                {pendingDependency?.sourceTask.name} <span className="text-amber-600">→</span>{' '}
                <span className="font-semibold">{dependencyType}</span>
                {lagDays !== 0 && ` +${lagDays}d`}
              </p>
              <p className="text-xs text-slate-500 mt-1 ">
                → {pendingDependency?.targetTask.name}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDependency}>
              Cancel
            </Button>
            <Button onClick={handleConfirmDependency} className="bg-amber-500 hover:bg-amber-600">
              Create Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GanttDependencyEditor;
