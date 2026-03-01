import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePhaseTemplates } from "@/hooks/usePhaseTemplates";
import { useUserRoles } from "@/hooks/useUserRoles";
import type { PhaseTemplate } from "@/types/phaseTemplate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useRouteTranslations } from "@/hooks/useRouteTranslations";
import { getLocalizedTemplate } from "@/utils/templateLocalization";
import { useToast } from "@/hooks/use-toast";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { TemplateCard } from "@/components/Templates/TemplateCard";
import { TemplateCenterHeader } from "@/components/Templates/TemplateCenterHeader";
import {
   AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function PhaseTemplates() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const { toast } = useToast();
  useRouteTranslations();
  
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { templates, isLoading, deleteTemplate } = usePhaseTemplates();
  const { data: rolesData } = useUserRoles();
  const roles = rolesData?.map(r => r.role);

  const canEdit = roles?.includes('admin') || roles?.includes('project_manager');

  const handleNewTemplate = () => {
    navigate('/phase-templates/new');
  };

  const handleViewTemplate = (templateId: string) => {
    navigate(`/phase-templates/${templateId}`);
  };

  const handleEditTemplate = (templateId: string) => {
    navigate(`/phase-templates/${templateId}/edit`);
  };

  const handleDuplicateTemplate = async (templateId: string) => {
    setTimeout(() => {
      toast({
        title: t("common.info"),
        description: "Duplicate functionality coming soon",
      });
    }, 500);
  };

  const handleDeleteTemplate = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    deleteTemplate.mutate(deleteConfirm, {
      onSuccess: () => {
        toast({
          title: t("common.success"),
          description: t("phaseTemplates.deleted", "Template deleted successfully"),
        });
        setDeleteConfirm(null);
        setIsDeleting(false);
      },
      onError: (error: any) => {
        toast({
          title: t("common.error"),
          description: error.message || "Failed to delete template",
          variant: "destructive",
        });
        setIsDeleting(false);
      },
    });
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
            <h1 className="text-3xl font-bold tracking-tight">{t("phaseTemplates.title")}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80 mt-2">
              {t("phaseTemplates.subtitle")}
            </p>
          </div>
          {canEdit && (
            <Button 
              variant="glass-style-white"
              onClick={handleNewTemplate}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("phaseTemplates.newTemplate")}
            </Button>
          )}
        </div>
      </SidebarHeaderShell>

      {/* Template Center Header */}
      <div className="px-4 md:px-8">
        <TemplateCenterHeader
          title={t('templates:centerTitle', 'Central de Templates')}
          subtitle={t('phaseTemplates.managePhases', 'Manage phase templates for your projects')}
        />
      </div>

      {/* Templates Grid - 3 columns */}
      <div className="px-4 md:px-8">
        {!templates || templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            {t("phaseTemplates.noTemplatesFound")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Create New Card */}
            {canEdit && (
              <TemplateCard
                id="create-new"
                name={t('templates:createNew', 'Começar do zero')}
                description={t('templates:createNewDescription', 'Create a new phase template')}
                type="phase"
                variant="create"
                onUse={handleNewTemplate}
              />
            )}
            
            {/* Template Cards */}
            {templates.map((template: PhaseTemplate) => {
               const { displayName, displayDescription } = getLocalizedTemplate(
                 template.template_name,
                 template.description,
                 t
               );

               return (
                 <TemplateCard
                   key={template.id}
                   id={template.id}
                   name={displayName}
                   description={displayDescription}
                   type="phase"
                   isDefault={template.is_default}
                   isSystem={template.is_system}
                   onEdit={() => handleEditTemplate(template.id)}
                   onUse={() => handleViewTemplate(template.id)}
                   onView={() => handleViewTemplate(template.id)}
                   onDelete={() => setDeleteConfirm(template.id)}
                   onDuplicate={() => handleDuplicateTemplate(template.id)}
                   category={t("phaseTemplates.phases", "PHASES")}
                   imageUrl={template.image_url}
                   userName={template.author?.full_name}
                   userAvatar={template.author?.avatar_url}
                 />
               );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm !== null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete", "Confirm Delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("phaseTemplates.deleteTemplateDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>
              {t("common.cancel", "Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("common.deleting", "Deleting...") : t("common.delete", "Delete")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
