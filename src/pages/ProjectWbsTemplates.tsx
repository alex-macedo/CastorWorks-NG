import { useMemo, useState } from 'react';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { getLocalizedTemplate } from '@/utils/templateLocalization';
import { useWbsTemplates } from '@/hooks/useWbsTemplates';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { exportRowsToCsv } from '@/utils/dataExport';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { Plus, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell';
import { TemplateCard } from '@/components/Templates/TemplateCard';
import { TemplateCenterHeader } from '@/components/Templates/TemplateCenterHeader';

export default function ProjectWbsTemplates() {
  const { t } = useLocalization();
  const { toast } = useToast();
  useRouteTranslations();
  const navigate = useNavigate();

  const { data: rolesData } = useUserRoles();
  const roles = rolesData?.map(r => r.role);
  const canEdit = roles?.includes('admin') || roles?.includes('project_manager');

  const {
    templates,
    isLoading,
    deleteTemplate,
  } = useWbsTemplates();

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [exportingTemplateId, setExportingTemplateId] = useState<string | null>(null);

  const exportColumns = useMemo(
    () => [
      { key: 'wbs_code', label: t('projectWbsTemplates.grid.code') },
      { key: 'name', label: t('projectWbsTemplates.items.name') },
      { key: 'item_type', label: t('projectWbsTemplates.items.type') },
      { key: 'description', label: t('projectWbsTemplates.items.description') },
      { key: 'standard_duration_days', label: t('projectWbsTemplates.items.durationDays') },
      { key: 'standard_cost_code', label: t('projectWbsTemplates.items.costCode') },
    ],
    [t]
  );

  const sanitizeFileName = (value: string) => value.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '');

  const handleExportTemplate = async (templateId: string, templateName: string) => {
    setExportingTemplateId(templateId);
    try {
      const { data, error } = await supabase
        .from('project_wbs_template_items' as any)
        .select('*')
        .eq('template_id', templateId)
        .order('code_path');

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: t('common.info'),
          description: t('projectWbsTemplates.export.empty'),
        });
        return;
      }

      const rows = data.map(item => ({
        wbs_code: item.wbs_code,
        name: item.name,
        item_type: t(`projectWbsTemplates.itemType.${item.item_type}`),
        description: item.description ?? '',
        standard_duration_days: item.standard_duration_days ?? '',
        standard_cost_code: item.standard_cost_code ?? '',
      }));

      const safeName = sanitizeFileName(templateName) || templateId;
      const baseFileName = t('projectWbsTemplates.export.fileName');
      exportRowsToCsv(rows, exportColumns, `${baseFileName}-${safeName}.csv`);

      toast({
        title: t('common.success'),
        description: t('projectWbsTemplates.export.success'),
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error?.message || t('projectWbsTemplates.export.error'),
        variant: 'destructive',
      });
    } finally {
      setExportingTemplateId(null);
    }
  };

  const handleDuplicateTemplate = async (templateId: string) => {
    setIsDuplicating(true);
    setTimeout(() => {
      toast({
        title: t("common.info"),
        description: "Duplicate functionality coming soon",
      });
      setIsDuplicating(false);
    }, 500);
  };

  const handleDeleteTemplate = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    deleteTemplate.mutate(deleteConfirm, {
      onSuccess: () => {
        toast({
          title: t("common.success"),
          description: t("projectWbsTemplates.deleted", "Template deleted successfully"),
        });
        setDeleteConfirm(null);
        setIsDeleting(false);
      },
      onError: (error: any) => {
        let errorMessage = error.message || "Failed to delete template";
        
        if (error.message === 'NOT_EMPTY') {
          errorMessage = t("projectWbsTemplates.errors.templateInUse", "Cannot delete template because it is currently associated with active projects.");
        }

        toast({
          title: t("common.error"),
          description: errorMessage,
          variant: "destructive",
        });
        setIsDeleting(false);
        setDeleteConfirm(null);
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
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('projectWbsTemplates.title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80 mt-2">
              {t('projectWbsTemplates.subtitle')}
            </p>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button
                variant="glass-style-white"
                onClick={() => {
                  navigate('/project-wbs-templates/new');
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('projectWbsTemplates.createNew')}
              </Button>
            </div>
          )}
        </div>
      </SidebarHeaderShell>

      {/* Template Center Header */}
      <div className="px-4 md:px-8">
        <TemplateCenterHeader
          title={t('templates:centerTitle', 'Central de Templates')}
          subtitle={t('projectWbsTemplates.manageWbs', 'Manage WBS templates for your projects')}
        />
      </div>

      {/* Templates Grid - 3 columns */}
      <div className="px-4 md:px-8">
        {!templates || templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            {t('projectWbsTemplates.noTemplates')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Create New Card */}
            {canEdit && (
              <TemplateCard
                id="create-new"
                name={t('templates:createNew', 'Começar do zero')}
                description={t('templates:createNewDescription', 'Create a new WBS template')}
                type="wbs"
                variant="create"
                onUse={() => navigate('/project-wbs-templates/new')}
              />
            )}
            
            {/* Template Cards */}
             {templates.map((tpl: any) => {
               const { displayName, displayDescription } = getLocalizedTemplate(
                 tpl.template_name,
                 tpl.description,
                 t
               );
               
               return (
                 <TemplateCard
                   key={tpl.id}
                   id={tpl.id}
                   name={displayName}
                   description={displayDescription}
                   type="wbs"
                   isDefault={tpl.is_default}
                   isSystem={tpl.is_system}
                   onEdit={() => navigate(`/project-wbs-templates/${tpl.id}?mode=edit`)}
                   onUse={() => navigate(`/project-wbs-templates/${tpl.id}`)}
                   onView={() => navigate(`/project-wbs-templates/${tpl.id}`)}
                   onDelete={() => setDeleteConfirm(tpl.id)}
                   onDuplicate={() => handleDuplicateTemplate(tpl.id)}
                   category="WBS"
                   imageUrl={tpl.image_url}
                   userName={tpl.author?.full_name}
                   userAvatar={tpl.author?.avatar_url}
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
              {t('projectWbsTemplates.deleteConfirmDescription')}
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
