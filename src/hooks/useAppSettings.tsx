import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useCallback } from "react";
// type AppSettings = Database['public']['Tables']['app_settings']['Row'] & {

/**
 * Contact type configuration for the Contact List dropdown
 */
export interface ContactTypeConfig {
  id: string;
  label: string;
  color: string;
}

/**
 * Strategy link configuration for the INSS Strategy lifecycle
 */
export interface StrategyLinkConfig {
  step_order: number;
  summary: string;
  description: string;
  external_url: string | null;
}

type AppSettings = {
  id?: string;
  installments_due_days?: number;
  system_language?: string;
  system_currency?: string;
  system_date_format?: string;
  system_time_zone?: string;
  system_weather_location?: string;
  system_temperature_unit?: string;
  system_number_format?: string;
  default_budget_model?: string;
  auto_create_simple_budget?: boolean;
  auto_create_bdi_brazil_budget?: boolean;
  auto_create_cost_control_budget?: boolean;
  sales_pipeline_columns?: string[] | null;
  roadmap_kanban_columns?: Array<{ id: string; labelKey?: string; label?: string; sort_order: number; hidden?: boolean }> | null;
  notifications_project_updates?: boolean;
  notifications_financial_alerts?: boolean;
  notifications_schedule_changes?: boolean;
  notifications_material_delivery?: boolean;
  notification_check_frequency_seconds?: number;
  bdi_central_admin?: number;
  bdi_site_overhead?: number;
  bdi_financial_costs?: number;
  bdi_risks_insurance?: number;
  bdi_pis?: number;
  bdi_cofins?: number;
  bdi_iss?: number;
  bdi_social_taxes?: number;
  bdi_taxes?: number; // Keep for backward compatibility
  bdi_profit_margin?: number;
  // Contact types configuration for Contact List
  contact_types?: ContactTypeConfig[];
  // INSS Strategy links configuration
  tax_strategy_links?: StrategyLinkConfig[];
};
type AppSettingsUpdate = {
  installments_due_days?: number;
  system_language?: string;
  system_currency?: string;
  system_date_format?: string;
  system_time_zone?: string;
  system_weather_location?: string;
  system_temperature_unit?: string;
  system_number_format?: string;
  default_budget_model?: string;
  auto_create_simple_budget?: boolean;
  auto_create_bdi_brazil_budget?: boolean;
  auto_create_cost_control_budget?: boolean;
  sales_pipeline_columns?: string[] | null;
  roadmap_kanban_columns?: Array<{ id: string; labelKey?: string; label?: string; sort_order: number; hidden?: boolean }> | null;
  notifications_project_updates?: boolean;
  notifications_financial_alerts?: boolean;
  notifications_schedule_changes?: boolean;
  notifications_material_delivery?: boolean;
  notification_check_frequency_seconds?: number;
  bdi_central_admin?: number;
  bdi_site_overhead?: number;
  bdi_financial_costs?: number;
  bdi_risks_insurance?: number;
  bdi_pis?: number;
  bdi_cofins?: number;
  bdi_iss?: number;
  bdi_social_taxes?: number;
  bdi_taxes?: number; // Keep for backward compatibility
  bdi_profit_margin?: number;
  // Contact types configuration for Contact List
  contact_types?: ContactTypeConfig[];
  // INSS Strategy links configuration
  tax_strategy_links?: StrategyLinkConfig[];
};

export const useAppSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      // If no settings exist, return default object without persisting
      if (!data) {
        return {
          id: 'default', // Virtual ID
          system_language: 'en-US',
          system_currency: 'USD',
          system_date_format: 'MM/dd/yyyy',
          notification_check_frequency_seconds: 15,
          bdi_central_admin: 3.5,
          bdi_site_overhead: 4.0,
          bdi_financial_costs: 2.0,
          bdi_risks_insurance: 2.5,
          bdi_pis: 1.65,
          bdi_cofins: 7.6,
          bdi_iss: 5.0,
          bdi_social_taxes: 22.0,
          bdi_profit_margin: 10.0,
        } as AppSettings;
      }
       
      return data as unknown as AppSettings;
    }
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: AppSettingsUpdate) => {
      if (!settings?.id) {
        throw new Error('Settings not loaded');
      }

      // Filter out undefined values, but keep null values (they're valid for JSONB columns)
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      const { data, error } = await supabase
        .from('app_settings')
        .update(cleanUpdates)
        .eq('id', settings.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast({
        title: 'Success',
        description: 'Settings updated successfully',
      });
    },
    onError: (error: Error) => {
      const isRoadmapColumnsMissing =
        /roadmap_kanban_columns|schema cache/i.test(error.message);
      if (isRoadmapColumnsMissing) {
        return;
      }
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Calculate BDI total using the formula: ((((1+AC)*(1+CF)*(1+R)*(1+L))/(1-TotalTaxes))-1)
  // Where TotalTaxes = PIS + COFINS + ISS
  const bdiTotal = useMemo(() => {
    if (!settings) return 0;

    // Convert percentages to decimals
    const ac = Number(settings.bdi_central_admin || 0) / 100;
    const cf = Number(settings.bdi_financial_costs || 0) / 100;
    const r = Number(settings.bdi_risks_insurance || 0) / 100;
    const l = Number(settings.bdi_profit_margin || 0) / 100;
    const totalTaxes = (Number(settings.bdi_pis || 0) + Number(settings.bdi_cofins || 0) + Number(settings.bdi_iss || 0)) / 100;

    // BDI formula: ((((1+AC)*(1+CF)*(1+R)*(1+L))/(1-TotalTaxes))-1)
    const numerator = (1 + ac) * (1 + cf) * (1 + r) * (1 + l);
    const denominator = 1 - totalTaxes;

    if (denominator <= 0) return 0; // Prevent division by zero or negative

    const bdi = (numerator / denominator) - 1;

    // For the specific values provided (AC=3.89, CF=1.62, R=1.09, L=7.05, TotalTaxes=8.6)
    // The calculation should result in exactly 25.00%
    // Round to avoid floating point precision issues
    return Number((bdi * 100).toFixed(2));
  }, [settings]);

  const resetBDIDefaults = useCallback(() => {
    updateSettings.mutate({
      bdi_central_admin: 3.5,
      bdi_site_overhead: 4.0,
      bdi_financial_costs: 2.0,
      bdi_risks_insurance: 2.5,
      bdi_pis: 1.65,
      bdi_cofins: 7.6,
      bdi_iss: 5.0,
      bdi_social_taxes: 22.0,
      bdi_profit_margin: 10.0,
    });
  }, [updateSettings]);

  return useMemo(() => ({
    settings,
    isLoading,
    updateSettings,
    bdiTotal,
    resetBDIDefaults,
  }), [settings, isLoading, updateSettings, bdiTotal, resetBDIDefaults]);
};
