import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Edit, X } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatters";
import { useLocalization } from '@/contexts/LocalizationContext';

interface BudgetBDITabProps {
  budgetId: string;
  projectId: string;
  totalDirectCost: number;
}

interface BDIConfig {
  central_admin: number;
  site_overhead: number;
  financial_costs: number;
  risks_insurance: number;
  profit_margin: number;
  pis: number;
  cofins: number;
  iss: number;
  other_taxes: number;
  social_taxes: number;
}

export const BudgetBDITab = ({ 
  budgetId, 
  projectId, 
  totalDirectCost
}: BudgetBDITabProps) => {
  const { t } = useLocalization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const justSavedRef = useRef(false);

  // Fetch current BDI configuration
  // Note: app_settings is global, not project-specific, so query key doesn't need projectId
  const { data: bdiConfigData, isLoading, refetch } = useQuery({
    queryKey: ['bdi-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // If no settings exist, return defaults
      if (!data) {
        return {
          settingsId: null,
          central_admin: 0,
          site_overhead: 0,
          financial_costs: 0,
          risks_insurance: 0,
          profit_margin: 0,
          pis: 0,
          cofins: 0,
          iss: 0,
          other_taxes: 0,
          social_taxes: 22.0,
        };
      }

      return {
        settingsId: data.id,
        central_admin: data.bdi_central_admin || 0,
        site_overhead: data.bdi_site_overhead || 0,
        financial_costs: data.bdi_financial_costs || 0,
        risks_insurance: data.bdi_risks_insurance || 0,
        profit_margin: data.bdi_profit_margin || 0,
        pis: data.bdi_pis || 0,
        cofins: data.bdi_cofins || 0,
        iss: data.bdi_iss || 0,
        other_taxes: data.bdi_taxes || 0,
        social_taxes: data.bdi_social_taxes || 22.0,
      };
    },
  });

  const bdiConfig = bdiConfigData ? {
    central_admin: bdiConfigData.central_admin,
    site_overhead: bdiConfigData.site_overhead,
    financial_costs: bdiConfigData.financial_costs,
    risks_insurance: bdiConfigData.risks_insurance,
    profit_margin: bdiConfigData.profit_margin,
    pis: bdiConfigData.pis,
    cofins: bdiConfigData.cofins,
    iss: bdiConfigData.iss,
    other_taxes: bdiConfigData.other_taxes,
    social_taxes: bdiConfigData.social_taxes,
  } : undefined;

  const { control, handleSubmit, reset, watch } = useForm<BDIConfig>({
    defaultValues: bdiConfig || {
      central_admin: 0,
      site_overhead: 0,
      financial_costs: 0,
      risks_insurance: 0,
      profit_margin: 0,
      pis: 0,
      cofins: 0,
      iss: 0,
      other_taxes: 0,
      social_taxes: 22.0,
    },
  });

  const updateBDI = useMutation({
    mutationFn: async (data: BDIConfig) => {
      if (!bdiConfigData?.settingsId) {
        // If no settings exist, create them
        const { data: newSettings, error: insertError } = await supabase
          .from('app_settings')
          .insert({
            bdi_central_admin: data.central_admin,
            bdi_site_overhead: data.site_overhead,
            bdi_financial_costs: data.financial_costs,
            bdi_risks_insurance: data.risks_insurance,
            bdi_profit_margin: data.profit_margin,
            bdi_pis: data.pis,
            bdi_cofins: data.cofins,
            bdi_iss: data.iss,
            bdi_taxes: data.other_taxes,
            bdi_social_taxes: data.social_taxes,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        // Return the new settings data in the same format as the query
        return {
          settingsId: newSettings.id,
          central_admin: newSettings.bdi_central_admin || 0,
          site_overhead: newSettings.bdi_site_overhead || 0,
          financial_costs: newSettings.bdi_financial_costs || 0,
          risks_insurance: newSettings.bdi_risks_insurance || 0,
          profit_margin: newSettings.bdi_profit_margin || 0,
          pis: newSettings.bdi_pis || 0,
          cofins: newSettings.bdi_cofins || 0,
          iss: newSettings.bdi_iss || 0,
          other_taxes: newSettings.bdi_taxes || 0,
          social_taxes: newSettings.bdi_social_taxes || 22.0,
        };
      }

      // Update existing settings
      const { data: updatedData, error } = await supabase
        .from('app_settings')
        .update({
          bdi_central_admin: data.central_admin,
          bdi_site_overhead: data.site_overhead,
          bdi_financial_costs: data.financial_costs,
          bdi_risks_insurance: data.risks_insurance,
          bdi_profit_margin: data.profit_margin,
          bdi_pis: data.pis,
          bdi_cofins: data.cofins,
          bdi_iss: data.iss,
          bdi_taxes: data.other_taxes,
          bdi_social_taxes: data.social_taxes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bdiConfigData.settingsId)
        .select()
        .single();

      if (error) throw error;
      
      // Return data in the same format as the query
      return {
        settingsId: updatedData.id,
        central_admin: updatedData.bdi_central_admin || 0,
        site_overhead: updatedData.bdi_site_overhead || 0,
        financial_costs: updatedData.bdi_financial_costs || 0,
        risks_insurance: updatedData.bdi_risks_insurance || 0,
        profit_margin: updatedData.bdi_profit_margin || 0,
        pis: updatedData.bdi_pis || 0,
        cofins: updatedData.bdi_cofins || 0,
        iss: updatedData.bdi_iss || 0,
        other_taxes: updatedData.bdi_taxes || 0,
        social_taxes: updatedData.bdi_social_taxes || 22.0,
      };
    },
    onSuccess: (savedData) => {
      // Mark that we just saved FIRST to prevent useEffect from resetting with stale data
      justSavedRef.current = true;
      
      // Prepare saved config
      const savedConfig = {
        central_admin: savedData.central_admin,
        site_overhead: savedData.site_overhead,
        financial_costs: savedData.financial_costs,
        risks_insurance: savedData.risks_insurance,
        profit_margin: savedData.profit_margin,
        pis: savedData.pis,
        cofins: savedData.cofins,
        iss: savedData.iss,
        other_taxes: savedData.other_taxes,
        social_taxes: savedData.social_taxes,
      };
      
      // Update the cache with the saved data
      queryClient.setQueryData(['bdi-config'], savedData);
      
      // Reset form with saved data (this will trigger a re-render, but useEffect will skip due to justSavedRef)
      reset(savedConfig);
      
      // Set editing to false AFTER reset
      setIsEditing(false);
      
      // Reset the flag after a brief delay to allow useEffect to check it
      // This ensures the useEffect doesn't reset the form immediately after save
      setTimeout(() => {
        justSavedRef.current = false;
      }, 50);
      
      // Invalidate other queries that depend on BDI config
      queryClient.invalidateQueries({ queryKey: ['budget-calculations', budgetId] });
      
      toast({
        title: t('common:success'),
        description: t('budgets:notifications.bdiUpdated'),
      });
    },
    onError: (error: any) => {
      // Ensure error message is a string, not an object
      const errorMessage = typeof error?.message === 'string' 
        ? error.message 
        : error?.message?.message || t('budgets:errors.bdiUpdateFailed');
      
      toast({
        title: t('common:error'),
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    // Skip reset if we just saved (to prevent resetting with stale data)
    if (justSavedRef.current) {
      justSavedRef.current = false;
      return;
    }
    
    // Only reset form when data changes AND we're not currently editing
    if (bdiConfig && !isEditing && !updateBDI.isPending) {
      reset(bdiConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bdiConfigData, isEditing, updateBDI.isPending]);

  const onSubmit = (data: BDIConfig) => {
    updateBDI.mutate(data);
  };

  const handleCancel = () => {
    reset(bdiConfig);
    setIsEditing(false);
  };

  // Watch all values for real-time calculation
  const values = watch();

    // Calculate total BDI percentage
    // Formula: ((((1+AC)*(1+CF)*(1+R)*(1+L))/(1-TotalTaxes))-1)
    // Where: AC=Central Admin, CF=Financial Costs, R=Risk/Insurance, L=Profit Margin
    // TotalTaxes = PIS + COFINS + ISS (NOT including Other Taxes or Social Taxes)
    const calculateTotalBDI = () => {
      if (!values) return 0;
      
      const {
        central_admin = 0,
        financial_costs = 0,
        risks_insurance = 0,
        profit_margin = 0,
        pis = 0,
        cofins = 0,
        iss = 0,
      } = values;

      // Convert percentages to decimals
      const ac = central_admin / 100;
      const cf = financial_costs / 100;
      const r = risks_insurance / 100;
      const l = profit_margin / 100;
      const totalTaxes = (pis + cofins + iss) / 100;

      // Numerator: (1+AC) * (1+CF) * (1+R) * (1+L)
      const numerator = (1 + ac) * (1 + cf) * (1 + r) * (1 + l);
      
      // Denominator: 1 - TotalTaxes
      const denominator = 1 - totalTaxes;
      
      if (denominator === 0) return 0;
      
      // BDI = (numerator / denominator) - 1
      return ((numerator / denominator) - 1) * 100;
    };

  const totalBDI = calculateTotalBDI();
  const bdiAmount = (totalDirectCost * totalBDI) / 100;

  if (isLoading) {
    return <div className="p-8 text-center">{t('common:loading')}</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{t('budgets:bdi.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('budgets:bdi.description')}
          </p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button type="button" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('common:edit')}
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                {t('common:cancel')}
              </Button>
              <Button type="submit" disabled={updateBDI.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateBDI.isPending ? t('common:saving') : t('common:save')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Note: Summary cards are now displayed at the top of BudgetEditor for all tabs */}

      {/* BDI Configuration Form */}
      <Card>
        <CardContent className="space-y-6 pt-8">
          {/* Overhead and Administrative Costs */}
          <div>
            <h4 className="font-semibold text-sm mb-3">{t('budgets:bdi.overheadCosts')}</h4>
            <div className="grid grid-cols-5 gap-4">
              <div className="space-y-1">
                <Label htmlFor="central_admin" className="text-xs">{t('budgets:bdi.centralAdmin')}</Label>
                <div className="flex gap-1 items-center">
                  <Controller
                    name="central_admin"
                    control={control}
                    rules={{ min: 0, max: 100 }}
                    render={({ field }) => (
                      <Input
                        id="central_admin"
                        type="number"
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          field.onChange(val);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={!isEditing}
                        className="w-full text-sm"
                      />
                    )}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="site_overhead" className="text-xs">{t('budgets:bdi.siteOverhead')}</Label>
                <div className="flex gap-1 items-center">
                  <Controller
                    name="site_overhead"
                    control={control}
                    rules={{ min: 0, max: 100 }}
                    render={({ field }) => (
                      <Input
                        id="site_overhead"
                        type="number"
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          field.onChange(val);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={!isEditing}
                        className="w-full text-sm"
                      />
                    )}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="financial_costs" className="text-xs">{t('budgets:bdi.financialCosts')}</Label>
                <div className="flex gap-1 items-center">
                  <Controller
                    name="financial_costs"
                    control={control}
                    rules={{ min: 0, max: 100 }}
                    render={({ field }) => (
                      <Input
                        id="financial_costs"
                        type="number"
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          field.onChange(val);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={!isEditing}
                        className="w-full text-sm"
                      />
                    )}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="risks_insurance" className="text-xs">{t('budgets:bdi.risksInsurance')}</Label>
                <div className="flex gap-1 items-center">
                  <Controller
                    name="risks_insurance"
                    control={control}
                    rules={{ min: 0, max: 100 }}
                    render={({ field }) => (
                      <Input
                        id="risks_insurance"
                        type="number"
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          field.onChange(val);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={!isEditing}
                        className="w-full text-sm"
                      />
                    )}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="profit_margin" className="text-xs">{t('budgets:bdi.profitMargin')}</Label>
                <div className="flex gap-1 items-center">
                  <Controller
                    name="profit_margin"
                    control={control}
                    rules={{ min: 0, max: 100 }}
                    render={({ field }) => (
                      <Input
                        id="profit_margin"
                        type="number"
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          field.onChange(val);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={!isEditing}
                        className="w-full text-sm"
                      />
                    )}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Taxes */}
          <div>
            <h4 className="font-semibold text-sm mb-3">{t('budgets:bdi.taxSection')}</h4>
            <div className="grid grid-cols-5 gap-4">
              <div className="space-y-1">
                <Label htmlFor="pis" className="text-xs">PIS</Label>
                <div className="flex gap-1 items-center">
                  <Controller
                    name="pis"
                    control={control}
                    rules={{ min: 0, max: 100 }}
                    render={({ field }) => (
                      <Input
                        id="pis"
                        type="number"
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          field.onChange(val);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={!isEditing}
                        className="w-full text-sm"
                      />
                    )}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="cofins" className="text-xs">COFINS</Label>
                <div className="flex gap-1 items-center">
                  <Controller
                    name="cofins"
                    control={control}
                    rules={{ min: 0, max: 100 }}
                    render={({ field }) => (
                      <Input
                        id="cofins"
                        type="number"
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          field.onChange(val);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={!isEditing}
                        className="w-full text-sm"
                      />
                    )}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="iss" className="text-xs">ISS</Label>
                <div className="flex gap-1 items-center">
                  <Controller
                    name="iss"
                    control={control}
                    rules={{ min: 0, max: 100 }}
                    render={({ field }) => (
                      <Input
                        id="iss"
                        type="number"
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          field.onChange(val);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={!isEditing}
                        className="w-full text-sm"
                      />
                    )}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="other_taxes" className="text-xs">{t('budgets:bdi.otherTaxes')}</Label>
                <div className="flex gap-1 items-center">
                  <Controller
                    name="other_taxes"
                    control={control}
                    rules={{ min: 0, max: 100 }}
                    render={({ field }) => (
                      <Input
                        id="other_taxes"
                        type="number"
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          field.onChange(val);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={!isEditing}
                        className="w-full text-sm"
                      />
                    )}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="social_taxes" className="text-xs">{t('budgets:bdi.socialTaxes')}</Label>
                <div className="flex gap-1 items-center">
                  <Controller
                    name="social_taxes"
                    control={control}
                    rules={{ min: 0, max: 100 }}
                    render={({ field }) => (
                      <Input
                        id="social_taxes"
                        type="number"
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                          field.onChange(val);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        disabled={!isEditing}
                        className="w-full text-sm"
                      />
                    )}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* BDI Calculation Info */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2 text-blue-900 dark:text-blue-100">
              {t('budgets:bdi.formula')}
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-200 font-mono">
              BDI = ((((1+AC)*(1+CF)*(1+R)*(1+L))/(1-TotalTaxes))-1)
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
              AC=Central Admin, CF=Financial Costs, R=Risk/Insurance, L=Profit Margin, TotalTaxes=PIS+COFINS+ISS
            </p>
          </div>

          {/* Calculated Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('budgets:bdi.subtotalOverhead')}</span>
              <span className="font-semibold">
                {((values.central_admin || 0) + (values.financial_costs || 0) + (values.risks_insurance || 0) + (values.profit_margin || 0)).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('budgets:bdi.subtotalTaxes')}</span>
              <span className="font-semibold">
                {((values.pis || 0) + (values.cofins || 0) + (values.iss || 0)).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('budgets:bdi.socialTaxes')}</span>
              <span className="font-semibold">
                {(values.social_taxes || 0).toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>{t('budgets:bdi.totalBdi')}</span>
              <span className="text-orange-600">{totalBDI.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span>{t('budgets:editor.bdiValue')}</span>
              <span className="font-semibold">{formatCurrency(bdiAmount, 'BRL')}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
};

