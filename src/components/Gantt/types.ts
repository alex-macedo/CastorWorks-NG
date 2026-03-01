/**
 * Unified Gantt Chart Types
 *
 * This file defines the core types for the unified Gantt chart component.
 * It supports multiple input formats through adapters while using a single
 * internal representation for rendering.
 */

// ============================================================================
// DEPENDENCY TYPES
// ============================================================================

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface Dependency {
  /** ID of the task this dependency refers to */
  activityId: string;
  /** Dependency type: FS=Finish-Start, SS=Start-Start, FF=Finish-Finish, SF=Start-Finish */
  type: DependencyType;
  /** Lag in days (can be negative for lead time) */
  lag: number;
}

// ============================================================================
// UNIFIED INTERNAL FORMAT
// ============================================================================

/**
 * UnifiedTask is the internal representation used by UnifiedGanttChart
 * It merges features from both MSProjectTask and GanttActivity
 */
export interface UnifiedTask {
  /** Unique identifier */
  id: string;

  // Basic Info
  name: string;
  description?: string;

  // Dates (ISO format strings)
  startDate: string;
  endDate: string;
  duration: number; // Days

  // Status & Progress
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'at_risk';
  completionPercentage: number; // 0-100

  // Priority & Importance
  priority: 'low' | 'medium' | 'high' | 'critical';
  isMilestone?: boolean;

  // Resources & Effort
  assignees?: string[];
  effortHours?: number;
  estimatedCost?: number;

  // Dependencies
  dependencies?: Dependency[];

  // CPM/PERT Fields (for critical path analysis)
  earlyStart?: string;
  earlyFinish?: string;
  lateStart?: string;
  lateFinish?: string;
  floatDays?: number;
  isCritical?: boolean;

  // Hierarchy
  level: number; // 0 for root, 1+ for subtasks
  parentId?: string;
  subtasks?: UnifiedTask[];

  // Metadata
  category?: string;
  phaseId?: string;
  notes?: string;
  sequence?: number;

  // Custom properties
  metadata?: Record<string, any>;
}

// ============================================================================
// LEGACY FORMATS (for backward compatibility)
// ============================================================================

/**
 * MSProjectTask - Legacy format from MicrosoftProjectLike component
 * Uses camelCase and simpler structure
 */
export interface MSProjectTask {
  id: string | number;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  duration?: number;
  progress: number; // 0-100
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'at_risk';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignees?: string[];
  dependencies?: (string | number)[]; // Simple IDs
  milestone?: boolean;
  subtasks?: MSProjectTask[];
  effort?: number; // person-hours
  cost?: number;
  notes?: string;
  category?: string;
}

/**
 * GanttActivity - Legacy format from ProjectPhases GanttChart
 * Matches database schema for project_activities table
 */
export interface GanttActivity {
  id: string;
  name: string;
  sequence: number;
  start_date?: string | null;
  end_date?: string | null;
  days_for_activity: number;
  phase_id?: string | null;
  dependencies?: Dependency[];
  is_critical?: boolean;
  completion_percentage?: number;

  // CPM fields
  early_start?: string | null;
  early_finish?: string | null;
  late_start?: string | null;
  late_finish?: string | null;
  float_days?: number;

  // Additional fields
  activity_type?: string;
  description?: string;
  planned_cost?: number;
  metadata?: Record<string, any>;
}

/**
 * GanttPhase - Grouping container for activities
 */
export interface GanttPhase {
  id: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  status: string;
  is_critical?: boolean;
}

// ============================================================================
// ADAPTER INTERFACE
// ============================================================================

/**
 * DataAdapter pattern for converting different input formats to UnifiedTask
 * This allows the same UnifiedGanttChart component to work with different data sources
 */
export interface GanttDataAdapter {
  /** Transform external data to unified format */
  transformToUnified(data: any): UnifiedTask[];

  /** Transform unified format back to external format */
  transformFromUnified(tasks: UnifiedTask[]): any;

