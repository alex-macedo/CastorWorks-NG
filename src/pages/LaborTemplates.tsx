import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSimpleBudgetLaborTemplate } from "@/hooks/useSimpleBudgetLaborTemplate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Loader2 } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useRouteTranslations } from "@/hooks/useRouteTranslations";
import { formatCurrency } from "@/utils/materialsCalculator";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { TemplateCard } from "@/components/Templates/TemplateCard";
import { TemplateCenterHeader } from "@/components/Templates/TemplateCenterHeader";

export default function LaborTemplates() {
  const { t, language, currency } = useLocalization();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  useRouteTranslations();

  const [isDuplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [sourceTemplateId, setSourceTemplateId] = useState<string | null>(null);

  const { data: rolesData } = useUserRoles();
  const roles = rolesData?.map(r => r.role);
  const canEdit = roles?.includes('admin') || roles?.includes('project_manager');

  const { laborItems, isLoading } = useSimpleBudgetLaborTemplate();

  const duplicateLaborTemplateMutation = useMutation({
    mutationFn: async ({ sourceTemplateId, newTemplateName }: { sourceTemplateId: string, newTemplateName: string }) => {
      const { data, error } = await supabase.rpc('duplicate_labor_template', {
        p_source_template_id: sourceTemplateId,
        p_new_template_name: newTemplateName,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("materials:notifications.templateDuplicated"),
      });
      queryClient.invalidateQueries({ queryKey: ["project_labor"] });
      setDuplicateDialogOpen(false);
      setNewTemplateName("");
    },
    onError: (error: any) => {
      toast({
        title: t("common.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateNewTemplate = () => {
    setSourceTemplateId('default');
    setNewTemplateName(t("materials:laborTemplateCopyName", "Copy of Labor Template"));
    setDuplicateDialogOpen(true);
  };
  
  const handleCopyTemplate = (templateId: string) => {
    setSourceTemplateId(templateId);
    setNewTemplateName(t("materials:laborTemplateCopyName", "Copy of Labor Template"));
    setDuplicateDialogOpen(true);
  };

  const handleConfirmDuplicate = () => {
    if (sourceTemplateId && newTemplateName) {
      duplicateLaborTemplateMutation.mutate({ sourceTemplateId, newTemplateName });
    }
  };

  // Calculate totals
  const laborTotal = useMemo(() => {
    return laborItems.reduce((total, item: any) => total + (item.total_value || 0), 0);
  }, [laborItems]);

  const laborTemplate = {
    id: "simplebudget-labor-template",
    name: t("materials:laborTemplateName", "Labor Template"),
    description: t("materials:laborTemplateDescription", "Default template for labor items"),
    itemsCount: laborItems.length,
    total: laborTotal,
    is_default: true,
  };

  const handleViewTemplate = () => {
    navigate(`/materials-labor/view?section=labor`);
  };

  const handleEditTemplate = () => {
    navigate(`/materials-labor/edit?section=labor`);
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6">
        <SidebarHeaderShell variant="auto">
          <Skeleton className="h-12 w-64" />
        </SidebarHeaderShell>
        <div className="px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell variant="auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("materials:laborTemplatesTitle", "Labor Templates")}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80 mt-2">
              {t("materials:laborTemplatesSubtitle", "Manage standard labor rates and items for projects")}
            </p>
          </div>
          {canEdit && (
            <Button
              variant="glass-style-white"
              onClick={handleCreateNewTemplate}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("materials:createNewTemplate", "Create Template")}
            </Button>
          )}
        </div>
      </SidebarHeaderShell>

      {/* Template Center Header */}
      <div className="px-4 md:px-8">
        <TemplateCenterHeader
          title={t('templates:centerTitle', 'Central de Templates')}
          subtitle={t('materials:manageLaborTemplate', 'Manage labor templates for your projects')}
        />
      </div>

      {/* Templates Grid - 3 columns */}
      <div className="px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Create New Card */}
          {canEdit && (
            <TemplateCard
              id="create-new"
              name={t('templates:createNew', 'Começar do zero')}
              description={t('templates:createNewDescription', 'Create a new labor template')}
              type="labor"
              variant="create"
              onUse={handleCreateNewTemplate}
            />
          )}
          
          {/* Labor Template Card */}
          <TemplateCard
            id={laborTemplate.id}
            name={laborTemplate.name}
            description={laborTemplate.description}
            type="labor"
            isDefault={laborTemplate.is_default}
            onEdit={handleEditTemplate}
            onUse={handleViewTemplate}
            onView={handleViewTemplate}
            onDuplicate={handleCreateNewTemplate}
            category={t("materials:labor", "LABOR")}
            imageUrl="/images/templates/labor-template.jpg"
          />
        </div>
      </div>

      <AlertDialog open={isDuplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("materials:duplicateTemplateTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("materials:duplicateTemplateDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder={t("materials:newTemplateNamePlaceholder")}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDuplicate} disabled={duplicateLaborTemplateMutation.isPending}>
              {duplicateLaborTemplateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.duplicate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
