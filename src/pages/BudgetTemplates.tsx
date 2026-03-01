import { useState, useEffect } from "react";
import { Plus, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useBudgetTemplates } from "@/hooks/useBudgetTemplates";
import { BudgetTemplateForm } from "@/components/Financial/Templates/BudgetTemplateForm";
import { TemplateCard } from "@/components/Templates/TemplateCard";
import { TemplateCenterHeader } from "@/components/Templates/TemplateCenterHeader";
import { ImportTemplateDialog } from "@/components/Financial/Templates/ImportTemplateDialog";
import { useToast } from "@/hooks/use-toast";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/utils/formatters";
import { formatDateSystem } from "@/utils/dateSystemFormatters";

// Local type definition
interface BudgetTemplate {
  id: string;
  name: string;
  description?: string;
  budget_type: 'simple' | 'cost_control';
  is_public?: boolean;
  is_default?: boolean;
  is_system?: boolean;
  total_budget_amount?: number;
  created_at?: string;
}

const BudgetTemplates = () => {
  const navigate = useNavigate();
  
  const { t, currency, loadTranslationsForRoute } = useLocalization();
  const { toast } = useToast();
  const { data: profile } = useUserProfile();

  // Load translations for this route
  useEffect(() => {
    loadTranslationsForRoute('/budget-templates');
  }, [loadTranslationsForRoute]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const companyId = profile?.company_id;
  const { templates, isLoading, createTemplate, deleteTemplate, duplicateTemplate } = useBudgetTemplates(companyId);

  const { data: rolesData } = useUserRoles();
  const roles = rolesData?.map(r => r.role);
  const canEdit = roles?.includes('admin') || roles?.includes('project_manager');

  const getBudgetTypeLabel = (type: string) => {
    return type === 'simple'
      ? t('templates:type.simple', 'Simple')
      : t('templates:type.costControl', 'Cost Control');
  };

  const handleCreateTemplate = async (data: any) => {
    if (!companyId) return;

    return createTemplate.mutateAsync(
      { ...data, company_id: companyId },
      {
        onSuccess: () => {
          setIsFormOpen(false);
          toast({
            title: t('common.success'),
            description: t('templates:title') + ' ' + t('common.created'),
          });
        },
        onError: (error) => {
          toast({
            title: t('common.errorTitle'),
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleEditTemplate = (template: BudgetTemplate) => {
    navigate(`/budget-templates/${template.id}/edit`, { state: { template } });
  };

  const handleDeleteTemplate = async (templateId: string) => {
    return deleteTemplate.mutateAsync(templateId, {
      onSuccess: () => {
        toast({
          title: t('common.success'),
          description: t('templates:title') + ' ' + t('common.deleted'),
        });
      },
      onError: (error) => {
        toast({
          title: t('common.errorTitle'),
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  const handleDuplicateTemplate = async (templateId: string) => {
    return duplicateTemplate.mutateAsync(templateId, {
      onSuccess: () => {
        toast({
          title: t('common.success'),
          description: t('templates:title') + ' ' + t('common.duplicated'),
        });
      },
      onError: (error) => {
        toast({
          title: t('common.errorTitle'),
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  const handleViewTemplate = (template: BudgetTemplate) => {
    navigate(`/budget-templates/${template.id}`, { state: { template } });
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6">
        <SidebarHeaderShell>
          <Skeleton className="h-12 w-64" />
        </SidebarHeaderShell>
        <div className="px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('templates:title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80 mt-2">
              {t('templates:description')}
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button
                variant="glass-style-white"
                onClick={() => setIsImportDialogOpen(true)}
              >
                <Download className="mr-2 h-4 w-4" />
                {t('templates:import', 'Import')}
              </Button>
              <Button
                variant="glass-style-white"
                onClick={() => setIsFormOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('templates:createNew')}
              </Button>
            </div>
          )}
        </div>
      </SidebarHeaderShell>

      {/* Template Center Header */}
      <div className="px-4 md:px-8">
        <TemplateCenterHeader
          title={t('templates:centerTitle', 'Central de Templates')}
          subtitle={t('templates:centerSubtitle', 'Manage your budget templates')}
        />
      </div>

      {/* Templates Grid - 3 columns */}
      <div className="px-4 md:px-8">
        {!templates || templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            {t('templates:noTemplates', 'No templates created yet')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Create New Card */}
            {canEdit && (
              <TemplateCard
                id="create-new"
                name={t('templates:createNew', 'Começar do zero')}
                description={t('templates:createNewDescription', 'Create a new template from scratch')}
                type="budget"
                variant="create"
                onUse={() => setIsFormOpen(true)}
              />
            )}
            
            {/* Template Cards */}
            {(templates as any[]).map((template: any) => (
               <TemplateCard
                 key={template.id}
                 id={template.id}
                 name={template.name}
                 description={template.description}
                 type="budget"
                 isDefault={template.is_default}
                 isSystem={template.is_system}
                 isPublic={template.is_public}
                 onEdit={() => handleEditTemplate(template)}
                 onUse={() => handleViewTemplate(template)}
                 onView={() => handleViewTemplate(template)}
                 onDelete={() => handleDeleteTemplate(template.id)}
                 onDuplicate={() => handleDuplicateTemplate(template.id)}
                 category={getBudgetTypeLabel(template.budget_type).toUpperCase()}
                 imageUrl={template.image_url}
               />
            ))}
          </div>
        )}
      </div>

      {/* Create Template Form */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {t('templates:createNew', 'Create New Template')}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <BudgetTemplateForm
              onSubmit={handleCreateTemplate}
              isLoading={createTemplate.isPending}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Import Template Dialog */}
      <ImportTemplateDialog
        open={isImportDialogOpen}
        onOpenChange={(open) => {
          setIsImportDialogOpen(open);
        }}
        onSuccess={() => {
          console.log('ImportTemplateDialog: Import successful, templates should refresh');
        }}
      />
    </div>
  );
};

export default BudgetTemplates;
