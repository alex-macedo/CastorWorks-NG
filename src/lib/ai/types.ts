// ============================================
// AI Platform TypeScript Types
// ============================================

// ============================================
// AI CACHE - Generic interface for cached AI features
// ============================================
/**
 * Standard response shape from AI Edge Functions that support caching.
 * Edge Functions should return { data, cached, generatedAt }.
 */
export interface AICachedResponse<T> {
  /** The AI-generated content (analysis, insights, etc.) */
  data: T
  /** True when served from ai_insights cache */
  cached: boolean
  /** ISO date string of when the content was generated */
  generatedAt: string
}

/**
 * Hook return shape for AI features with cache support.
 * Use this interface when building hooks that wrap cached AI Edge Functions.
 */
export interface UseAICacheResult<T> {
  /** The AI-generated data */
  data: T | null
  /** Whether the data was served from cache */
  cached?: boolean
  /** ISO date string of when the data was generated */
  generatedAt?: string | null
  /** Trigger a refresh (forces cache bypass via forceRefresh: true) */
  refresh: () => void
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean
  /** Loading state for initial fetch */
  isLoading?: boolean
  /** Error state */
  error?: Error | null
}

// ============================================
// ESTIMATE GENERATION
// ============================================

export interface EstimateGenerationInput {
  projectType: 'kitchen' | 'bathroom' | 'basement' | 'whole_home' | 'deck' | 'roofing' | 'flooring' | 'painting' | 'addition' | 'custom';
  location: string; // City, State
  description: string;
  squareFootage?: number;
  qualityLevel?: 'economy' | 'standard' | 'premium' | 'luxury';
  clientBudget?: number;
}

export interface EstimateLineItem {
  id: string;
  category: 'demolition' | 'materials' | 'labor' | 'equipment' | 'permits' | 'disposal' | 'contingency';
  subcategory?: string;
  description: string;
  quantity: number;
  unit: 'sf' | 'lf' | 'ea' | 'hr' | 'day' | 'cy' | 'ton' | 'gal';
  unitPrice: number;
  total: number;
  notes?: string;
}

export interface EstimateAlternative {
  description: string;
  priceDifference: number;
  impact: string;
}

export interface GeneratedEstimate {
  lineItems: EstimateLineItem[];
  estimatedDurationDays: number;
  confidenceScore: number; // 0-100
  assumptions: string[];
  recommendations: string[];
  alternativeOptions?: EstimateAlternative[];
}

// ============================================
// VOICE TRANSCRIPTION
// ============================================

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  confidence: number; // 0-1
  duration: number; // seconds
  language: string;
  segments?: TranscriptionSegment[];
}

// ============================================
// DOCUMENT PROCESSING (OCR)
// ============================================

export interface ExtractedDimensions {
  width?: number;
  height?: number;
  depth?: number;
  unit: 'ft' | 'in' | 'm' | 'cm';
}

export interface ExtractedQuantity {
  item: string;
  quantity: number;
  unit: string;
}

export interface ExtractedDocumentData {
  rawText: string;
  dimensions?: ExtractedDimensions[];
  materials?: string[];
  quantities?: ExtractedQuantity[];
  brands?: string[];
  specifications?: string[];
  confidence: number;
}

// ============================================
// IMAGE ANALYSIS
// ============================================

export interface ImageAnalysisResult {
  identifiedElements: string[]; // e.g., ["window", "tile floor", "granite countertop"]
  estimatedDimensions?: Record<string, unknown>;
  conditions: string[]; // e.g., ["good condition", "water damage visible"]
  recommendations: string[];
  materials: string[];
  brands?: string[];
}

// ============================================
// PROPOSALS
// ============================================

export type ProposalSection = 'introduction' | 'scope' | 'exclusions' | 'payment' | 'warranty' | 'timeline';
export type ProposalTone = 'professional' | 'friendly' | 'detailed';

export interface ProposalGenerationInput {
  estimateId: string;
  sections: ProposalSection[];
  companyInfo: {
    name: string;
    specialties: string[];
    yearsInBusiness: number;
  };
  tone: ProposalTone;
  clientName: string;
}

export interface ProposalAnalytics {
  sentAt: Date;
  viewedAt?: Date;
  viewCount: number;
  timeOnPage: number; // seconds
  acceptedAt?: Date;
  rejectedAt?: Date;
  clientComments?: string;
  signatureData?: string;
}

// ============================================
// AI CHAT
// ============================================

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: Date;
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
    result?: unknown;
  };
}

