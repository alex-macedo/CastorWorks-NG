/**
 * Timeline module type definitions
 * Defines types for project timeline visualization, milestones, and AI forecasts
 */

/**
 * Timeline status for projects and phases
 */
export type TimelineStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed' | 'at_risk';

/**
 * Milestone completion status
 */
export type MilestoneStatus = 'pending' | 'completed' | 'delayed';

/**
 * Project timeline data including phases and milestones
 */
export interface ProjectTimelineData {
  id: string;
  name: string;
  startDate: Date;
  plannedEndDate: Date;
  adjustedForecast: Date | null;
  status: TimelineStatus;
  scheduleStatus?: 'not_started' | 'on_schedule' | 'at_risk' | 'delayed';
  progress: number;
  autoCascade: boolean;
  phases: PhaseTimelineData[];
  milestones: MilestoneData[];
}

/**
 * Phase timeline data with budget and interval information
 */
export interface PhaseTimelineData {
  id: string;
  projectId: string;
  phaseName: string;
  startDate: Date;
  plannedEndDate: Date;
  actualEndDate: Date | null;
  adjustedForecast: Date | null;
  status: TimelineStatus;
  progress: number;
  isMilestone: boolean;
  budgetAllocated: number;
  budgetSpent: number;
  interval: number; // Days ahead (+) or behind (-)
}

/**
 * Milestone definition with comments support
 */
export interface MilestoneData {
  id: string;
  phaseId: string | null;
  name: string;
  targetDate: Date;
  adjustedTargetDate: Date | null;
  actualDate: Date | null;
  status: MilestoneStatus;
  definition: string | null;
  justification: string | null;
  hasComments: boolean;
}

/**
 * Comment on a milestone (relational/threaded version)
 */
export interface TimelineComment {
  id: string;
  milestoneId: string;
  parentId: string | null;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  text: string;
  attachmentUrl: string | null;
  timestamp: Date;
  replies?: TimelineComment[];
}

/**
 * Construction cost benchmark project data
 */
export interface ConstructionCostBenchmarkProject {
  id: string;
  projectName: string;
  totalAreaM2: number;
  totalCost: number;
  costPerM2: number;
  benchmarkDate: Date;
  source: string;
  notes: string | null;
}

/**
 * Material cost breakdown for benchmark project
 */
export interface ConstructionCostBenchmarkMaterial {
  id: string;
  benchmarkProjectId: string;
  materialCategory: string;
  totalCost: number;
  costPerM2: number;
}

/**
 * Average material costs across benchmarks
 */
export interface ConstructionCostBenchmarkAverage {
  id: string;
  benchmarkGroup: string;
  materialCategory: string;
  averageTotalCost: number;
  averageCostPerM2: number;
  sampleSize: number;
  benchmarkDate: Date;
}

/**
 * AI forecast calculation result
 */
export interface ForecastCalculationResult {
  success: boolean;
  adjustedEndDate: string;
  velocity: number;
  estimatedRemainingDays: number;
  error?: string;
}

/**
 * Root cause categories for construction milestone delays
 */
export type DelayRootCause =
  | 'client_definition'
  | 'financial'
  | 'labor'
  | 'material'
  | 'weather'
  | 'design_change'
  | 'regulatory'
  | 'quality_rework';

/**
 * Party responsible for the delay
 */
export type DelayResponsibleParty =
  | 'client'
  | 'general_contractor'
  | 'subcontractor'
  | 'supplier'
  | 'regulatory_authority'
  | 'force_majeure';

/**
 * Impact scope of the delay
 */
export type DelayImpactType = 'isolated' | 'cascading' | 'critical_path';

/**
 * Milestone delay record for documentation and accountability
 */
export interface MilestoneDelay {
  id: string;
  milestoneId: string;
  projectId: string;
  delayDays: number;
  rootCause: DelayRootCause;
  responsibleParty: DelayResponsibleParty;
  impactType: DelayImpactType;
  description: string;
  correctiveActions: string | null;
  subcontractorTrade: string | null;
  reportedBy: string | null;
  reportedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Type of client decision (material selection, design approval, etc.)
 */
export type ClientDefinitionType = 'material_selection' | 'design_approval' | 'other'

/**
 * Status of a client definition item
 */
export type ClientDefinitionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'blocking';

/**
 * Client definition item — required client decision that may block progress
 */
export interface ClientDefinition {
  id: string;
  projectId: string;
  milestoneId: string | null;
  definitionItem: string;
  definitionType: ClientDefinitionType;
  description: string | null;
  requiredByDate: Date;
  status: ClientDefinitionStatus;
  assignedClientContact: string | null;
  impactScore: number;
  completionDate: Date | null;
  notes: string | null;
  followUpHistory: FollowUpEntry[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entry in the follow-up history JSONB array
 */
export interface FollowUpEntry {
  date: string;
  note: string;
  userId?: string;
}

/**
 * Types of dependencies between milestones
 * FS: Finish-to-Start (standard)
 * SS: Start-to-Start
 * FF: Finish-to-Finish
 * SF: Start-to-Finish
 */
export type MilestoneDependencyType = 'FS' | 'SS' | 'FF' | 'SF';

/**
 * Milestone dependency relationship
 */
export interface MilestoneDependency {
  id: string;
  projectId: string;
  predecessorId: string;
  successorId: string;
  dependencyType: MilestoneDependencyType;
  lagDays: number;
  createdAt: Date;
  updatedAt: Date;
}
