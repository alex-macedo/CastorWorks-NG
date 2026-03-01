// Finance domain types for CastorWorks Financial Module
// These types align with the planned database schema (Phase 1)
// and will be reconciled with Supabase generated types after migration deployment.

// ─── Enums ──────────────────────────────────────────────────

export type FinancialAccountType = 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment'

export type ARInvoiceStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'disputed'

export type APBillStatus =
  | 'pending'
  | 'approved'
  | 'scheduled'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'disputed'

export type PaymentEventType =
  | 'payment_received'
  | 'payment_sent'
  | 'refund'
  | 'adjustment'
  | 'fee'
  | 'interest'

export type ReconciliationStatus = 'pending' | 'matched' | 'unmatched' | 'disputed' | 'resolved'

export type AIActionStatus =
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'expired'

export type AIActionType =
  | 'collection_reminder'
  | 'payment_schedule'
  | 'cashflow_alert'
  | 'margin_warning'
  | 'reconciliation_match'
  | 'budget_reallocation'
  | 'risk_escalation'

export type AIActionMode = 'advice_only' | 'approval_required' | 'semi_auto'

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'very_high'

// ─── Financial Accounts ─────────────────────────────────────

export interface FinancialAccount {
  id: string
  company_id: string
  name: string
  account_type: FinancialAccountType
  bank_name: string | null
  account_number: string | null
  agency: string | null
  current_balance: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FinancialAccountInsert {
  company_id: string
  name: string
  account_type: FinancialAccountType
  bank_name?: string | null
  account_number?: string | null
  agency?: string | null
  current_balance?: number
  currency?: string
  is_active?: boolean
}

// ─── AR Invoices (Accounts Receivable) ──────────────────────

export interface FinancialARInvoice {
  id: string
  project_id: string
  account_id: string | null
  invoice_number: string
  client_name: string
  client_email: string | null
  status: ARInvoiceStatus
  issue_date: string
  due_date: string
  amount: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  currency: string
  description: string | null
  notes: string | null
  collection_stage: number
  last_collection_date: string | null
  days_overdue: number
  late_payment_probability: number | null
  created_by: string
  created_at: string
  updated_at: string
  // Joined fields
  projects?: { name: string } | null
  financial_accounts?: { name: string } | null
}

export interface FinancialARInvoiceInsert {
  project_id: string
  account_id?: string | null
  invoice_number: string
  client_name: string
  client_email?: string | null
  status?: ARInvoiceStatus
  issue_date: string
  due_date: string
  amount: number
  tax_amount?: number
  total_amount: number
  amount_paid?: number
  currency?: string
  description?: string | null
  notes?: string | null
}

// ─── AP Bills (Accounts Payable) ────────────────────────────

export interface FinancialAPBill {
  id: string
  project_id: string
  account_id: string | null
  bill_number: string
  vendor_name: string
  vendor_cnpj: string | null
  status: APBillStatus
  issue_date: string
  due_date: string
  amount: number
  tax_amount: number
  total_amount: number
  amount_paid: number
  currency: string
  category: string | null
  cost_code_id: string | null
  phase_id: string | null
  description: string | null
  notes: string | null
  risk_score: number | null
  days_until_due: number
  created_by: string
  created_at: string
  updated_at: string
  // Joined fields
  projects?: { name: string } | null
  financial_accounts?: { name: string } | null
}

export interface FinancialAPBillInsert {
  project_id: string
  account_id?: string | null
  bill_number: string
  vendor_name: string
  vendor_cnpj?: string | null
  status?: APBillStatus
  issue_date: string
  due_date: string
  amount: number
  tax_amount?: number
  total_amount: number
  amount_paid?: number
  currency?: string
  category?: string | null
  cost_code_id?: string | null
  phase_id?: string | null
  description?: string | null
  notes?: string | null
}

// ─── Payment Events ─────────────────────────────────────────

export interface FinancialPaymentEvent {
  id: string
  ar_invoice_id: string | null
  ap_bill_id: string | null
  account_id: string | null
  event_type: PaymentEventType
  amount: number
  currency: string
  payment_date: string
  payment_method: string | null
  reference: string | null
  notes: string | null
  created_by: string
  created_at: string
}

export interface FinancialPaymentEventInsert {
  ar_invoice_id?: string | null
  ap_bill_id?: string | null
  account_id?: string | null
  event_type: PaymentEventType
  amount: number
  currency?: string
  payment_date: string
  payment_method?: string | null
  reference?: string | null
  notes?: string | null
}

// ─── Reconciliation Items ───────────────────────────────────

export interface FinancialReconciliationItem {
  id: string
  account_id: string
  payment_event_id: string | null
  external_reference: string | null
  external_date: string | null
  external_amount: number | null
  external_description: string | null
  status: ReconciliationStatus
  match_confidence: number | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

// ─── Cashflow Snapshots ─────────────────────────────────────

export interface FinancialCashflowSnapshot {
  id: string
  project_id: string | null
  week_start_date: string
  week_number: number
  projected_inflow: number
  projected_outflow: number
  projected_balance: number
  actual_inflow: number | null
  actual_outflow: number | null
  actual_balance: number | null
  confidence_level: number
  risk_level: RiskLevel
  generated_at: string
  generated_by: string | null
  created_at: string
}

// ─── AI Action Queue ────────────────────────────────────────

export interface FinancialAIAction {
  id: string
  company_id: string
  project_id: string | null
  action_type: AIActionType
  action_mode: AIActionMode
  status: AIActionStatus
  title: string
  description: string
  rationale: string
  confidence: number
  risk_level: RiskLevel
  priority: number
  payload: Record<string, unknown>
  proposed_by: string
  proposed_at: string
  approved_by: string | null
  approved_at: string | null
  executed_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface FinancialAIActionInsert {
  company_id: string
  project_id?: string | null
  action_type: AIActionType
  action_mode?: AIActionMode
  title: string
  description: string
  rationale: string
  confidence: number
  risk_level?: RiskLevel
  priority?: number
  payload?: Record<string, unknown>
  expires_at?: string | null
}

// ─── AI Action Logs (immutable audit) ───────────────────────

export interface FinancialAIActionLog {
  id: string
  action_id: string
  event_type: string
  actor_id: string
  actor_role: string
  details: Record<string, unknown>
  created_at: string
}

// ─── Computed / Aggregated Types (for UI) ───────────────────

export interface CashflowWeekProjection {
  weekLabel: string
  weekNumber: number
  startDate: string
  endDate: string
  projectedInflow: number
  projectedOutflow: number
  projectedBalance: number
  actualInflow?: number
  actualOutflow?: number
  actualBalance?: number
  confidence: number
  riskLevel: RiskLevel
}

export interface CashflowForecast {
  weeks: CashflowWeekProjection[]
  currentBalance: number
  lowestProjectedBalance: number
  lowestBalanceWeek: number
  totalProjectedInflow: number
  totalProjectedOutflow: number
  riskWindows: CashflowRiskWindow[]
}

export interface CashflowRiskWindow {
  startWeek: number
  endWeek: number
  riskLevel: RiskLevel
  description: string
  projectedShortfall: number
  suggestedActions: string[]
}

export interface ARAgingSummary {
  current: number
  days1to30: number
  days31to60: number
  days61to90: number
  days90plus: number
  totalOutstanding: number
  totalOverdue: number
  averageDSO: number
  invoiceCount: number
}

export interface APDueRiskSummary {
  dueThisWeek: number
  dueNextWeek: number
  dueThisMonth: number
  overdue: number
  totalPending: number
  highRiskCount: number
  averageDaysPayable: number
  billCount: number
}

export interface ProjectMarginBridge {
  projectId: string
  projectName: string
  budgeted: number
  actualRevenue: number
  actualCost: number
  margin: number
  marginPercent: number
  variance: number
  variancePercent: number
  riskLevel: RiskLevel
  topLeakageCategories: Array<{
    category: string
    amount: number
    percent: number
  }>
}

// ─── AI Recommendation Types ────────────────────────────────

export interface FinancialActionRecommendation {
  id: string
  actionType: AIActionType
  title: string
  description: string
  confidence: number
  confidenceLevel: ConfidenceLevel
  riskLevel: RiskLevel
  rationale: string
  topDrivers: string[]
  suggestedActions: string[]
  estimatedImpact: string
  priority: number
  expiresAt: string | null
}

export interface CollectionPlaybookStep {
  stage: number
  name: string
  description: string
  daysAfterDue: number
  channel: 'email' | 'phone' | 'letter' | 'legal'
  template: string | null
  isAutomatable: boolean
}

export interface ReconciliationMatchCandidate {
  reconciliationItemId: string
  paymentEventId: string
  confidence: number
  matchReasons: string[]
  amountDifference: number
}

export interface FinancialPolicyRule {
  id: string
  name: string
  description: string
  actionType: AIActionType
  maxAmount: number | null
  requiredRole: string | null
  autoApprove: boolean
  conditions: Record<string, unknown>
}