export interface ChatContext {
  currentPage?: string;
  selectedProjectId?: string;
  selectedEstimateId?: string;
  recentActivity?: string[];
}

// ============================================
// AI USAGE TRACKING
// ============================================

export interface AIUsageStats {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  totalTokens: number;
  costUsd: number;
  responseTimeMs: number;
  cached: boolean;
}

export interface AIUsageLog extends AIUsageStats {
  id: string;
  userId: string;
  feature: string;
  model: string;
  createdAt: Date;
  estimateId?: string;
  chatSessionId?: string;
  proposalId?: string;
}

export interface AIFeatureUsageSummary {
  feature: string;
  totalRequests: number;
  totalCost: number;
  totalTokens: number;
  cacheHitRate: number;
  avgResponseTime: number;
}

// ============================================
// AI FEEDBACK
// ============================================

export type FeedbackRating = 'thumbs_up' | 'thumbs_down';

export interface AIFeedback {
  id: string;
  userId: string;
  feature: string;
  rating: FeedbackRating;
  comment?: string;
  usageLogId?: string;
  createdAt: Date;
}

// ============================================
// COST PREDICTION
// ============================================

export interface SimilarProject {
  id: string;
  name: string;
  similarity: number; // 0-100
  actualCost: number;
  adjustedCost: number; // inflation-adjusted
  completionDate: string;
}

export interface CostPrediction {
  prediction: {
    low: number;
    mid: number;
    high: number;
    confidence: number; // 0-100
  };
  similarProjects: SimilarProject[];
  costDrivers: string[];
  varianceFactors: string[];
  assumptions: string[];
}

// ============================================
// ANALYTICS INSIGHTS
// ============================================

export type InsightType = 'financial-overall' | 'financial-project' | 'budget' | 'materials' | 'schedule' | 'procurement';

export interface AnalyticsInsight {
  type: InsightType;
  insights: string; // Markdown formatted
  generatedAt: Date;
  projectId?: string;
}

// ============================================
// BUDGET INTELLIGENCE
// ============================================

export interface BudgetVariancePrediction {
  category: string;
  currentSpending: number;
  budgetedAmount: number;
  predictedFinalSpending: number;
  predictedVariance: number;
  variancePercentage: number;
  confidence: number; // 0-100
  projectionDate: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  trendDirection: 'increasing' | 'stable' | 'decreasing';
}

export interface CostAnomaly {
  id: string;
  category: string;
  transactionDate: string;
  amount: number;
  expectedRange: {
    min: number;
    max: number;
  };
  deviationPercentage: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  possibleCauses: string[];
  recommendation: string;
}

export interface SpendingPattern {
  category: string;
  timeframe: 'daily' | 'weekly' | 'monthly';
  averageSpending: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  volatility: number; // 0-100, higher = more volatile
  seasonalFactors?: {
    period: string;
    multiplier: number;
  }[];
  peakPeriods: string[];
  insights: string[];
}

export interface BudgetOptimizationRecommendation {
  id: string;
  category: string;
  type: 'reallocation' | 'reduction' | 'increase' | 'consolidation';
  priority: 'low' | 'medium' | 'high';
  currentAllocation: number;
  recommendedAllocation: number;
  potentialSavings: number;
  rationale: string;
  actionItems: string[];
  estimatedImpact: string;
  implementationComplexity: 'easy' | 'moderate' | 'complex';
}

export interface BudgetAlert {
  id: string;
  category: string;
  alertType: 'variance' | 'anomaly' | 'threshold' | 'prediction';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  triggeredAt: string;
  thresholdValue?: number;
  currentValue?: number;
  recommendedActions: string[];
  acknowledged: boolean;
}

export interface BudgetIntelligenceAnalysis {
  projectId: string;
  generatedAt: string;
  variancePredictions: BudgetVariancePrediction[];
  anomalies: CostAnomaly[];
  spendingPatterns: SpendingPattern[];
  optimizationRecommendations: BudgetOptimizationRecommendation[];
  alerts: BudgetAlert[];
  overallHealthScore: number; // 0-100
  summary: {
    totalBudget: number;
    totalSpent: number;
    projectedFinalCost: number;
    projectedVariance: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

// ============================================
// ERROR TYPES
// ============================================

export interface AIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class RateLimitError extends Error {
  constructor(
    public remaining: number,
    public resetAt: Date,
    public limit: number
  ) {
    super(`Rate limit exceeded. Try again after ${resetAt.toISOString()}`);
    this.name = 'RateLimitError';
  }
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: 'anthropic' | 'openai' | 'ocr',
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}
