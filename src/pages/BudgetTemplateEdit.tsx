import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useBudgetTemplates } from "@/hooks/useBudgetTemplates";
import { useBudgetTemplateItems } from "@/hooks/useBudgetTemplateItems";
import { BudgetTemplateItemsTable } from "@/components/Financial/Templates/BudgetTemplateItemsTable";
import { BudgetTemplateItemForm } from "@/components/Financial/Templates/BudgetTemplateItemForm";
import { Plus, ChevronsDown, ChevronsUp, Package, ArrowLeft, Save, X } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { formatDate } from "@/utils/reportFormatters";
import { useToast } from "@/hooks/use-toast";
import { Container } from "@/components/Layout";
import { PageHeader } from "@/components/Layout/PageHeader";
import { useQueryClient } from "@tanstack/react-query";
import { useUserProfile } from "@/hooks/useUserProfile";

// Component to show collapsed summary for template items
function ItemsCollapsedSummary({ items }: { items: any[] }) {
  const { t, currency, dateFormat } = useLocalization();

  const grandTotal = useMemo(() => {
    return items.reduce((total, item) => total + Number(item.budgeted_amount || 0), 0);
  }, [items]);

  return (
    <div className="bg-green-100 dark:bg-green-950 p-3 rounded">
      <div className="flex justify-between items-center">
        <span className="font-bold text-lg">{t("templates.summary.totalBudget")}</span>
        <span className="font-bold text-lg">
          {formatCurrency(grandTotal, currency)}
        </span>
      </div>
      <div className="text-sm text-muted-foreground mt-2">
        {t("templates.summary.itemCount", { count: items.length })}
      </div>
    </div>
  );
}

