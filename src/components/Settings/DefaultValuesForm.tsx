import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { BRAZILIAN_STATES } from "@/constants/brazilianStates";

interface DefaultValuesFormData {
  labor_rate_mason: number;
  labor_rate_plumber: number;
  labor_rate_electrician: number;
  labor_rate_painter: number;
  labor_rate_manager: number;
  default_state: string;
  default_profit_margin: number;
  default_freight_percentage: number;
  default_payment_terms: string;
  installments_due_days: number;
}

export function DefaultValuesForm() {
  const { settings, updateSettings } = useAppSettings();
  const { t } = useLocalization();
  
  const form = useForm<DefaultValuesFormData>({
    values: settings ? {
      labor_rate_mason: settings.labor_rate_mason || 0,
      labor_rate_plumber: settings.labor_rate_plumber || 0,
      labor_rate_electrician: settings.labor_rate_electrician || 0,
      labor_rate_painter: settings.labor_rate_painter || 0,
      labor_rate_manager: settings.labor_rate_manager || 0,
      default_state: settings.default_state || 'SP',
      default_profit_margin: settings.default_profit_margin || 10,
      default_freight_percentage: settings.default_freight_percentage || 5,
      default_payment_terms: settings.default_payment_terms || 'standard',
      installments_due_days: settings.installments_due_days || 3,
    } : undefined,
  });

  const onSubmit = (data: DefaultValuesFormData) => {
    updateSettings.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">{t('settings.defaultValuesForm.defaultLaborRatesTitle')}</h3>
          <div className="flex gap-4">
             <FormField
              control={form.control}
              name="labor_rate_mason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.defaultValuesForm.laborRates.mason')}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      value={field.value ? formatCurrency(field.value, 'USD') : '$0.00'}
                      onChange={(e) => {
                        // Extract numeric value from currency input
                        const numericValue = parseFloat(e.target.value.replace(/[^0-9.-]/g, '')) || 0;
                        field.onChange(numericValue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
              control={form.control}
              name="labor_rate_plumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.defaultValuesForm.laborRates.plumber')}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      value={field.value ? formatCurrency(field.value, 'USD') : '$0.00'}
                      onChange={(e) => {
                        // Extract numeric value from currency input
                        const numericValue = parseFloat(e.target.value.replace(/[^0-9.-]/g, '')) || 0;
                        field.onChange(numericValue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
              control={form.control}
              name="labor_rate_electrician"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.defaultValuesForm.laborRates.electrician')}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      value={field.value ? formatCurrency(field.value, 'USD') : '$0.00'}
                      onChange={(e) => {
                        // Extract numeric value from currency input
                        const numericValue = parseFloat(e.target.value.replace(/[^0-9.-]/g, '')) || 0;
                        field.onChange(numericValue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
              control={form.control}
              name="labor_rate_painter"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.defaultValuesForm.laborRates.painter')}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      value={field.value ? formatCurrency(field.value, 'USD') : '$0.00'}
                      onChange={(e) => {
                        // Extract numeric value from currency input
                        const numericValue = parseFloat(e.target.value.replace(/[^0-9.-]/g, '')) || 0;
                        field.onChange(numericValue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
              control={form.control}
              name="labor_rate_manager"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.defaultValuesForm.laborRates.projectManager')}</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      value={field.value ? formatCurrency(field.value, 'USD') : '$0.00'}
                      onChange={(e) => {
                        // Extract numeric value from currency input
                        const numericValue = parseFloat(e.target.value.replace(/[^0-9.-]/g, '')) || 0;
                        field.onChange(numericValue);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">{t('settings.defaultValuesForm.defaultProjectSettingsTitle')}</h3>
          <div className="flex gap-4 flex-wrap">
            <FormField
              control={form.control}
              name="default_state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.defaultValuesForm.defaultStateSINAPI')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('settings.defaultValuesForm.selectStatePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BRAZILIAN_STATES.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="default_profit_margin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.defaultValuesForm.defaultProfitMargin')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="default_freight_percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.defaultValuesForm.defaultFreightPercentage')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="default_payment_terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.defaultValuesForm.defaultPaymentTerms')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('settings.defaultValuesForm.paymentTermsPlaceholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="installments_due_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.defaultValuesForm.installmentsDueDays')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1"
                      step="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button type="submit" disabled={updateSettings.isPending}>
          {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('settings.defaultValuesForm.saveDefaultValues')}
        </Button>
      </form>
    </Form>
  );
}
