/**
 * CastorWorks INSS Obra Module - TypeScript Types
 * Brazilian Construction Tax Compliance Types
 */

// ============================================================================
// ENUMERATIONS
// ============================================================================

/** Owner type: PF (Individual) or PJ (Company) */
export type TaxOwnerType = 'PF' | 'PJ';

/** Construction category */
export type TaxWorkCategory =
  | 'OBRA_NOVA'      // New construction
  | 'ACRESCIMO'      // Addition/extension
  | 'REFORMA'        // Renovation (65% reduction)
  | 'DEMOLICAO';     // Demolition (90% reduction)

/** Construction type */
export type TaxConstructionType =
  | 'ALVENARIA'      // Masonry (40% labor)
  | 'MISTA'          // Mixed (30% labor)
  | 'MADEIRA'        // Wood (30% labor)
  | 'PRE_MOLDADO'    // Pre-fabricated (12% labor)
  | 'METALICA';      // Metallic/Steel Frame (18% labor)

/** Building destination */
export type TaxDestination =
  | 'CASA_POPULAR'
  | 'RESIDENCIAL_UNIFAMILIAR'
  | 'RESIDENCIAL_MULTIFAMILIAR'
  | 'COMERCIAL'
  | 'CONJUNTO_HABITACIONAL'
  | 'GALPAO_INDUSTRIAL'
  | 'EDIFICIO_GARAGENS';

/** Tax project status */
export type TaxProjectStatus =
  | 'DRAFT'
  | 'PLANNING'
  | 'IN_PROGRESS'
  | 'READY_FOR_SERO'
  | 'SERO_DONE'
  | 'LIABILITY_OPEN'
  | 'PARCELADO'
  | 'PAID'
  | 'CLOSED';

/** Payment status */
export type TaxPaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'OVERDUE'
  | 'PARCELADO'
  | 'CANCELLED';

/** Document type */
export type TaxDocumentType =
  | 'PROJETO_ARQUITETONICO'
  | 'MEMORIAL_DESCRITIVO'
  | 'ALVARA_CONSTRUCAO'
  | 'HABITE_SE'
  | 'ART_RRT'
  | 'NF_MATERIAL'
  | 'NF_SERVICO'
  | 'NF_PRE_MOLDADO'
  | 'COMPROVANTE_PAGAMENTO'
  | 'CONTRATO_TRABALHO'
  | 'DARF'
  | 'DCTFWEB_RECIBO'
  | 'CND'
  | 'CPEND'
  | 'OUTROS';

/** Alert type */
export type TaxAlertType =
  | 'DCTFWEB_DUE'
  | 'DARF_DUE'
  | 'SERO_UPDATE_NEEDED'
  | 'DOCUMENT_MISSING'
  | 'AREA_BOUNDARY_WARNING'
  | 'DECADENCIA_OPPORTUNITY'
  | 'PARCELAMENTO_DUE'
  | 'CND_EXPIRING';

/** Alert severity */
export type TaxAlertSeverity = 'INFO' | 'WARNING' | 'URGENT' | 'CRITICAL';

/** Brazilian state codes */
export type BrazilianState =
  | 'AC' | 'AL' | 'AP' | 'AM' | 'BA' | 'CE' | 'DF' | 'ES'
  | 'GO' | 'MA' | 'MT' | 'MS' | 'MG' | 'PA' | 'PB' | 'PR'
  | 'PE' | 'PI' | 'RJ' | 'RN' | 'RS' | 'RO' | 'RR' | 'SC'
  | 'SP' | 'SE' | 'TO';

// ============================================================================
// DATABASE ENTITIES
// ============================================================================

/** Tax project configuration linked to CastorWorks project */
export interface TaxProject {
  id: string;
  project_id: string;

  // CNO Registration
  cno_number: string | null;
  cno_registered_at: string | null;

  // Owner Information
  owner_type: TaxOwnerType;
  owner_document: string | null;
  pj_has_accounting: boolean | null;

  // Area Information
  area_main: number;
  area_complementary: number;
  area_total: number; // Computed column

  // Construction Classification
  category: TaxWorkCategory;
  construction_type: TaxConstructionType;
  destination: string;

  // Location
  state_code: BrazilianState;
  municipality: string | null;

  // Dates
  start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;

  // Status
  status: TaxProjectStatus;

  // Strategy Service
  has_strategy_service: boolean;

  // Metadata
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Tax estimate calculation result */
export interface TaxEstimate {
  id: string;
  tax_project_id: string;

  // VAU Reference
  vau_used: number;
  vau_reference_date: string;

  // Calculation Breakdown
  cod: number;
  rmt_base: number;

  // Reductions Applied
  fator_social: number | null;
  category_reduction: number | null;
  pre_moldados_applied: boolean;

