/**
 * Gantt Chart Component Library
 *
 * Unified Gantt chart system for project scheduling and timeline management
 */

// Main component
export { UnifiedGanttChart } from './UnifiedGanttChart';
export type { UnifiedGanttChartProps } from './types';

// Phase 2: Dependency Editors
export { GanttDependencyEditor } from './GanttDependencyEditor';
export type { GanttDependencyEditorProps } from './GanttDependencyEditor';
export { DependencyFormDialog } from './DependencyFormDialog';
export type { DependencyFormDialogProps } from './DependencyFormDialog';

// Phase 3: CPM Dashboard & Baselines
export { CriticalPathDashboard } from './CriticalPathDashboard';
export type { CriticalPathDashboardProps } from './CriticalPathDashboard';
export { BaselineScenarioManager } from './BaselineScenarioManager';
export type { BaselineScenarioManagerProps } from './BaselineScenarioManager';
export { ResourceLevelingVisualization } from './ResourceLevelingVisualization';
export type { ResourceLevelingVisualizationProps } from './ResourceLevelingVisualization';
export { MaterialConstraintManager } from './MaterialConstraintManager';
export type { MaterialConstraintManagerProps, MaterialConstraint } from './MaterialConstraintManager';

// Types
export type {
  UnifiedTask,
  MSProjectTask,
  GanttActivity,
  GanttPhase,
  Dependency,
  DependencyType,
  GanttDataAdapter,
  GanttInteractionState,
  GanttDisplayState,
  TimelineRange,
  BarPosition,
  ResourceAllocation,
  MaterialConstraint,
  WeatherRestriction,
  BaselineScenario,
} from './types';

// Adapters
export { MSProjectTaskAdapter, GanttActivityAdapter, getAdapterForData, getAdapterForContext } from './adapters';

// Utilities
export {
  isWorkingDay,
  addBusinessDays,
  getWorkingDayOffset,
  calculateBarPosition,
  initiateDragMove,
  calculateDragMoveDates,
  initiateResize,
  calculateResizeDates,
  filterTasks,
  flattenTasks,
  getCriticalPathTasks,
  getDependencyChain,
  validateTaskDates,
} from './interactionUtils';

// SVG utilities
export {
  calculateDependencyPath,
  generateDependencyPaths,
  generateArrowMarkers,
  generateMilestoneMarkers,
  highlightPath,
  getConnectorStyle,
  getDependencyLabel,
  calculateLabelPosition,
  generateDependencyVisualization,
} from './svgUtils';

// Resource Leveling Algorithm
export {
  identifyResourceConflicts,
  delayNonCriticalTasks,
  splitTaskAllocation,
  extendTaskDuration,
  applyResourceLeveling,
  getLevelingRecommendations,
} from './resourceLevelingAlgorithm';
export type {
  ResourceAllocationConflict,
  LevelingAdjustment,
  LevelingResult,
} from './resourceLevelingAlgorithm';

// Phase 5a: What-If Scenario Executor
export { ScenarioExecutor } from './ScenarioExecutor';
export type { ScenarioExecutorProps } from './ScenarioExecutor';
export { ScenarioComparison } from './ScenarioComparison';
export type { ScenarioComparisonProps } from './ScenarioComparison';
export {
  calculateScenarioMetrics,
  executeScenario,
  executeMultipleScenarios,
  compareScenarios,
  executeBaseline,
  executeAggressiveLeveling,
  executeConservativeLeveling,
  executeAddResources,
  executeRemoveResources,
  executeParallelExecution,
} from './whatIfScenarioExecutor';
export type {
  ScenarioMetrics,
  ScenarioExecution,
  ComparisonResult,
  ScenarioStrategy,
} from './whatIfScenarioExecutor';

// Phase 5b: Schedule Compression Algorithm
export { CompressionAnalyzer } from './CompressionAnalyzer';
export type { CompressionAnalyzerProps } from './CompressionAnalyzer';
export {
  analyzeCompression,
  applyCompression,
  getCompressionForTargetDuration,
} from './scheduleCompressionAlgorithm';
export type {
  CompressionOption,
  CompressionResult,
} from './scheduleCompressionAlgorithm';

// Phase 5c: Resource Histogram Visualization
export { ResourceHistogram } from './ResourceHistogram';
export type { ResourceHistogramProps } from './ResourceHistogram';
export {
  generateHistogram,
  generateHistogramForResource,
  getCapacityWarnings,
  generateResourceSmoothingRecommendations,
  filterHistogramData,
} from './resourceHistogramGenerator';
export type {
  HistogramDataPoint,
  CapacityWarning,
  HistogramSummary,
  GroupedHistogramData,
} from './resourceHistogramGenerator';

// Phase 5d: Earned Value Management (EVM)
export { EarnedValueDashboard } from './EarnedValueDashboard';
export type { EarnedValueDashboardProps } from './EarnedValueDashboard';
export {
  calculateEVM,
  forecastCompletion,
  generateEVMInsights,
  generateEVMTrends,
} from './earnedValueCalculator';
export type {
  TaskActualData,
  EVMMetrics,
  CompletionForecast,
  EVMTrendPoint,
} from './earnedValueCalculator';

// Phase 5e: Portfolio Multi-Project View
export { PortfolioDashboard } from './PortfolioDashboard';
export type { PortfolioDashboardProps } from './PortfolioDashboard';
export {
  createPortfolioView,
  calculatePortfolioMetrics,
  levelPortfolioResources,
  getPortfolioRecommendations,
} from './portfolioResourceManager';
export type {
  Portfolio,
  PortfolioMetrics,
  ProjectDependency,
  SharedResourceAllocation,
  PortfolioLevelingResult,
} from './portfolioResourceManager';

// Type exports for convenience
export type {
  DragState,
  ResizeState,
  FilterStatus,
  DependencyPath,
  TaskPosition,
  ArrowMarker,
  MilestoneMarker,
  ConnectorStyle,
} from './interactionUtils';
