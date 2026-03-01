/**
 * SVG Utilities for Gantt Chart Dependencies
 *
 * Extracted from ProjectPhases GanttChart component
 * Handles SVG rendering of dependency arrows and connectors
 */

import { UnifiedTask, Dependency, DependencyType, BarPosition } from './types';

// ============================================================================
// SVG PATH GENERATION
// ============================================================================

export interface DependencyPath {
  id: string;
  d: string; // SVG path data
  sourceTaskId: string;
  targetTaskId: string;
  dependencyType: DependencyType;
  lag: number;
  isCritical: boolean;
}

export interface TaskPosition {
  taskId: string;
  barPosition: BarPosition;
  rowIndex: number;
  rowHeight: number;
}

/**
 * Calculate the SVG path for a dependency arrow
 * Uses cubic Bezier curves for smooth connections
 */
export function calculateDependencyPath(
  sourcePos: TaskPosition,
  targetPos: TaskPosition,
  dependencyType: DependencyType,
  _lag: number = 0,
  containerHeight: number = 0
): { x1: number; y1: number; x2: number; y2: number; d: string } {
  // Calculate connection points based on dependency type
  const sourceY = sourcePos.rowIndex * sourcePos.rowHeight + sourcePos.rowHeight / 2;
  const targetY = targetPos.rowIndex * targetPos.rowHeight + targetPos.rowHeight / 2;

  let x1: number;
  let y1: number;
  let x2: number;
  let y2: number;

  switch (dependencyType) {
    case 'FS': // Finish-to-Start: from end of source to start of target
      x1 = sourcePos.barPosition.x + sourcePos.barPosition.width;
      y1 = sourceY;
      x2 = targetPos.barPosition.x;
      y2 = targetY;
      break;

    case 'SS': // Start-to-Start: from start of source to start of target
      x1 = sourcePos.barPosition.x;
      y1 = sourceY;
      x2 = targetPos.barPosition.x;
      y2 = targetY;
      break;

    case 'FF': // Finish-to-Finish: from end of source to end of target
      x1 = sourcePos.barPosition.x + sourcePos.barPosition.width;
      y1 = sourceY;
      x2 = targetPos.barPosition.x + targetPos.barPosition.width;
      y2 = targetY;
      break;

    case 'SF': // Start-to-Finish: from start of source to end of target
      x1 = sourcePos.barPosition.x;
      y1 = sourceY;
      x2 = targetPos.barPosition.x + targetPos.barPosition.width;
      y2 = targetY;
      break;

    default:
      x1 = sourcePos.barPosition.x;
      y1 = sourceY;
      x2 = targetPos.barPosition.x;
      y2 = targetY;
  }

  // Create smooth cubic Bezier curve
  const controlPointDistance = Math.abs(y2 - y1) / 3;
  const controlX1 = x1 + Math.max(controlPointDistance, 20);
  const controlY1 = y1;
  const controlX2 = x2 - Math.max(controlPointDistance, 20);
  const controlY2 = y2;

  // SVG path: M = move to, C = cubic Bezier curve
  const d = `M ${x1} ${y1} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${x2} ${y2}`;

  return { x1, y1, x2, y2, d };
}

/**
 * Generate all dependency paths for a set of tasks
 */
export function generateDependencyPaths(
  tasks: UnifiedTask[],
  taskPositions: Map<string, TaskPosition>
): DependencyPath[] {
  const paths: DependencyPath[] = [];
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  tasks.forEach((task) => {
    if (!task.dependencies) return;

    const sourcePos = taskPositions.get(task.id);
    if (!sourcePos) return;

    task.dependencies.forEach((dep) => {
      const targetTask = taskMap.get(dep.activityId);
      if (!targetTask) return;

      const targetPos = taskPositions.get(dep.activityId);
      if (!targetPos) return;

      const pathData = calculateDependencyPath(sourcePos, targetPos, dep.type, dep.lag);

      paths.push({
        id: `dep-${task.id}-to-${dep.activityId}`,
        d: pathData.d,
        sourceTaskId: task.id,
        targetTaskId: dep.activityId,
        dependencyType: dep.type,
        lag: dep.lag,
        isCritical: (task.isCritical || false) && (targetTask.isCritical || false),
      });
    });
  });

  return paths;
}

// ============================================================================
// ARROW MARKERS
// ============================================================================

export interface ArrowMarker {
  id: string;
  strokeWidth: number;
  strokeColor: string;
  fillColor: string;
  isCritical: boolean;
}

/**
 * Generate SVG defs for arrow markers
 */
export function generateArrowMarkers(isCritical: boolean = false): string {
  const stroke = isCritical ? '#dc2626' : '#666'; // red for critical, gray for normal
  const fill = isCritical ? '#dc2626' : '#666';

  return `
    <defs>
      <marker
        id="arrowhead-${isCritical ? 'critical' : 'normal'}"
        markerWidth="10"
        markerHeight="10"
        refX="9"
        refY="3"
        orient="auto"
      >
        <polygon
          points="0 0, 10 3, 0 6"
          fill="${fill}"
        />
      </marker>
    </defs>
  `;
}

