import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Loader2, RotateCcw, Info } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

export function BDIParametersForm() {
  const { settings, updateSettings, bdiTotal, resetBDIDefaults } = useAppSettings();
  const { t } = useLocalization();

  const form = useForm({
    values: settings ? {
      bdi_central_admin: settings.bdi_central_admin || 0,
      bdi_site_overhead: settings.bdi_site_overhead || 0,
      bdi_financial_costs: settings.bdi_financial_costs || 0,
      bdi_risks_insurance: settings.bdi_risks_insurance || 0,
      bdi_pis: settings.bdi_pis || 0,
      bdi_cofins: settings.bdi_cofins || 0,
      bdi_iss: settings.bdi_iss || 0,
      bdi_social_taxes: settings.bdi_social_taxes || 0,
      bdi_profit_margin: settings.bdi_profit_margin || 0,
    } : undefined,
  });

  const onSubmit = (data: any) => {
    updateSettings.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-start gap-2 p-4 bg-muted/50 rounded-lg">
           <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
           <div className="text-sm text-muted-foreground">
             <strong>{t("settings:bdi.infoTitle")}</strong> {t("settings:bdi.infoDescription")}
             <br />
             <strong>{t("settings:bdi.infoFormulaLabel")}</strong> {t("settings:bdi.infoFormula")}
             <br />
             {t("settings:bdi.infoTaxesDescription")}
           </div>
         </div>

        <div className="flex gap-6">
          {/* Left side - 80% width */}
          <div className="flex-1" style={{ width: '80%' }}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="bdi_central_admin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings:bdi.fields.centralAdmin")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>{t("settings:bdi.descriptions.centralAdmin")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bdi_site_overhead"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings:bdi.fields.siteOverhead")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>{t("settings:bdi.descriptions.siteOverhead")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bdi_financial_costs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings:bdi.fields.financialCosts")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>{t("settings:bdi.descriptions.financialCosts")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bdi_risks_insurance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings:bdi.fields.risksInsurance")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>{t("settings:bdi.descriptions.risksInsurance")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <FormField
                 control={form.control}
                 name="bdi_pis"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>{t("settings:bdi.fields.pis")}</FormLabel>
                     <FormControl>
                       <Input
                         type="number"
                         step="0.1"
                         {...field}
                         onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                       />
                     </FormControl>
                     <FormDescription>{t("settings:bdi.descriptions.pis")}</FormDescription>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               <FormField
                 control={form.control}
                 name="bdi_cofins"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>{t("settings:bdi.fields.cofins")}</FormLabel>
                     <FormControl>
                       <Input
                         type="number"
                         step="0.1"
                         {...field}
                         onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                       />
                     </FormControl>
                     <FormDescription>{t("settings:bdi.descriptions.cofins")}</FormDescription>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               <FormField
                 control={form.control}
                 name="bdi_iss"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>{t("settings:bdi.fields.iss")}</FormLabel>
                     <FormControl>
                       <Input
                         type="number"
                         step="0.1"
                         {...field}
                         onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                       />
                     </FormControl>
                     <FormDescription>{t("settings:bdi.descriptions.iss")}</FormDescription>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               <FormField
                 control={form.control}
                 name="bdi_social_taxes"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>{t("settings:bdi.fields.socialTaxes")}</FormLabel>
                     <FormControl>
                       <Input
                         type="number"
                         step="0.1"
                         {...field}
                         onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                       />
                     </FormControl>
                     <FormDescription>{t("settings:bdi.descriptions.socialTaxes")}</FormDescription>
                     <FormMessage />
                   </FormItem>
                 )}
               />

              <FormField
                control={form.control}
                name="bdi_profit_margin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings:bdi.fields.profitMargin")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>{t("settings:bdi.descriptions.profitMargin")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Right side - 20% width */}
          <div className="flex flex-col justify-center items-end" style={{ width: '20%' }}>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full">
              <div className="text-right">
                <h4 className="text-lg font-semibold mb-2 text-green-800">{t("settings:bdi.totalLabel")}</h4>
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {bdiTotal.toFixed(2)}%
                </div>
                <p className="text-sm text-green-700">{t("messages.sumOfAllParameters")}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-end">
          <Button type="submit" disabled={updateSettings.isPending}>
            {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("settings:bdi.saveButton")}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={resetBDIDefaults}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("settings:bdi.resetButton")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
