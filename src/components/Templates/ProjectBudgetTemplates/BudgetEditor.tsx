import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useBudgetLineItems } from "@/hooks/useBudgetLineItems";
import { useBudgetCalculations } from "@/hooks/useBudgetCalculations";
import { useCostControlBudgetLines } from "@/hooks/useCostControlBudgetLines";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useLocalization } from "@/contexts/LocalizationContext";
import { groupLineItemsByPhase, sortPhasesByStandardOrder, calculateSINGrandTotals, calculateBDIPercentage, calculateLS } from "@/utils/budgetCalculations";
import { formatCurrency } from "@/utils/formatters";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BudgetOverviewTab } from "./BudgetOverviewTab";
import { BudgetProjectInfoTab } from "./BudgetProjectInfoTab";
import { BudgetBDITab } from "./BudgetBDITab";
import { BudgetPhaseTotalsTab } from "./BudgetPhaseTotalsTab";

import { BudgetDashboardTab } from "./BudgetDashboardTab";
import { BudgetSinapiCatalogTab } from "./BudgetSinapiCatalogTab";
import { BudgetMaterialsTab } from "./BudgetMaterialsTab";
import { BudgetLaborTab } from "./BudgetLaborTab";

interface BudgetEditorProps {
  budgetId: string;
  projectId: string;
  budget: any;
  project?: any;
}