  // Final Values
  rmt_final: number;
  labor_deductions: number;

  // INSS Results
  inss_estimate: number;
  inss_without_strategy: number;
  potential_savings: number; // Computed column

  // Planned Scenario (prevents regression - stores calculated monthly payment)
  construction_months: number | null;
  planned_total_inss: number | null;
  planned_monthly_payment: number | null;
  planned_total_savings: number | null;
  planned_savings_percentage: number | null;

  // ISS
  iss_estimate: number | null;

  // Metadata
  calculation_method: string;
  confidence_score: number;
  assumptions: Record<string, unknown>;
  notes: string | null;
  calculated_at: string;
  calculated_by: string | null;
}

/** Specific step in the tax compliance lifecycle */
export interface TaxGuideStep {
  id: string;
  tax_project_id: string;
  step_order: number;
  summary: string;
  description: string | null;
  external_url: string | null;
  due_date: string | null;
  attachment_url: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Monthly SERO/DCTFWeb submission */
export interface TaxSubmission {
  id: string;
  tax_project_id: string;

  // Reference Period
  reference_month: string; // YYYY-MM format

  // SERO Status
  sero_submitted: boolean;
  sero_submission_date: string | null;
  sero_receipt: string | null;

  // DCTFWeb Status
  dctfweb_submitted: boolean;
  dctfweb_transmission_date: string | null;
  dctfweb_receipt_number: string | null;

  // Declared Values
  labor_amount_declared: number | null;
  materials_documented: number | null;
  inss_calculated: number | null;

  // Metadata
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Tax payment record */
export interface TaxPayment {
  id: string;
  tax_project_id: string;

  // Payment Details
  tax_type: 'INSS' | 'ISS';
  reference_period: string | null;
  amount: number;

  // Due Date Tracking
  due_date: string;
  payment_date: string | null;

  // DARF Information
  darf_number: string | null;
  darf_receipt_url: string | null;

  // Status
  status: TaxPaymentStatus;

  // Parcelamento Info
  is_parcelado: boolean;
  parcelamento_number: string | null;
  installment_number: number | null;
  total_installments: number | null;

  // Metadata
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Tax document */
export interface TaxDocument {
  id: string;
  tax_project_id: string;

  // Document Information
  document_type: TaxDocumentType;
  title: string;
  description: string | null;

  // File Storage
  file_path: string;
  file_url: string | null;

  // Document Metadata
  document_date: string | null;
  document_value: number | null;
  issuer: string | null;

  // Verification
  verified: boolean;
  verified_at: string | null;
  verified_by: string | null;

  // Metadata
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  uploaded_by: string | null;
}

/** VAU reference value */
export interface TaxVauReference {
  id: string;
  ref_month: string;
  state_code: BrazilianState;
  destination_code: string;
  vau_value: number;
  source_note: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Tax alert */
export interface TaxAlert {
  id: string;
  tax_project_id: string;

  // Alert Information
  alert_type: TaxAlertType;
  severity: TaxAlertSeverity;
  message: string;

  // Due Date
  due_date: string | null;

  // Status
  acknowledged: boolean;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved: boolean;
  resolved_at: string | null;

