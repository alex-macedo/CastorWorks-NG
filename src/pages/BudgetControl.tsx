import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { BudgetOverview } from "@/components/Financial/BudgetOverview";
import { BudgetIntelligencePanel } from "@/components/Financial/BudgetIntelligencePanel";
import { FinancialEntryForm } from "@/components/Financial/FinancialEntryForm";
import { DashboardFilters } from "@/components/Dashboard/DashboardFilters";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useRouteTranslations } from "@/hooks/useRouteTranslations";
import { useProjects } from "@/hooks/useProjects";
import { TimePeriod } from "@/utils/dateFilters";
import { exportDashboardToPDF } from "@/utils/dashboardExport";
import { useToast } from "@/hooks/use-toast";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function BudgetControl() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { t } = useLocalization();
  const { toast } = useToast();
  const { projects } = useProjects();
  useRouteTranslations();

  const [filters, setFilters] = useState<{ period: TimePeriod; projectId?: string }>({
    period: 'month',
    projectId: undefined
  });

  const periodLabels = {
    month: t('dashboard.filters.thisMonth'),
    quarter: t('dashboard.filters.lastThreeMonths'),
    year: t('dashboard.filters.lastYear'),
    all: t('dashboard.filters.allTime')
  };
  const periodLabel = periodLabels[filters.period];
  const selectedProjectName = filters.projectId
    ? projects.find((p) => p.id === filters.projectId)?.name
    : t('dashboard.filters.allProjects');

  const handleExport = async () => {
    try {
      await exportDashboardToPDF('budget-control-content');
      toast({ title: t('budget:exportSuccess') });
    } catch (error) {
      toast({ title: t('budget:exportFailed'), description: t('budget:exportFailedDesc'), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6" id="budget-control-content">
      <SidebarHeaderShell variant="auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-sidebar-primary-foreground/80">{periodLabel}</p>
            <h1 className="text-3xl font-bold tracking-tight">{t('budget:title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">{t('budget:subtitle')}</p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-sidebar-primary-foreground/30 bg-sidebar-primary-foreground/10 px-3 py-1 text-xs font-semibold">
                {t('overallStatus.projectLabel')}: {selectedProjectName}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-sidebar-primary-foreground/30 bg-sidebar-primary-foreground/10 px-3 py-1 text-xs font-semibold">
                {t('overallStatus.periodLabel')}: {periodLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 min-w-[260px]">
            <div className="flex items-center gap-2">
              <Button
                variant="glass-style-white"
                onClick={() => setIsFormOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('budget:addExpense')}
              </Button>
            </div>
            <DashboardFilters
              period={filters.period}
              projectId={filters.projectId}
              projects={projects}
              onPeriodChange={(period) => setFilters({ ...filters, period })}
              onProjectChange={(projectId) => setFilters({ ...filters, projectId })}
              onReset={() => setFilters({ period: 'month', projectId: undefined })}
              onExport={handleExport}
            />
          </div>
        </div>
      </SidebarHeaderShell>

      <BudgetOverview period={filters.period} projectId={filters.projectId} />

      {/* Budget Intelligence - Phase 2 */}
      <BudgetIntelligencePanel projectId={filters.projectId} />

      <FinancialEntryForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        defaultType="expense"
      />
    </div>
  );
}
