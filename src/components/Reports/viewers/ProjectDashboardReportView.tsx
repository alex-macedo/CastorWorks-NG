import type { ReportViewProps } from './types';
import { ProjectDashboardReport } from '../generators/ProjectDashboardReport';

export function ProjectDashboardReportView({ data }: ReportViewProps) {
  return (
    <ProjectDashboardReport
      project={data.project}
      budgetItems={data.budgetItems}
      financialEntries={data.financialEntries}
      companySettings={data.companySettings || undefined}
    />
  );
}