  /** Identify the context/source of this data */
  getContext(): 'project_activities' | 'microsoft_project' | 'phases' | 'schedule';
}

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface UnifiedGanttChartProps {
  /** Title of the Gantt chart */
  title?: string;

  /** Description */
  description?: string;

  /** Array of tasks to display */
  tasks: UnifiedTask[];

  /** Optional phases for grouping (project_activities format) */
  phases?: GanttPhase[];

  /** Callback when task is clicked */
  onTaskClick?: (task: UnifiedTask) => void;

  /** Callback when task is edited (dates, progress, etc.) */
  onTaskUpdate?: (taskId: string, updates: Partial<UnifiedTask>) => void;

  /** Callback when dependency is added/changed */
  onDependencyChange?: (fromId: string, toId: string, type: DependencyType, lag: number) => void;

  // Display Options
  showCriticalPath?: boolean;
  showResources?: boolean;
  showMilestones?: boolean;
  showDependencies?: boolean;
  showPhases?: boolean;

  // Interaction Options
  collapsible?: boolean;
  draggableRescale?: boolean;
  draggableMove?: boolean;
  editableDependencies?: boolean;

  // View Options
  initialZoomLevel?: 'day' | 'week' | 'month';
  initialViewMode?: 'flat' | 'hierarchical';

  // Calendar Configuration
  projectCalendar?: {
    enabled: boolean;
    workingDays: string[];
    holidays: Array<{ date: string; reason: string }>;
  };

  // Styling
  className?: string;
  height?: number;

  // Data source context (helps with formatting decisions)
  dataContext?: 'project_activities' | 'microsoft_project' | 'phases';
}

// ============================================================================
// INTERACTION STATE
// ============================================================================

export type InteractionType = 'move' | 'resize-start' | 'resize-end' | 'link-start' | 'link-end';

export interface GanttInteractionState {
  interactingTaskId: string | null;
  interactionType: InteractionType | null;
  initialMouseX: number;
  initialMouseY: number;
  initialTaskDates: { start: Date; end: Date } | null;
  previewDates: { start: Date; end: Date; taskId: string } | null;
}

export interface DependencyLinkingState {
  sourcTaskId: string | null;
  targetTaskId: string | null;
  isLinking: boolean;
}

// ============================================================================
// DISPLAY STATE
// ============================================================================

export interface GanttDisplayState {
  expandedTasks: Set<string>;
  expandedPhases: Set<string>;
  zoomLevel: 'day' | 'week' | 'month';
  viewMode: 'flat' | 'hierarchical';
  filterStatus: 'all' | 'active' | 'completed' | 'delayed' | 'at_risk';
  searchQuery: string;
  showCriticalPath: boolean;
  showDependencies: boolean;
  workingDaysMode: boolean;
}

// ============================================================================
// TIMELINE CALCULATIONS
// ============================================================================

export interface TimelineRange {
  start: Date;
  end: Date;
  totalDays: number;
}

export interface BarPosition {
  x: number;
  width: number;
}

// ============================================================================
// RESOURCE & CONSTRAINT DATA (for Phase 5-7)
// ============================================================================

export interface ResourceAllocation {
  resourceId: string;
  resourceName: string;
  resourceType: 'labor' | 'equipment' | 'material' | 'subcontractor';
  unitsRequired: number;
  allocationPercentage: number;
}

export interface MaterialConstraint {
  id: string;
  activityId: string;
  resourceId: string;
  requiredDeliveryDate: string;
  actualDeliveryDate?: string;
  quantityRequired: number;
  quantityOnHand: number;
  status: 'pending' | 'ordered' | 'in_transit' | 'delivered';
  supplier?: string;
}

export interface WeatherRestriction {
  id: string;
  projectId: string;
  regionName: string;
  restrictionType: 'rain' | 'temperature' | 'wind' | 'snow' | 'other';
  startDate: string;
  endDate: string;
  severity: 'warning' | 'restriction' | 'prohibition';
  affectedActivityTypes: string[];
  description?: string;
}

export interface BaselineScenario {
  id: string;
  scenarioName: string;
  isBaseline: boolean;
  isActive: boolean;
  description?: string;
  createdAt: string;
  activities: UnifiedTask[];
}
