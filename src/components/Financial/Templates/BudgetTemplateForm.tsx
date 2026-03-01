import { useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, GripVertical, Download } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { formatCurrency } from '@/utils/formatters';
import { useProjects } from '@/hooks/useProjects';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useImportTemplateFromProject } from '@/hooks/useImportTemplateFromProject';
import { useToast } from '@/hooks/use-toast';
import { ImportProjectDialog } from './ImportProjectDialog';
import { ImportTemplateConfirmationDialog } from './ImportTemplateConfirmationDialog';
import { TemplateImageUpload } from '@/components/Templates/TemplateImageUpload';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const budgetItemSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  budgeted_amount: z.number().min(0, 'Amount must be positive'),
});

const budgetTemplateFormSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255),
  description: z.string().optional(),
  budget_type: z.enum(['simple', 'cost_control']),
  items: z.array(budgetItemSchema).min(1, 'At least one item is required'),
  is_public: z.boolean(),
});

type BudgetTemplateFormInput = z.infer<typeof budgetTemplateFormSchema>;

interface BudgetTemplateFormProps {
  isLoading?: boolean;
  onSubmit: (data: BudgetTemplateFormInput) => void;
  initialData?: Partial<BudgetTemplateFormInput> & { image_url?: string };
}

export function BudgetTemplateForm({
  isLoading = false,
  onSubmit,
  initialData,
}: BudgetTemplateFormProps) {
  const { t, currency } = useLocalization();
  const { toast } = useToast();
  const { data: profile } = useUserProfile();
  const { projects = [] } = useProjects();
  const { importTemplate, isImporting, importError } = useImportTemplateFromProject();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [importBudgetType, setImportBudgetType] = useState<'simple' | 'cost_control'>('simple');
  const [importIsPublic, setImportIsPublic] = useState(false);
  const [materialsCount, setMaterialsCount] = useState(0);
  const [laborCount, setLaborCount] = useState(0);
  const [importTotalBudget, setImportTotalBudget] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(initialData?.image_url || null);

  const form = useForm<BudgetTemplateFormInput>({
    resolver: zodResolver(budgetTemplateFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      budget_type: initialData?.budget_type || 'simple',
      is_public: initialData?.is_public || false,
      items: initialData?.items || [
        {
          category: '',
          description: '',
          budgeted_amount: 0,
        },
      ],
    },
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const items = useWatch({ control: form.control, name: 'items' }) || [];

  const totalBudget = items.reduce((sum, item) => sum + (item?.budgeted_amount || 0), 0);

  const handleAddItem = () => {
    appendItem({
      category: '',
      description: '',
      budgeted_amount: 0,
    });
  };

  const handleFormSubmit = (data: BudgetTemplateFormInput) => {
    // Pass form data with image_url separately to parent
    const submitData = {
      ...data,
      image_url: imageUrl,
    } as any;
    onSubmit(submitData);
  };

  const handleImportClick = () => {
    setShowImportDialog(true);
  };

  const handleProjectSelect = (project: any) => {
    setSelectedProject(project);
    setShowImportDialog(false);
    setShowConfirmationDialog(true);

    const materials = project.project_materials || [];
    const labor = project.project_labor || [];
    setMaterialsCount(materials.length);
    setLaborCount(labor.length);
    
    const totalMaterials = materials.reduce((sum: number, m: any) => sum + (m.total || 0), 0);
    const totalLabor = labor.reduce((sum: number, l: any) => sum + (l.total_value || 0), 0);
    setImportTotalBudget(totalMaterials + totalLabor);
  };

  const handleConfirmImport = () => {
    if (!selectedProject || !initialData?.name) return;

    importTemplate({
      templateName: initialData.name,
      description: initialData.description,
      companyId: profile?.company_id || '',
      projectId: selectedProject.id,
      budgetType: importBudgetType,
      isPublic: importIsPublic,
    }, {
      onSuccess: () => {
        setShowConfirmationDialog(false);
        setSelectedProject(null);
        setMaterialsCount(0);
        setLaborCount(0);
        setImportTotalBudget(0);
        toast({
          title: t('templates.importSuccess'),
          description: t('templates.created'),
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

  const handleCancelImport = () => {
    setShowConfirmationDialog(false);
    setSelectedProject(null);
  };

  return (
    <>
      <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Template Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t('templates.basicInfo', 'Basic Information')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <TemplateImageUpload
              currentImageUrl={imageUrl}
              onImageUrlChange={setImageUrl}
            />
          </CardContent>
        </Card>

        {/* Budget Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('templates.items', 'Budget Items')}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Total: {formatCurrency(totalBudget, currency)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleImportClick}>
                <Download className="h-4 w-4 mr-2" />
                {t('templates.importMaterialsLabor', 'Import Materials/Labor')}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-2" />
                {t('common.addItem', 'Add Item')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {itemFields.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('templates.noItems', 'No items added. Click "Add Item" to start.')}
                </p>
              ) : (
               itemFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex gap-3 items-start p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >

                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex gap-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.category`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  placeholder={t('templates.categoryPlaceholder', 'Category (e.g., Labor, Materials)')}
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.budgeted_amount`}
                          render={({ field }) => (
                            <FormItem className="w-32">
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder={t("inputPlaceholders.amount")}
                                  min="0"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <FormField
                        control={form.control}
                        name={`items.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder={t('common.description', 'Description (optional)')}
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('templates.totalBudget', 'Total Budget')}</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBudget, currency)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('templates.itemCount', 'Item Count')}</p>
                <p className="text-2xl font-bold">{itemFields.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('common.saving', 'Saving...') : t('common.save', 'Save Template')}
          </Button>
        </div>
      </form>
      </Form>

      {/* Project Import Dialog */}
      <ImportProjectDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onProjectSelect={handleProjectSelect}
      />

      {/* Import Confirmation Dialog */}
      {selectedProject && (
        <ImportTemplateConfirmationDialog
          open={showConfirmationDialog}
          onOpenChange={setShowConfirmationDialog}
          templateName={initialData?.name || ''}
          project={selectedProject}
          materialsCount={materialsCount}
          laborCount={laborCount}
          totalBudget={importTotalBudget}
          isPublic={importIsPublic}
          onIsPublicChange={setImportIsPublic}
          budgetType={importBudgetType}
          onBudgetTypeChange={setImportBudgetType}
          onConfirm={handleConfirmImport}
          isImporting={isImporting}
        />
      )}
    </>
  );
}
