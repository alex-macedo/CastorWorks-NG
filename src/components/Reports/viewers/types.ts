import type { Database } from '@/integrations/supabase/types';
import React from 'react';

export type Project = Database['public']['Tables']['projects']['Row'];
export type BudgetItem = Database['public']['Tables']['project_budget_items']['Row'];
export type FinancialEntry = Database['public']['Tables']['project_financial_entries']['Row'];
export type Material = Database['public']['Tables']['project_materials']['Row'];
export type CompanySettings = Database['public']['Tables']['company_settings']['Row'];

export interface ReportData {
  project: Project;
  budgetItems: BudgetItem[];
  financialEntries: FinancialEntry[];
  materials: Material[];
  companySettings: CompanySettings | null;
}

export interface ReportViewProps {
  data: ReportData;
}

export type ReportViewComponent = React.FC<ReportViewProps>;

export type ReportType =
  | 'projectStatus'
  | 'financialSummary'
  | 'budgetVsActual'
  | 'cashFlow'
  | 'profitability'
  | 'materialsUsage'
  | 'budget'
  | 'materials'
  | 'projectDashboard';
