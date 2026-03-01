import { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, Package, Users, DollarSign, Loader2, Download } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useProjects } from '@/hooks/useProjects';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useImportTemplateFromProject } from '@/hooks/useImportTemplateFromProject';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatters';
import { getProjectScheduleStatus } from '@/types/projectScheduleStatus';
import { ProjectScheduleStatusBadge } from '@/components/Projects/ProjectScheduleStatusBadge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const importTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255),
  description: z.string().optional(),
  budget_type: z.enum(['simple', 'cost_control']),
  is_public: z.boolean().optional().default(false),
  project_id: z.string().min(1, 'Please select a project'),
});

type ImportTemplateFormInput = z.infer<typeof importTemplateSchema>;

interface ImportTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportTemplateDialog({ open, onOpenChange, onSuccess }: ImportTemplateDialogProps) {
  const { t, currency } = useLocalization();
  const { toast } = useToast();
  const { data: profile } = useUserProfile();
  const { projects = [], isLoading: projectsLoading } = useProjects();
  const { importTemplate, isImporting } = useImportTemplateFromProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [materialsCount, setMaterialsCount] = useState(0);
  const [laborCount, setLaborCount] = useState(0);
  const [importTotalBudget, setImportTotalBudget] = useState(0);

  const form = useForm<ImportTemplateFormInput>({
    resolver: zodResolver(importTemplateSchema),
    defaultValues: {
      name: '',
      description: '',
      budget_type: 'simple',
      is_public: false,
      project_id: '',
    },
  });

  const selectedProjectId = useWatch({ control: form.control, name: 'project_id' });
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Update summary when project changes
  useEffect(() => {
    if (selectedProject) {
      const materials = selectedProject.project_materials || [];
      const labor = selectedProject.project_labor || [];
      setMaterialsCount(materials.length);
      setLaborCount(labor.length);
      
      const totalMaterials = materials.reduce((sum: number, m: any) => sum + (m.total || 0), 0);
      const totalLabor = labor.reduce((sum: number, l: any) => sum + (l.total_value || 0), 0);
      setImportTotalBudget(totalMaterials + totalLabor);
    } else {
      setMaterialsCount(0);
      setLaborCount(0);
      setImportTotalBudget(0);
    }
  }, [selectedProject]);

  const filteredProjects = (projects || []).filter(project => {
    const matchesSearch = 
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }).sort((a, b) => 
    (a.name || '').localeCompare(b.name || '')
  );

  const handleSubmit = (data: ImportTemplateFormInput) => {
    if (!profile?.company_id) {
      toast({
        title: t('common.errorTitle', 'Error'),
        description: t('templates.companyIdRequired', 'Company ID is required. Please contact your administrator.'),
        variant: 'destructive',
      });
      return;
    }

    importTemplate({
      templateName: data.name,
      description: data.description,
      companyId: profile.company_id,
      projectId: data.project_id,
      budgetType: data.budget_type,
      isPublic: data.is_public,
    }, {
      onSuccess: () => {
        toast({
          title: t('templates.importSuccess', 'Template imported successfully'),
          description: t('templates.created', 'Template has been created'),
        });
        form.reset();
        setSearchQuery('');
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (error: Error) => {
        toast({
          title: t('common.errorTitle', 'Error'),
          description: error?.message || 'Failed to import template',
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('templates.importTemplate', 'Import Template from Project')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('templates.basicInfo', 'Basic Information')}</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('templates.name', 'Template Name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("additionalPlaceholders.templateName")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.description', 'Description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("additionalPlaceholders.templateUsageDescription")}
                        className="min-h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('templates.budgetType', 'Budget Type')}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="simple">{t('templates.type.simple', 'Simple Budget')}</SelectItem>
                        <SelectItem value="cost_control">{t('templates.type.costControl', 'Cost Control Budget')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_public"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="mb-0">{t('templates.makePublic', 'Make this template public for all team members')}</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {/* Project Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('templates.selectProject', 'Select Project')}</h3>
              
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('templates.project', 'Project')}</FormLabel>
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('common.search', 'Search projects...')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      {projectsLoading ? (
                        <div className="text-center py-4 text-muted-foreground">
                          <p>{t('common.loading', 'Loading...')}</p>
                        </div>
                      ) : filteredProjects.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                          <p>
                            {searchQuery
                              ? t('templates.noProjectsMatch', 'No projects match your search')
                              : t('templates.noProjects', 'No projects available')}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                          {filteredProjects.map((project) => (
                            <div
                              key={project.id}
                              className={`flex items-center justify-between p-3 border rounded-lg transition-colors cursor-pointer ${
                                field.value === project.id
                                  ? 'bg-primary/10 border-primary'
                                  : 'hover:bg-muted/50'
                              }`}
                              onClick={() => field.onChange(project.id)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold truncate">{project.name}</h4>
                                  <ProjectScheduleStatusBadge status={getProjectScheduleStatus(project as any)} />
                                </div>
                                {project.client_name && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {project.client_name}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Summary */}
            {selectedProject && (
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold">{t('templates.summaryTitle', 'Import Summary')}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Package className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('templates.materials', 'Materials')}</p>
                      <p className="text-2xl font-bold">{materialsCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Users className="h-5 w-5 text-green-600 dark:text-green-300" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('templates.labor', 'Labor')}</p>
                      <p className="text-2xl font-bold">{laborCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('templates.totalBudget', 'Total Budget')}</p>
                      <p className="text-2xl font-bold">{formatCurrency(importTotalBudget, currency)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setSearchQuery('');
                  onOpenChange(false);
                }}
                disabled={isImporting}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isImporting || !selectedProject || !profile?.company_id}
                className="min-w-[140px]"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('templates.importing', 'Importing...')}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {t('templates.import', 'Import')}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