  // Metadata
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// INPUT TYPES (for mutations)
// ============================================================================

export interface CreateTaxProjectInput {
  project_id: string;
  owner_type: TaxOwnerType;
  owner_document?: string;
  pj_has_accounting?: boolean;
  area_main: number;
  area_complementary?: number;
  category?: TaxWorkCategory;
  construction_type?: TaxConstructionType;
  destination?: string;
  state_code: BrazilianState;
  municipality?: string;
  start_date?: string;
  expected_end_date?: string;
  has_strategy_service?: boolean;
  notes?: string;
}

export interface UpdateTaxProjectInput {
  id: string;
  cno_number?: string;
  cno_registered_at?: string;
  owner_type?: TaxOwnerType;
  owner_document?: string;
  pj_has_accounting?: boolean;
  area_main?: number;
  area_complementary?: number;
  category?: TaxWorkCategory;
  construction_type?: TaxConstructionType;
  destination?: string;
  state_code?: BrazilianState;
  municipality?: string;
  start_date?: string;
  expected_end_date?: string;
  actual_end_date?: string;
  status?: TaxProjectStatus;
  has_strategy_service?: boolean;
  notes?: string;
}

export interface CreateTaxSubmissionInput {
  tax_project_id: string;
  reference_month: string;
  sero_submitted?: boolean;
  sero_submission_date?: string;
  sero_receipt?: string;
  dctfweb_submitted?: boolean;
  dctfweb_transmission_date?: string;
  dctfweb_receipt_number?: string;
  labor_amount_declared?: number;
  materials_documented?: number;
  inss_calculated?: number;
  notes?: string;
}

export interface CreateTaxPaymentInput {
  tax_project_id: string;
  tax_type: 'INSS' | 'ISS';
  reference_period?: string;
  amount: number;
  due_date: string;
  darf_number?: string;
  notes?: string;
}

export interface RecordPaymentInput {
  id: string;
  payment_date: string;
  darf_receipt_url?: string;
  notes?: string;
}

export interface UploadTaxDocumentInput {
  tax_project_id: string;
  document_type: TaxDocumentType;
  title: string;
  description?: string;
  file_path: string;
  document_date?: string;
  document_value?: number;
  issuer?: string;
  tags?: string[];
}

// ============================================================================
// CALCULATOR TYPES
// ============================================================================

/** Input parameters for INSS calculation */
export interface INSSCalculatorParams {
  area: number;
  state: BrazilianState;
  ownerType: TaxOwnerType;
  category: TaxWorkCategory;
  constructionType: TaxConstructionType;
  destination: TaxDestination;
  laborDeductions?: number;
  usesUsinados?: boolean;
  usesPrefab?: boolean;
  prefabInvoiceValue?: number;
  vauOverride?: number;
  /** Actual completion date of the work (for Decadência check) */
  actualEndDate?: string | null;
  /** Start date of the work (for Partial Decadência check) */
  startDate?: string | null;
  /** Current date for calculation (defaults to now) */
  calculationDate?: string;
  /** Municipal ISS rate (0.02 to 0.05) */
  issRate?: number;
  /** Documented material costs for ISS deduction */
  issMaterialDeduction?: number;
  /** Total remuneration paid via DCTFWeb/eSocial */
  totalRemunerationPaid?: number;
  /** Number of months construction has been active */
  constructionMonths?: number;
  /** Number of monthly DCTFWeb submissions made */
  monthlyDCTFWebSubmissions?: number;
}

/** INSS calculation result */
export interface INSSCalculatorResult {
  cod: number;
  rmtBase: number;
  rmtFinal: number;
  baseCalculo: number;
  fatorSocial: number | null;
  categoryReduction: number;
  prefabReduction: number;
  readyMixDeduction: number;
  fatorAjusteReduction: number;
  popularHousingReduction: number;
  decadenciaReduction: number;
  inssEstimate: number;
  inssWithoutStrategy: number;
  savings: number;
  savingsPercentage: number;
  /** Whether the debt has expired (statute of limitations) */
  isDecadencia: boolean;
  /** ISS estimate result */
  issEstimate: number | null;
  /** Simulation of installment payment options */
  installments?: {
    totalValue: number;
    monthlyValue: number;
    count: number;
    isInterestFree: boolean;
  };
  /** Optimized scenario based on monthly planning (GFIP/eSocial route) */
  plannedScenario?: {
    totalINSS: number;
    monthlyPayment: number;
    totalSavings: number;
    savingsPercentage: number;
    recommendation: string;
  };
  breakdown: {
    vauUsed: number;
    equivalenceFactor: number;
    laborPercentage: number;
    categoryMultiplier: number;
    inssRate: number;
    yearsSinceCompletion?: number;
    issRateUsed?: number;
    issBase?: number;
  };
}

/** INSS Calculation Report Structure for UI and PDF */
export interface INSSCalculationReport {
  summary: {
    grossINSS: number;
    totalReductions: number;
    netINSS: number;
    savingsPercentage: number;
  };
  breakdown: {
    cod: number;
    rmt: number;
    fatorSocialApplied: number;
    categoryReduction: number;
    prefabReduction: number;
    readyMixDeduction: number;
    fatorAjusteEligible: boolean;
    decadenciaApplied: number;
    previousDeductions: number;
    finalBaseCalculo: number;
  };
  compliance: {
    cnoRegistered: boolean;
    eSocialCompliant: boolean;
    dctfWebMonthlySubmitted: boolean;
    fatorAjusteRequirementsMet: boolean;
  };
  recommendations: string[];
  requiredDocuments: string[];
  legalReferences: string[];
}

// ============================================================================
// UI TYPES
// ============================================================================

/** Tax dashboard summary */
export interface TaxDashboardSummary {
  currentEstimate: TaxEstimate | null;
  submissionsStatus: Array<{
    month: string;
    seroComplete: boolean;
    dctfwebComplete: boolean;
  }>;
  pendingPayments: TaxPayment[];
  documentsStatus: Array<{
    type: TaxDocumentType;
    required: boolean;
    uploaded: boolean;
    verified: boolean;
  }>;
  alerts: TaxAlert[];
  totalSavings: number;
}

/** Fator Social boundary warning */
export interface FatorSocialWarning {
  currentArea: number;
  currentFactor: number;
  nearestBoundary: number;
  potentialFactor: number;
  potentialSavings: number;
  recommendation: string;
}