// ============================================================================
// MILESTONE RENDERING
// ============================================================================

export interface MilestoneMarker {
  taskId: string;
  x: number;
  y: number;
  label: string;
}

/**
 * Generate milestone diamond markers for critical points
 */
export function generateMilestoneMarkers(
  tasks: UnifiedTask[],
  taskPositions: Map<string, TaskPosition>
): MilestoneMarker[] {
  return tasks
    .filter((task) => task.isMilestone && taskPositions.has(task.id))
    .map((task) => {
      const pos = taskPositions.get(task.id)!;
      return {
        taskId: task.id,
        x: pos.barPosition.x + pos.barPosition.width / 2,
        y: pos.rowIndex * pos.rowHeight + pos.rowHeight / 2,
        label: task.name,
      };
    });
}

// ============================================================================
// HIGHLIGHT PATHS
// ============================================================================

/**
 * Generate SVG for highlighting a path (critical path, dependency chain, etc.)
 */
export function highlightPath(
  paths: DependencyPath[],
  highlightTaskIds: Set<string>,
  highlightColor: string = '#ef4444' // red
): DependencyPath[] {
  return paths
    .filter(
      (p) => highlightTaskIds.has(p.sourceTaskId) || highlightTaskIds.has(p.targetTaskId)
    )
    .map((p) => ({
      ...p,
      isCritical: true, // Mark for visual highlighting
    }));
}

// ============================================================================
// CONNECTOR STYLES
// ============================================================================

export interface ConnectorStyle {
  stroke: string;
  strokeWidth: number;
  opacity: number;
  dasharray?: string;
  markerEnd: string;
}

/**
 * Get the CSS style for a dependency connector based on its properties
 */
export function getConnectorStyle(
  isCritical: boolean,
  isHighlighted: boolean = false,
  dependencyType?: DependencyType
): ConnectorStyle {
  const baseStrokeWidth = 2;
  const criticalColor = '#dc2626'; // red
  const normalColor = '#999'; // gray
  const highlightColor = '#fbbf24'; // amber

  return {
    stroke: isHighlighted ? highlightColor : isCritical ? criticalColor : normalColor,
    strokeWidth: isHighlighted || isCritical ? 3 : baseStrokeWidth,
    opacity: isHighlighted ? 1 : 0.7,
    dasharray: dependencyType === 'SS' ? '5,5' : undefined, // Dashed for Start-Start
    markerEnd: `url(#arrowhead-${isCritical ? 'critical' : 'normal'})`,
  };
}

// ============================================================================
// LABEL GENERATION
// ============================================================================

/**
 * Get label text for a dependency
 */
export function getDependencyLabel(type: DependencyType, lag: number = 0): string {
  const typeLabel = type;
  const lagLabel = lag !== 0 ? ` ${lag > 0 ? '+' : ''}${lag}d` : '';
  return `${typeLabel}${lagLabel}`;
}

/**
 * Calculate position for a dependency label
 */
export function calculateLabelPosition(
  sourcePath: { x1: number; y1: number; x2: number; y2: number },
  offset: number = 10
): { x: number; y: number; anchor: string } {
  const midX = (sourcePath.x1 + sourcePath.x2) / 2;
  const midY = (sourcePath.y1 + sourcePath.y2) / 2 - offset;

  return {
    x: midX,
    y: midY,
    anchor: 'middle',
  };
}

// ============================================================================
// SVG CONTENT GENERATION
// ============================================================================

/**
 * Generate complete SVG content for all dependencies
 */
export function generateDependencyVisualization(
  dependencyPaths: DependencyPath[],
  containerWidth: number,
  containerHeight: number,
  highlightedPaths?: Set<string>
): string {
  const lines = [
    `<svg width="${containerWidth}" height="${containerHeight}" class="absolute top-0 left-0 pointer-events-none overflow-visible">`,
  ];

  // Add markers
  lines.push(generateArrowMarkers(false));
  lines.push(generateArrowMarkers(true));

  // Add paths
  dependencyPaths.forEach((path) => {
    const isHighlighted = highlightedPaths?.has(path.id) || false;
    const style = getConnectorStyle(path.isCritical, isHighlighted, path.dependencyType);

    lines.push(
      `<path
        d="${path.d}"
        stroke="${style.stroke}"
        stroke-width="${style.strokeWidth}"
        opacity="${style.opacity}"
        ${style.dasharray ? `stroke-dasharray="${style.dasharray}"` : ''}
        fill="none"
        marker-end="${style.markerEnd}"
        class="transition-all duration-200"
      />`
    );
  });

  lines.push('</svg>');
  return lines.join('\n');
}
