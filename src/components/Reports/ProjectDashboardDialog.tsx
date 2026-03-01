import { ProjectDashboardReport } from './generators/ProjectDashboardReport';
import type { Database } from '@/integrations/supabase/types';
import { useLocalization } from '@/contexts/LocalizationContext';

type Project = Database['public']['Tables']['projects']['Row'];
type BudgetItem = Database['public']['Tables']['project_budget_items']['Row'];
type FinancialEntry = Database['public']['Tables']['project_financial_entries']['Row'];

interface ProjectDashboardDialogProps {
  project: Project;
  budgetItems: BudgetItem[];
  financialEntries: FinancialEntry[];
  companySettings?: {
    id?: string;
    company_name?: string;
    currency?: string;
    [key: string]: unknown;
  };
  onClose: () => void;
}

export function ProjectDashboardDialog({ 
  project, 
  budgetItems, 
  financialEntries, 
  companySettings,
  onClose 
}: ProjectDashboardDialogProps) {
  const { t } = useLocalization();

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-4 z-50 overflow-auto rounded-lg border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">{t('reports:dashboard.dialogTitle')} - {project.name}</h2>
          <button
            onClick={onClose}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <span className="sr-only">Close</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="max-h-[calc(100vh-8rem)] overflow-auto">
          <ProjectDashboardReport
            project={project}
            budgetItems={budgetItems}
            financialEntries={financialEntries}
            companySettings={companySettings}
          />
        </div>
        
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
{t('reports:dashboard.printButton')}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {t('reports:dashboard.closeButton')}
          </button>
        </div>
      </div>
    </div>
  );
}