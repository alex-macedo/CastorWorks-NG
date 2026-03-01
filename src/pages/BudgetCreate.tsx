import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/Layout";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useToast } from "@/hooks/use-toast";
import { BudgetCreateForm } from "@/components/Templates/ProjectBudgetTemplates/BudgetCreateForm";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

const BudgetCreate = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { t, loadTranslationsForRoute } = useLocalization();
  const { toast } = useToast();

  // Load translations
  useEffect(() => {
    loadTranslationsForRoute('/projects/:projectId/budget');
  }, [loadTranslationsForRoute]);

  // Fetch project details including budget_model
  const { data: project, isLoading: isLoadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required');

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, budget_model')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const handleBudgetCreated = (budgetId: string) => {
    toast({
      title: t('common.success'),
      description: t('budgets:notifications.budgetCreated'),
    });
    // Navigate back to project details where the budget tab will now show content
    navigate(`/projects/${projectId}`);
  };

  const handleCancel = () => {
    navigate(`/projects/${projectId}`);
  };

  if (isLoadingProject) {
    return (
      <Container size="lg">
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container size="lg">
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-muted-foreground">{t('common.notFound')}</p>
              <Button onClick={() => navigate('/projects')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('common.back')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <div className="w-full space-y-6">
        {/* Header */}
        <SidebarHeaderShell>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {t('budgets:create.title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {project.name}
              </p>
            </div>
          </div>
        </SidebarHeaderShell>

        <p className="text-muted-foreground">
          {t('budgets:create.description')}
        </p>

        {/* Budget Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t('budgets:create.formTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetCreateForm
              projectId={projectId!}
              projectBudgetModel={project.budget_model}
              onSave={handleBudgetCreated}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </Container>
  );
};

export default BudgetCreate;