export default function BudgetTemplateEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, currency, dateFormat, loadTranslationsForRoute } = useLocalization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile } = useUserProfile();
  const companyId = profile?.company_id;

  // Load translations for this route
  useEffect(() => {
    loadTranslationsForRoute('/budget-templates/:id/edit');
  }, [loadTranslationsForRoute]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isItemsSectionVisible, setIsItemsSectionVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Check if groups are expanded
  const isGroupsExpanded = Object.values(expandedGroups).some(expanded => expanded);

  // Expand all groups
  const handleExpandGroups = () => {
    const groupedItems: Record<string, any[]> = {};
    items.forEach((item: any) => {
      const category = item.category || 'Uncategorized';
      if (!groupedItems[category]) {
        groupedItems[category] = [];
      }
      groupedItems[category].push(item);
    });

    const allExpanded: Record<string, boolean> = {};
    Object.keys(groupedItems).forEach(category => {
      allExpanded[category] = true;
    });
    setExpandedGroups(allExpanded);
  };

  // Collapse all groups
  const handleCollapseGroups = () => {
    setExpandedGroups({});
  };

  // Toggle items section visibility
  const handleToggleItemsSection = () => {
    setIsItemsSectionVisible(!isItemsSectionVisible);
  };

  // Toggle individual group
  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Handle category reordering
  const handleReorderCategories = async (newCategoryOrder: string[]) => {
    if (!id || !template) return;

    setCategoryOrder(newCategoryOrder);

    // Calculate new sort_order for all items based on category order
    const itemsToUpdate: Array<{ id: string; sort_order: number }> = [];
    let currentOrder = 1;

    newCategoryOrder.forEach((category) => {
      const categoryItems = items
        .filter((item: any) => (item.category || 'Uncategorized') === category)
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));

      categoryItems.forEach((item: any) => {
        if (item.sort_order !== currentOrder) {
          itemsToUpdate.push({ id: item.id, sort_order: currentOrder });
        }
        currentOrder++;
      });
    });

    // Update all items with new sort_order using Promise.all for parallel updates
    try {
      await Promise.all(
        itemsToUpdate.map((update) =>
          new Promise<void>((resolve, reject) => {
            updateItem(
              { id: update.id, data: { sort_order: update.sort_order } },
              {
                onSuccess: () => resolve(),
                onError: (error) => {
                  console.error('Failed to update item order:', error);
                  resolve(); // Continue even if one fails
                },
              }
            );
          })
        )
      );

      // Reload template to reflect changes
      const updated = await getTemplate(id);
      if (updated) setTemplate(updated);
    } catch (error) {
      console.error('Error reordering categories:', error);
    }
  };

  const { getTemplate, updateTemplate } = useBudgetTemplates();
  const { createItem, updateItem, deleteItem } = useBudgetTemplateItems(id || '');
  
  // Track category order for drag & drop
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  
  // Try to get template from cache or location state for instant display
  const cachedTemplates = queryClient.getQueryData<any[]>(['budget_templates', companyId ?? 'public']);
  const templateFromCache = cachedTemplates?.find(t => t.id === id);
  const templateFromState = location.state?.template;
  
  const [template, setTemplate] = useState<any>(templateFromState || templateFromCache || null);
  const [isLoading, setIsLoading] = useState(!template);
  const [error, setError] = useState<string | null>(null);

  // Form state for editable fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget_type: 'simple' as 'simple' | 'cost_control',
    is_public: false,
    is_default: false,
    has_materials: true,
  });

  // Load template data
  useEffect(() => {
    if (!id) {
      console.warn('BudgetTemplateEdit: No template ID provided');
      setIsLoading(false);
      toast({
        title: t('common.errorTitle'),
        description: t('templates.notFound', 'Template not found'),
        variant: 'destructive',
      });
      navigate('/budget-templates');
      return;
    }

    // If we already have template data from cache/state, use it immediately
    if (template && template.items === undefined) {
      setIsLoading(false);
    } else if (!template) {
      setIsLoading(true);
    }

    let cancelled = false;
    
    getTemplate(id)
      .then((data) => {
        if (cancelled) return;
        
        if (data) {
          setTemplate(data);
          setFormData({
            name: data.name,
            description: data.description || '',
            budget_type: data.budget_type as 'simple' | 'cost_control',
            is_public: data.is_public || false,
            is_default: data.is_default || false,
            has_materials: data.has_materials ?? true,
          });
          setError(null);
        } else {
          console.warn('BudgetTemplateEdit: Template not found:', id);
          if (!template) {
            toast({
              title: t('common.errorTitle', 'Error'),
              description: t('templates.notFound', 'Template not found'),
              variant: 'destructive',
            });
            navigate('/budget-templates');
          }
        }
      })
      .catch((error) => {
        if (cancelled) return;
        
        console.error('BudgetTemplateEdit: Error loading template:', error);
        const errorMessage = error?.message || error?.toString() || 'Failed to load template';
        
        if (!template) {
          setError(errorMessage);
          toast({
            title: t('common.errorTitle'),
            description: errorMessage,
            variant: 'destructive',
          });
          setTimeout(() => {
            if (!cancelled) {
              navigate('/budget-templates');
            }
          }, 3000);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, getTemplate, navigate, t, template, toast]);

  const items = useMemo(() => template?.items || [], [template?.items]);

  // Initialize category order when template loads
  useEffect(() => {
    if (items.length > 0 && categoryOrder.length === 0) {
      const categories = new Set<string>();
      items.forEach((item: any) => {
        categories.add(item.category || 'Uncategorized');
      });
      setCategoryOrder(Array.from(categories));
    }
  }, [items, categoryOrder.length]);

  const handleSaveItem = async (data: any) => {
    if (!id) return;

    if (editingItem) {
      // Update existing item
      updateItem(
        {
          id: editingItem.id,
          data: {
            category: data.category,
            description: data.description,
            budgeted_amount: data.budgeted_amount,
          },
        },
        {
          onSuccess: async () => {
            setIsFormOpen(false);
            setEditingItem(null);
            // Reload template after save
            const updated = await getTemplate(id);
            if (updated) {
              setTemplate(updated);
            }
          },
          onError: (error: any) => {
            toast({
              title: t('common.errorTitle', 'Error'),
              description: error.message || 'Failed to update item',
              variant: 'destructive',
            });
          },
        }
      );
    } else {
      // Create new item
      const maxDisplayOrder = items.length > 0
        ? Math.max(...items.map((i: any) => i.sort_order || 0), 0)
        : 0;
      createItem(
        {
          template_id: id,
          category: data.category,
          description: data.description,
          budgeted_amount: data.budgeted_amount,
          sort_order: maxDisplayOrder + 1,
        },
        {
          onSuccess: async () => {
            setIsFormOpen(false);
            setEditingItem(null);
            // Reload template after save
            const updated = await getTemplate(id);
            if (updated) {
              setTemplate(updated);
            }
          },
          onError: (error: any) => {
            toast({
              title: t('common.errorTitle', 'Error'),
              description: error.message || 'Failed to create item',
              variant: 'destructive',
            });
          },
        }
      );
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    deleteItem(
      itemId,
      {
        onSuccess: async () => {
          if (id) {
            const updated = await getTemplate(id);
            if (updated) setTemplate(updated);
          }
        },
        onError: (error: any) => {
          toast({
            title: t('common.errorTitle'),
            description: error.message || 'Failed to delete item',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleSave = async () => {
    if (!id || !template) return;

    setIsSaving(true);

    return updateTemplate.mutateAsync(
      {
        templateId: id,
        data: {
          name: formData.name,
          description: formData.description,
          budget_type: formData.budget_type,
          is_public: formData.is_public,
          is_default: formData.is_default,
          has_materials: formData.has_materials,
          items: items.map((item: any) => ({
            category: item.category,
            description: item.description || '',
            budgeted_amount: item.budgeted_amount,
            sort_order: item.sort_order,
          })),
        },
      },
      {
        onSuccess: async () => {
          toast({
            title: t('common.success'),
            description: t('templates.updated', 'Template updated successfully'),
          });
          // Navigate back to detail page
          navigate(`/budget-templates/${id}`);
        },
        onError: (error: any) => {
          toast({
            title: t('common.errorTitle', 'Error'),
            description: error.message || 'Failed to update template',
            variant: 'destructive',
          });
          setIsSaving(false);
        },
      }
    );
  };

  const handleCancel = () => {
    navigate(`/budget-templates/${id}`);
  };

  const getBudgetTypeLabel = (type: string) => {
    return type === 'simple'
      ? t('templates.type.simple', 'Simple')
      : t('templates.type.costControl', 'Cost Control');
  };

  const getBudgetTypeVariant = (type: string) => {
    return type === 'simple' ? 'secondary' : 'default';
  };

  if (isLoading) {
    return (
      <Container size="lg">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">{t('common.loading', 'Loading...')}</p>
          {error && (
            <p className="text-destructive text-sm mt-2">{error}</p>
          )}
        </div>
      </Container>
    );
  }

  if (!template) {
    return (
      <Container size="lg">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">{t('templates.notFound', 'Template not found')}</p>
          <Button onClick={() => navigate('/budget-templates')} className="mt-4">
            {t('common.back', 'Back')}
          </Button>
        </div>
      </Container>
    );
  }

  const totalBudget = items.reduce((sum: number, item: any) => sum + Number(item.budgeted_amount || 0), 0);

  return (
    <Container size="lg">
      <div className="flex-1 space-y-6">
        {/* Header */}
        <PageHeader
          title={formData.name || t('templates.editTitle', 'Edit Budget Template')}
          description={formData.description || undefined}
          actions={
            <div className="flex gap-2">
              <Button variant="glass-style-white" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button variant="glass-style-white" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </Button>
            </div>
          }
        />

        {/* Template Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('templates.settings', 'Template Settings')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('templates.name', 'Template Name')}</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('templates.name', 'Template Name')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('templates.type.label', 'Budget Type')}</label>
                <Select
                  value={formData.budget_type}
                  onValueChange={(value: 'simple' | 'cost_control') => setFormData({ ...formData, budget_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">{t('templates.type.simple', 'Simple')}</SelectItem>
                    <SelectItem value="cost_control">{t('templates.type.costControl', 'Cost Control')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('templates.description', 'Description')}</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('templates.description', 'Template description')}
                rows={3}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked === true })}
                />
                <label htmlFor="is-public" className="text-sm font-medium cursor-pointer">
                  {t('templates.public', 'Public')}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="has-materials"
                  checked={formData.has_materials}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_materials: checked === true })}
                />
                <label htmlFor="has-materials" className="text-sm font-medium cursor-pointer">
                  {t('templates.hasMaterials', 'Budget WITH Materials')}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is-default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked === true })}
                />
                <label htmlFor="is-default" className="text-sm font-medium cursor-pointer">
                  {t('templates.setAsDefault', 'Set as Default Template')}
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">{t('templates.totalBudget', 'Total Budget')}</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBudget, currency)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">{t('templates.itemCount', 'Items')}</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">{t('templates.createdDate', 'Created')}</p>
               <p className="text-2xl font-bold">
                 {template.created_at && formatDate(template.created_at, dateFormat)}
               </p>
            </CardContent>
          </Card>
        </div>

        {/* Budget Items Section */}
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t('templates.items', 'Budget Items')}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="glass-style-white" onClick={handleToggleItemsSection}
                className="h-8"
              >
                {isItemsSectionVisible ? t('materials:collapseSection', 'Collapse Section') : t('materials:expandSection', 'Expand Section')}
              </Button>
              {isItemsSectionVisible && (
                <>
                  <Button variant="glass-style-white" onClick={isGroupsExpanded ? handleCollapseGroups : handleExpandGroups}
                    className="h-8"
                  >
                    {isGroupsExpanded ? (
                      <>
                        <ChevronsUp className="h-4 w-4 mr-2" />
                        {t('common.collapseAll', 'Collapse All')}
                      </>
                    ) : (
                      <>
                        <ChevronsDown className="h-4 w-4 mr-2" />
                        {t('common.expandAll', 'Expand All')}
                      </>
                    )}
                  </Button>
                </>
              )}
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('templates.addItem', 'Add Item')}
              </Button>
            </div>
          </CardHeader>
          {isItemsSectionVisible ? (
            <CardContent className="p-0">
              <BudgetTemplateItemsTable
                items={items}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                expandedGroups={expandedGroups}
                onToggleGroup={toggleGroup}
                onReorderCategories={handleReorderCategories}
                isReorderable={true}
                categoryOrder={categoryOrder.length > 0 ? categoryOrder : undefined}
              />
            </CardContent>
          ) : (
            <CardContent className="p-4">
              <ItemsCollapsedSummary items={items} />
            </CardContent>
          )}
        </Card>

        {/* Item Form Dialog */}
        <BudgetTemplateItemForm
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingItem(null);
          }}
          item={editingItem}
          templateId={id || ''}
          onSave={handleSaveItem}
        />
      </div>
    </Container>
  );
}
