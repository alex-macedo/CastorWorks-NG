import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Loader2, Download } from "lucide-react";
import { BRAZILIAN_STATES } from "@/constants/brazilianStates";
import { format } from "date-fns";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useLocalization } from "@/contexts/LocalizationContext";
export function SinapiConfigForm() {
  const { settings, updateSettings } = useAppSettings();
  const { formatLongDate } = useDateFormat();
  const { t } = useLocalization();
  
  const form = useForm({
    values: settings ? {
      default_state: settings.default_state || 'SP',
      sinapi_auto_update: settings.sinapi_auto_update || false,
      sinapi_freight_markup: settings.sinapi_freight_markup || 5,
      sinapi_material_markup: settings.sinapi_material_markup || 10,
    } : undefined,
  });

  const onSubmit = (data: any) => {
    updateSettings.mutate(data);
  };

  const handleDownloadSinapi = () => {
    // TODO: Implement SINAPI table download
    console.log('Download SINAPI table');
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {settings?.sinapi_last_update && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm">
              <strong>{t('settings.sinapi.lastUpdate')}:</strong> {formatLongDate(new Date(settings.sinapi_last_update))}
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <FormField
          control={form.control}
          name="default_state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.sinapi.defaultState')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('settings.sinapi.selectState')} />
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
              <FormDescription>
                {t('settings.sinapi.pricesVaryByState')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sinapi_freight_markup"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.sinapi.freightMarkup')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>
                {t('settings.sinapi.freightMarkupDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sinapi_material_markup"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('settings.sinapi.materialMarkup')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>
                {t('settings.sinapi.materialMarkupDescription')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sinapi_auto_update"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">{t('settings.sinapi.autoUpdatePrices')}</FormLabel>
                <FormDescription>
                  {t('settings.sinapi.autoUpdatePricesDescription')}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        </div>

        <div className="flex gap-4 justify-end">
          <Button type="submit" disabled={updateSettings.isPending}>
            {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('settings.sinapi.saveConfiguration')}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadSinapi}
          >
            <Download className="mr-2 h-4 w-4" />
            {t('settings.sinapi.downloadTable')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
