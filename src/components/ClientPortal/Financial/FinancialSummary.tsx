import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MetricCard } from '../Shared/MetricCard';
import { DollarSign, PieChart, TrendingUp, Info } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectFinancialSummary } from '@/hooks/clientPortal/useProjectFinancialSummary';

import { ClientPortalPageHeader } from '../Layout/ClientPortalPageHeader';

export function FinancialSummary() {
  const { t } = useLocalization();
  const { projectId } = useClientPortalAuth();
  const { summary, isLoading: summaryLoading } = useProjectFinancialSummary();

  // Fetch project name for title display
  const { data: project } = useQuery({
    queryKey: ['clientPortalProject', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      return data;
    },
    enabled: !!projectId,
  });

  if (summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const formatCurrencyValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const categories = summary.categoryBreakdown || [];

  const projName = project?.name || t("clientPortal.dashboard.loading");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ClientPortalPageHeader
        title={t("clientPortal.financial.title", { defaultValue: "Financial Overview" })}
        subtitle={t("clientPortal.financial.description")}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title={t("clientPortal.financial.totalBudget")}
          value={formatCurrencyValue(summary.totalProjectCost)}
          description={t("clientPortal.financial.approvedBudget")}
          icon={DollarSign}
        />
        <MetricCard
          title={t("clientPortal.financial.totalSpent")}
          value={formatCurrencyValue(summary.paid)}
          description={t("clientPortal.financial.percentOfBudget", { percent: summary.percentagePaid.toFixed(1) })}
          icon={TrendingUp}
        />
        <MetricCard
          title={t("clientPortal.financial.remaining")}
          value={formatCurrencyValue(summary.totalProjectCost - summary.paid)}
          description={t("clientPortal.financial.availableFunds")}
          icon={PieChart}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("clientPortal.financial.budgetBreakdown.title")}</CardTitle>
          <CardDescription>
            {t("clientPortal.financial.budgetBreakdown.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {categories.length > 0 ? (
            categories.map((category) => {
              const categoryPercent = (category.budgeted > 0) ? (category.spent / category.budgeted) * 100 : 
                                      (summary.totalProjectCost > 0) ? (category.spent / summary.totalProjectCost) * 100 : 0;
              
              // Try to translate the category name. If not found in budgetBreakdown, try common keys, then fallback to raw name
              const translatedName = t(`clientPortal.financial.budgetBreakdown.${category.name}`, { 
                defaultValue: t(`common.${category.name}`, { 
                  defaultValue: category.name.charAt(0).toUpperCase() + category.name.slice(1) 
                }) 
              });
              
              return (
                <div key={category.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{translatedName}</span>
                    <span className="text-muted-foreground">
                      {formatCurrencyValue(category.spent)} {category.budgeted > 0 ? `/ ${formatCurrencyValue(category.budgeted)}` : ''}
                    </span>
                  </div>
                  <Progress value={categoryPercent} className="h-2" />
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground italic">
              {t("clientPortal.financial.noExpensesFound", { defaultValue: "No expenses recorded yet." })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
