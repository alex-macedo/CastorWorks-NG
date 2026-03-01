import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useBudgetTemplates } from "@/hooks/useBudgetTemplates";
import { useBudgetTemplateItems } from "@/hooks/useBudgetTemplateItems";
import { BudgetTemplateItemsTable } from "@/components/Financial/Templates/BudgetTemplateItemsTable";
import { BudgetTemplateItemForm } from "@/components/Financial/Templates/BudgetTemplateItemForm";
import { Plus, ChevronsDown, ChevronsUp, Package, Edit, Copy, Trash2, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { formatDate } from "@/utils/reportFormatters";
import { useToast } from "@/hooks/use-toast";
import { Container } from "@/components/Layout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useUserProfile } from "@/hooks/useUserProfile";
import { PageHeader } from "@/components/Layout/PageHeader";

// Component to show collapsed summary for template items
function ItemsCollapsedSummary({ items }: { items: any[] }) {
  const { t, currency } = useLocalization();

  const grandTotal = useMemo(() => {
    return items.reduce((total, item) => total + Number(item.budgeted_amount || 0), 0);
  }, [items]);

  return (
    <div className="bg-green-100 dark:bg-green-950 p-3 rounded">
      <div className="flex justify-between items-center">
        <span className="font-bold text-lg">{(t as any)("templates.summary.totalBudget")}</span>
        <span className="font-bold text-lg">
          {formatCurrency(grandTotal, currency)}
        </span>
      </div>
      <div className="text-sm text-muted-foreground mt-2">
        {(t as any)("templates.summary.itemCount", { count: items.length })}
      </div>
    </div>
  );
}

export default function BudgetTemplateDetail() {
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
    loadTranslationsForRoute('/budget-templates/:id');
  }, [loadTranslationsForRoute]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isItemsSectionVisible, setIsItemsSectionVisible] = useState(true); // Start visible
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { getTemplate, deleteTemplate, duplicateTemplate } = useBudgetTemplates();
  const { createItem, updateItem, deleteItem } = useBudgetTemplateItems(id || '');
  
  // Try to get template from cache or location state for instant display
  const cachedTemplates = queryClient.getQueryData<any[]>(['budget_templates', companyId ?? 'public']);
  const templateFromCache = cachedTemplates?.find(t => t.id === id);
  const templateFromState = location.state?.template;
  
  const [template, setTemplate] = useState<any>(templateFromState || templateFromCache || null);
  const [isLoading, setIsLoading] = useState(!template); // Only show loading if we don't have cached data
  const [error, setError] = useState<string | null>(null);

  // Load template data - fetch full details in background if we have cached data
  useEffect(() => {
    if (!id) {
      console.warn('BudgetTemplateDetail: No template ID provided');
      setIsLoading(false);
      toast({
        title: (t as any)('common.errorTitle'),
        description: (t as any)('templates.notFound', 'Template not found'),
        variant: 'destructive',
      });
      navigate('/budget-templates');
      return;
    }

    // If we already have template data from cache/state, use it immediately and fetch full details in background
    if (template && template.items === undefined) {
      // We have basic template but need to fetch items/phases/cost codes
      setIsLoading(false); // Show template immediately
    } else if (!template) {
      // No cached data, show loading
      setIsLoading(true);
    }

    let cancelled = false;
    
    getTemplate(id)
      .then((data) => {
        if (cancelled) return;
        
        if (data) {
          setTemplate(data);
          setError(null);
        } else {
          console.warn('BudgetTemplateDetail: Template not found:', id);
          // Only show error if we don't have cached data
          if (!template) {
            toast({
              title: (t as any)('common.errorTitle'),
              description: (t as any)('templates.notFound', 'Template not found'),
              variant: 'destructive',
            });
            navigate('/budget-templates');
          }
        }
      })
      .catch((error) => {
        if (cancelled) return;
        
        console.error('BudgetTemplateDetail: Error loading template:', error);
        const errorMessage = error?.message || error?.toString() || 'Failed to load template';
        
        // Only show error if we don't have cached data to display
        if (!template) {
          setError(errorMessage);
          toast({
            title: (t as any)('common.errorTitle'),
            description: errorMessage,
            variant: 'destructive',
          });
          setTimeout(() => {
            if (!cancelled) {
              navigate('/budget-templates');
            }
          }, 3000);
        } else {
          // We have cached data, just log the error silently
          console.warn('BudgetTemplateDetail: Failed to refresh template, using cached data');
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
  const groupedItems = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    items.forEach((item: any) => {
      const category = item.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    return grouped;
  }, [items]);

  const isGroupsExpanded = Object.values(expandedGroups).some(expanded => expanded);

  const handleExpandGroups = () => {
    const allGroups: Record<string, boolean> = {};
    Object.keys(groupedItems).forEach(category => {
      allGroups[category] = true;
    });
    setExpandedGroups(allGroups);
  };

  const handleCollapseGroups = () => {
    setExpandedGroups({});
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const handleToggleItemsSection = () => {
    setIsItemsSectionVisible(!isItemsSectionVisible);
  };

  const handleSaveItem = async (data: any) => {
    if (!id) return;

    if (editingItem) {
      // Update existing item
      updateItem(
        { id: editingItem.id, data },
        {
          onSuccess: async () => {
            setIsFormOpen(false);
            setEditingItem(null);
            // Reload template after save
            const updated = await getTemplate(id);
            if (updated) setTemplate(updated);
          },
          onError: (error: any) => {
            toast({
              title: (t as any)('common.errorTitle'),
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
            if (updated) setTemplate(updated);
          },
          onError: (error: any) => {
            toast({
              title: (t as any)('common.errorTitle'),
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
    deleteItem(itemId, {
      onSuccess: async () => {
        // Reload template after delete (query invalidation handles this, but we reload manually for immediate UI update)
        if (id) {
          const updated = await getTemplate(id);
          if (updated) setTemplate(updated);
        }
      },
      onError: (error: any) => {
        toast({
          title: (t as any)('common.errorTitle'),
          description: error.message || 'Failed to delete item',
          variant: 'destructive',
        });
      },
    });
  };

  const handleEditTemplate = () => {
    // Navigate to edit page with template data for instant display
    navigate(`/budget-templates/${id}/edit`, { state: { template } });
  };


  const handleDuplicateTemplate = async () => {
    if (!id) return;
    return duplicateTemplate.mutateAsync(id, {
      onSuccess: () => {
        toast({
          title: (t as any)('common.success'),
          description: (t as any)('templates.duplicated', 'Template duplicated successfully'),
        });
        navigate('/budget-templates');
      },
      onError: (error: any) => {
        toast({
          title: (t as any)('common.errorTitle'),
          description: error.message || 'Failed to duplicate template',
          variant: 'destructive',
        });
      },
    });
  };

  const handleDeleteTemplate = async () => {
    if (!id) return;
    return deleteTemplate.mutateAsync(id, {
      onSuccess: () => {
        toast({
          title: (t as any)('common.success'),
          description: (t as any)('templates.deleted', 'Template deleted successfully'),
        });
        navigate('/budget-templates');
      },
      onError: (error: any) => {
        toast({
          title: (t as any)('common.errorTitle'),
          description: error.message || 'Failed to delete template',
          variant: 'destructive',
        });
      },
    });
    setDeleteConfirm(null);
  };

  const getBudgetTypeLabel = (type: string) => {
    return type === 'simple'
      ? (t as any)('templates.type.simple', 'Simple')
      : (t as any)('templates.type.costControl', 'Cost Control');
  };

  const getBudgetTypeVariant = (type: string) => {
    return type === 'simple' ? 'secondary' : 'default';
  };

  if (isLoading) {
    return (
      <Container size="lg">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">{(t as any)('common.loading', 'Loading...')}</p>
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
          <p className="text-muted-foreground">{(t as any)('templates.notFound', 'Template not found')}</p>
          <Button onClick={() => navigate('/budget-templates')} className="mt-4">
            {(t as any)('common.back', 'Back')}
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
           title={template.name}
           description={template.description || undefined}
            actions={
              <div className="flex gap-2">
                <Button variant="glass-style-white" onClick={() => navigate('/budget-templates')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {(t as any)('common.back', 'Back')}
                </Button>
                <Button variant="glass-style-white" onClick={handleEditTemplate}>
                  <Edit className="h-4 w-4 mr-2" />
                  {(t as any)('common.edit', 'Edit')}
                </Button>
                <Button variant="glass-style-white" onClick={handleDuplicateTemplate}>
                  <Copy className="h-4 w-4 mr-2" />
                  {(t as any)('templates.duplicate', 'Duplicate')}
                </Button>
                <Button variant="glass-style-destructive"
                  onClick={() => setDeleteConfirm(template.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {(t as any)('common.delete', 'Delete')}
                </Button>
              </div>
            }
         />

        <div className="flex items-center gap-2">
          <Badge variant={getBudgetTypeVariant(template.budget_type)}>
            {getBudgetTypeLabel(template.budget_type)}
          </Badge>
          {template.is_public && (
            <Badge variant="outline">{(t as any)('templates.public', 'Public')}</Badge>
          )}
        </div>


        {/* Template Image */}
        {template.image_url && (
          <Card>
            <CardContent className="p-0">
              <img
                src={template.image_url}
                alt={template.name || "Template"}
                className="w-full h-64 object-cover rounded-lg"
              />
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">{(t as any)('templates.totalBudget', 'Total Budget')}</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBudget, currency)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">{(t as any)('templates.itemCount', 'Items')}</p>
              <p className="text-2xl font-bold">{items.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">{(t as any)('templates.createdDate', 'Created')}</p>
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
              {(t as any)('templates.items', 'Budget Items')}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="glass-style-white" onClick={handleToggleItemsSection}
                className="h-8"
              >
                {isItemsSectionVisible ? (t as any)('materials:collapseSection', 'Collapse Section') : (t as any)('materials:expandSection', 'Expand Section')}
              </Button>
              {isItemsSectionVisible && (
                <>
                  <Button variant="glass-style-white" onClick={isGroupsExpanded ? handleCollapseGroups : handleExpandGroups}
                    className="h-8"
                  >
                    {isGroupsExpanded ? (
                      <>
                        <ChevronsUp className="h-4 w-4 mr-2" />
                        {(t as any)('common.collapseAll', 'Collapse All')}
                      </>
                    ) : (
                      <>
                        <ChevronsDown className="h-4 w-4 mr-2" />
                        {(t as any)('common.expandAll', 'Expand All')}
                      </>
                    )}
                  </Button>
                </>
              )}
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {(t as any)('templates.addItem', 'Add Item')}
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

        {/* Delete Confirmation */}
        <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{(t as any)('common.confirmDelete', 'Confirm Delete')}</AlertDialogTitle>
              <AlertDialogDescription>
                {(t as any)('templates.deleteConfirm', 'This template will be permanently deleted. This action cannot be undone.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>
                {(t as any)('common.cancel', 'Cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTemplate}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {(t as any)('common.delete', 'Delete')}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Container>
  );
}
