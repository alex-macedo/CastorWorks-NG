import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocalization } from "@/contexts/LocalizationContext";
import { supabase } from "@/integrations/supabase/client";
import { BudgetDetailContent } from "@/components/Projects/BudgetDetailContent";
import { Loader2, Plus } from "lucide-react";

interface BudgetTabContentProps {
  projectId: string;
  project?: any;
}

export function BudgetTabContent({ projectId, project }: BudgetTabContentProps) {
  const { t } = useLocalization();
  const navigate = useNavigate();

  // Check if project has budgets
  const { data: budgets, isLoading: budgetsLoading } = useQuery({
    queryKey: ['project-budgets', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_budgets')
        .select('id, name, budget_model, status, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Get the most recent budget (or primary budget)
  const budget = budgets?.[0];

  useEffect(() => {
    if (!budgetsLoading && !budget) {
      navigate(`/projects/${projectId}/budgets`);
    }
  }, [budget, budgetsLoading, navigate, projectId]);

  if (budgetsLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>{t('common.loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!budget) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground">{t('common.notFound')}</p>
            <Button onClick={() => navigate(`/projects/${projectId}/budgets`)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('budgets:create.title')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <BudgetDetailContent
      projectId={projectId}
      project={project}
      budgetId={budget.id}
      showBackButton={false}
    />
  );
}