export function BudgetEditor({ budgetId, projectId, budget, project }: BudgetEditorProps) {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { settings } = useAppSettings();
  const { lineItems, isLoading: isLoadingItems, isError: itemsError } = useBudgetLineItems(budgetId);
  const { 
    totalMaterial,
    totalLabor,
    totalDirectCost,
    bdiPercentage,
    bdiAmount,
    finalTotal,
    getPhaseTotalsWithLS, 
    getGrandTotals 
  } = useBudgetCalculations(budgetId, settings as any, budget?.budget_model);

  // Budget model flags - move to top to avoid TDZ issues
  const isBDIBudget = budget?.budget_model === 'bdi_brazil';
  const isCostControlBudget = budget?.budget_model === 'cost_control';
  const isSimpleBudget = budget?.budget_model === 'simple';

  // Fetch budget template to check has_materials flag - MUST be before memos that depend on it
  const { data: budgetTemplate } = useQuery({
    queryKey: ['budget-template', budget?.budget_template_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_templates')
        .select('id, has_materials')
        .eq('id', budget.budget_template_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!budget?.budget_template_id,
  });
  const templateHasMaterials = (budgetTemplate as any)?.has_materials === true;

  // For cost control budgets, use the dedicated hook with proper cost code joins
  const costControlQuery = useCostControlBudgetLines(isCostControlBudget ? budgetId : undefined);
  
  // Calculate cost control totals from joined data
  const costControlTotals = React.useMemo(() => {
    if (!isCostControlBudget || !costControlQuery.data) {
      return { totalLabor: 0, totalMaterials: 0, totalDirectCost: 0 };
    }
    
    let totalLabor = 0;
    let totalMaterials = 0;
    let totalOther = 0;
    
    for (const item of costControlQuery.data) {
      const costCode = (item.cost_codes?.code || '').trim().toUpperCase();
      const amount = Number(item.amount) || 0;
      
      if (costCode === 'LAB' || costCode === 'LABOR') {
        totalLabor += amount;
      } else if (costCode === 'MAT' || costCode === 'MATERIAL') {
        totalMaterials += amount;
      } else {
        totalOther += amount;
      }
    }
    
    return {
      totalLabor,
      totalMaterials,
      totalDirectCost: totalLabor + totalMaterials + totalOther
    };
  }, [isCostControlBudget, costControlQuery.data]);

  // Use consistent BDI calculation with complex Excel formula (matching BDI tab and useBudgetCalculations)
  const sinGrandTotals = React.useMemo(() => {
    if (!settings || !lineItems.length) {
      return {
        totalLabor: 0,
        totalMaterials: 0,
        totalDirectCost: 0,
        totalLS: 0,
        totalBDI: 0,
        grandTotal: 0,
      };
    }

    // Use the same complex BDI calculation as the useBudgetCalculations hook
    // Filter out zero-cost items
    const validItems = lineItems.filter((item) => {
      const material = item.total_material || 0;
      const labor = item.total_labor || 0;
      return material !== 0 || labor !== 0;
    });

    const totalLabor = validItems.reduce((sum, item) => sum + (item.total_labor || 0), 0);
    const totalMaterials = validItems.reduce((sum, item) => sum + (item.total_material || 0), 0);
    const totalDirectCost = totalLabor + totalMaterials;

    // Use the complex BDI formula from calculateBDIPercentage
    const bdiPercentage = calculateBDIPercentage({
      bdi_central_admin: settings.bdi_central_admin || 0,
      bdi_site_overhead: settings.bdi_site_overhead || 0,
      bdi_financial_costs: settings.bdi_financial_costs || 0,
      bdi_risks_insurance: settings.bdi_risks_insurance || 0,
      bdi_taxes: settings.bdi_taxes || 0,
      bdi_profit_margin: settings.bdi_profit_margin || 0,
      bdi_pis: settings.bdi_pis || 0,
      bdi_cofins: settings.bdi_cofins || 0,
      bdi_iss: settings.bdi_iss || 0,
      bdi_social_taxes: settings.bdi_social_taxes || 0,
    });

    const totalBDI = totalDirectCost * (bdiPercentage / 100);

    // LS = Total Labor * Financial Expenses
    const totalLS = calculateLS(totalLabor, settings.bdi_financial_costs || 0);

    // Grand Total = Direct Cost + LS + BDI (matching Excel SIN worksheet)
    const grandTotal = totalDirectCost + totalLS + totalBDI;

    return {
      totalLabor,
      totalMaterials,
      totalDirectCost,
      totalLS,
      totalBDI,
      grandTotal,
    };
  }, [lineItems, settings]);

  // For simple budgets with materials templates, calculate labor from group_name
  const laborFromGroupName = React.useMemo(() => {
    if (!isSimpleBudget || !templateHasMaterials || !lineItems.length) {
      return 0;
    }
    
    // Sum all line items where group_name is "Mão-de-obra"
    return lineItems
      .filter((item) => item.group_name === 'Mão-de-obra')
      .reduce((sum, item) => {
        // For materials template, the amount is in total_material field
        const amount = Number(item.total_material) || 0;
        return sum + amount;
      }, 0);
  }, [isSimpleBudget, templateHasMaterials, lineItems]);
  
  // For simple budgets with materials templates, calculate materials excluding labor group
  const materialsExcludingLabor = React.useMemo(() => {
    if (!isSimpleBudget || !templateHasMaterials || !lineItems.length) {
      return totalMaterial;
    }
    
    // Exclude "Mão-de-obra" items from materials total to avoid double-counting
    return lineItems
      .filter((item) => item.group_name !== 'Mão-de-obra')
      .reduce((sum, item) => {
        const amount = Number(item.total_material) || 0;
        return sum + amount;
      }, 0);
  }, [isSimpleBudget, templateHasMaterials, lineItems, totalMaterial]);
  
  // Use cost control totals for cost control budgets, otherwise use standard calculations
  // For simple budgets with materials templates, use laborFromGroupName for labor
  const displayTotalMaterial = isCostControlBudget 
    ? costControlTotals.totalMaterials 
    : (isSimpleBudget && templateHasMaterials ? materialsExcludingLabor : totalMaterial);
  const displayTotalLabor = isCostControlBudget 
    ? costControlTotals.totalLabor 
    : (isSimpleBudget && templateHasMaterials ? laborFromGroupName : totalLabor);
  const displayTotalDirectCost = isCostControlBudget 
    ? costControlTotals.totalDirectCost 
    : (isSimpleBudget && templateHasMaterials 
      ? displayTotalMaterial + displayTotalLabor 
      : totalDirectCost);
  
  // Calculate final total value based on budget type
  // For simple budgets with materials templates, use the corrected displayTotalDirectCost
  // For BDI budgets, use sinGrandTotals.grandTotal which includes BDI and LS
  // For cost control budgets, use costControlTotals.totalDirectCost
  const finalTotalValue = isCostControlBudget 
    ? costControlTotals.totalDirectCost 
    : (isSimpleBudget && templateHasMaterials 
      ? displayTotalDirectCost 
      : sinGrandTotals.grandTotal);

  const parseNumberValue = (value: unknown) => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    const sanitized = value.trim().replace(/\s+/g, '');
    if (!sanitized) return 0;
    const normalized = sanitized.includes(',') && sanitized.includes('.')
      ? sanitized.replace(/\./g, '').replace(',', '.')
      : sanitized.replace(',', '.');
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const projectTotalGrossFloorArea = parseNumberValue(project?.total_gross_floor_area);
  const projectBudgetTotal = parseNumberValue(project?.budget_total);
  const costPerM2 = projectTotalGrossFloorArea > 0
    ? finalTotalValue / projectTotalGrossFloorArea
    : 0;

  // No local formatCurrency needed, using the one imported from "@/utils/formatters"

  console.log('[BudgetEditor] Budget type detection:', {
    budgetModel: budget?.budget_model,
    isBDIBudget,
    isCostControlBudget,
    isSimpleBudget,
    budget: budget ? { id: budget.id, name: budget.name, budget_model: budget.budget_model } : null,
  });
  // showLaborTab and materialsTabLabel use templateHasMaterials which is defined above
  const showLaborTab = isSimpleBudget && !templateHasMaterials;
  const materialsTabLabel = templateHasMaterials ? t('budgets:materials.withTemplate') : t('budgets:materials.title');
  const lastSyncedBudgetTotalRef = React.useRef<number | null>(null);
  const isSyncingBudgetTotalRef = React.useRef(false);

  React.useEffect(() => {
    if (!projectId || !project) return;
    if (!settings || isLoadingItems) return;
    if (!lineItems.length) return;
    if (!Number.isFinite(finalTotalValue)) return;

    const difference = Math.abs(projectBudgetTotal - finalTotalValue);
    if (difference < 0.01) {
      lastSyncedBudgetTotalRef.current = finalTotalValue;
      return;
    }

    if (isSyncingBudgetTotalRef.current) return;
    if (lastSyncedBudgetTotalRef.current === finalTotalValue) return;

    isSyncingBudgetTotalRef.current = true;

    const syncBudgetTotal = async () => {
      const { error } = await supabase
        .from('projects')
        .update({ budget_total: finalTotalValue })
        .eq('id', projectId);

      if (!error) {
        lastSyncedBudgetTotalRef.current = finalTotalValue;
        queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
        queryClient.invalidateQueries({ queryKey: ['projects'] });
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      }

      isSyncingBudgetTotalRef.current = false;
    };

    void syncBudgetTotal();
  }, [projectId, project, settings, isLoadingItems, lineItems.length, finalTotalValue, projectBudgetTotal, queryClient]);

  return (
    <div className="space-y-6 w-full">
      {/* Unified Summary Cards - Available for all tabs */}
      <div className="flex flex-wrap gap-2 w-full">
        <Card className="flex-1 min-w-[150px] text-right">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t('budgets:summary.materials')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold break-words">
              {formatCurrency(displayTotalMaterial, "BRL")}
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[150px] text-right">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t('budgets:summary.labor')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold break-words">
              {formatCurrency(displayTotalLabor, "BRL")}
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[150px] text-right">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t('budgets:summary.directCost')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold break-words">
              {formatCurrency(displayTotalDirectCost, "BRL")}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight break-words">
              {t('budgets:summary.material')}: {formatCurrency(displayTotalMaterial, "BRL")} •{' '}
              {t('budgets:summary.labor')}: {formatCurrency(displayTotalLabor, "BRL")}
            </div>
          </CardContent>
        </Card>

        {/* Only show LS and BDI cards for BDI budgets */}
        {isBDIBudget && (
          <>
            <Card className="flex-1 min-w-[150px] border-blue-200 bg-blue-50 dark:bg-blue-950 text-right">
              <CardHeader className="pb-1.5">
                <CardTitle className="text-xs font-medium text-blue-900 dark:text-blue-100">
                  {t('budgets:summary.legalServices')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg font-bold text-blue-700 dark:text-blue-300 break-words">
                  {formatCurrency(sinGrandTotals.totalLS, "BRL")}
                </div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 leading-tight break-words">
                  {t('budgets:summary.labor')} × {settings?.bdi_financial_costs?.toFixed(2) || '0'}%
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 min-w-[150px] border-orange-200 bg-orange-50 dark:bg-orange-950 text-right">
              <CardHeader className="pb-1.5">
                <CardTitle className="text-xs font-medium text-orange-900 dark:text-orange-100">
                  {t('budgets:bdi.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-lg font-bold text-orange-700 dark:text-orange-300 break-words">
                  {formatCurrency(bdiAmount, "BRL")}
                </div>
                <div className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5 leading-tight break-words">
                  {bdiPercentage.toFixed(2)}% {t('budgets:summary.ofDirectCost')}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Card className="flex-1 min-w-[150px] border-green-200 bg-green-50 dark:bg-green-950 text-right">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-medium text-green-900 dark:text-green-100">
              {t('budgets:summary.finalTotal')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold text-green-700 dark:text-green-300 break-words">
              {formatCurrency(finalTotalValue, "BRL")}
            </div>
            <div className="text-[10px] text-green-600 dark:text-green-400 mt-0.5 leading-tight break-words">
              {isBDIBudget ? t('budgets:summary.includingBDI') : t('budgets:summary.total')}
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[150px] text-right">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t('budgets:overview.costPerM2')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-bold break-words">
              {costPerM2 > 0 ? formatCurrency(costPerM2, "BRL") : '-'}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight break-words">
              {projectTotalGrossFloorArea ? `${projectTotalGrossFloorArea} m²` : t('budgets:overview.noArea')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views - visibility depends on budget type */}
      <Tabs 
        variant="pill"
        defaultValue="dashboard" 
        className="w-full"
        onValueChange={(value) => {
          if (value === "settings") {
            navigate(`/projects/${projectId}/budgets`);
          }
        }}
      >
        <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide overflow-y-hidden">
          <TabsTrigger value="dashboard">{t('budgets:worksheets.das')}</TabsTrigger>
          <TabsTrigger value="project-info">{t('budgets:overview.projectInformation')}</TabsTrigger>

          {/* Simple Budget-specific tabs */}
          {isSimpleBudget && (
            <>
              <TabsTrigger value="materials">{materialsTabLabel}</TabsTrigger>
              {showLaborTab && (
                <TabsTrigger value="labor">{t('budgets:labor.title')}</TabsTrigger>
              )}
            </>
          )}

          {/* BDI-specific tabs */}
          {isBDIBudget && (
            <>
              <TabsTrigger value="overview">{t('budgets:worksheets.sin')}</TabsTrigger>
              <TabsTrigger value="bdi">{t('budgets:bdi.shortTitle')}</TabsTrigger>
              <TabsTrigger value="phases">{t('budgets:worksheets.cpe')}</TabsTrigger>
              <TabsTrigger value="catalog">{t('budgets:worksheets.sinapi')}</TabsTrigger>
            </>
          )}

          {/* Cost Control-specific tabs */}
          {isCostControlBudget && (
            <TabsTrigger value="phases">{t('budgets:worksheets.cpe')}</TabsTrigger>
          )}

           {/* Settings tab - available for all budget types */}
           <TabsTrigger value="settings">{t('budgets:settings.title')}</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <BudgetDashboardTab budgetId={budgetId} projectId={projectId} budgetModel={budget?.budget_model} />
        </TabsContent>

        {/* Project Information Tab */}
        <TabsContent value="project-info" className="space-y-4">
          <BudgetProjectInfoTab budgetId={budgetId} budget={budget} project={project} />
        </TabsContent>

        {/* Materials Tab - only for Simple budgets */}
        {isSimpleBudget && (
          <TabsContent value="materials" className="space-y-4">
            <BudgetMaterialsTab budgetId={budgetId} projectId={projectId} />
          </TabsContent>
        )}

        {/* Labor Tab - only for Simple budgets */}
        {showLaborTab && (
          <TabsContent value="labor" className="space-y-4">
            <BudgetLaborTab budgetId={budgetId} projectId={projectId} />
          </TabsContent>
        )}

        {/* BDI Overview Tab - only for BDI budgets */}
        {isBDIBudget && (
          <TabsContent value="overview" className="space-y-4">
            <BudgetOverviewTab budgetId={budgetId} projectId={projectId} />
          </TabsContent>
        )}

        {/* BDI Details Tab - only for BDI budgets */}
        {isBDIBudget && (
          <TabsContent value="bdi" className="space-y-4">
            <BudgetBDITab
              budgetId={budgetId}
              projectId={projectId}
              totalDirectCost={totalDirectCost}
            />
          </TabsContent>
        )}

        {/* Phase Totals Tab - for both BDI and Cost Control budgets */}
        {(isBDIBudget || isCostControlBudget) && (
          <TabsContent value="phases" className="space-y-4">
            <BudgetPhaseTotalsTab
              budgetId={budgetId}
              projectId={projectId}
              totalDirectCost={totalDirectCost}
              budgetModel={budget?.budget_model}
            />
          </TabsContent>
        )}

        {/* SINAPI Catalog Tab - only for BDI budgets */}
        {isBDIBudget && (
          <TabsContent value="catalog" className="space-y-4">
            <BudgetSinapiCatalogTab budgetId={budgetId} projectId={projectId} />
          </TabsContent>
        )}

        {/* Settings Tab - available for all budget types */}
        {/* Note: Navigation is handled by onValueChange handler above */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">{t('budgets:settings.redirecting')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
