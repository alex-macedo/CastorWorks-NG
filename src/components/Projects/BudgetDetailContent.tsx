import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BudgetEditor } from "@/components/Templates/ProjectBudgetTemplates/BudgetEditor";
import { BudgetHelpButton } from "@/components/Templates/ProjectBudgetTemplates/BudgetHelp";
import { useLocalization } from "@/contexts/LocalizationContext";
import { supabase } from "@/integrations/supabase/client";

import { useProject } from "@/hooks/useProjects";

interface BudgetDetailContentProps {
  projectId: string;
  budgetId: string;
  project?: any;
  showBackButton?: boolean;
  onBack?: () => void;
}

export const BudgetDetailContent = ({
  projectId,
  budgetId,
  project: providedProject,
  showBackButton = true,
  onBack,
}: BudgetDetailContentProps) => {
  const { t, loadTranslationsForRoute } = useLocalization();

  useEffect(() => {
    loadTranslationsForRoute('/projects/:projectId/budgets/:budgetId');
  }, [loadTranslationsForRoute]);

  const { data: budget, isLoading: isLoadingBudget, error } = useQuery({
    queryKey: ['project-budgets', budgetId],
    queryFn: async () => {
      if (!budgetId) throw new Error('Budget ID is required');

      const { data, error } = await supabase
        .from('project_budgets')
        .select('*')
        .eq('id', budgetId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!budgetId,
  });

  const { project, isLoading: isLoadingProject } = useProject(providedProject ? undefined : projectId);

  const resolvedProject = providedProject ?? project;
  const isLoading = isLoadingBudget || (!providedProject && isLoadingProject);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (error || !budget) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-destructive">
              {t('budgets:errors.loadingFailed')}
            </p>
            {showBackButton && onBack && (
              <Button onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common.back')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const budgetData = budget as any;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {showBackButton && onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {budgetData.name}
              </h1>
            </div>
          </div>
          {budgetData.description && (
            <p className={showBackButton ? "text-muted-foreground ml-11" : "text-muted-foreground"}>
              {budgetData.description}
            </p>
          )}
        </div>

        <BudgetHelpButton />
      </div>

      {projectId && budgetId && (
        <BudgetEditor budgetId={budgetId} projectId={projectId} budget={budget} project={resolvedProject} />
      )}
    </div>
  );
};
