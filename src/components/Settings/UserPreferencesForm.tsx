import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Loader2, Smartphone, Monitor, RefreshCw } from "lucide-react";
import { useLocalization } from "@/contexts/LocalizationContext";

export function UserPreferencesForm() {
  const { preferences, updatePreferences } = useUserPreferences();
  const { settings, updateSettings } = useAppSettings();
  const { data: currentUserRolesData = [] } = useUserRoles();
  const currentUserRoles = currentUserRolesData?.map(r => r.role) || [];
  const isSiteSupervisor = currentUserRoles.includes("site_supervisor");
  const { t } = useLocalization();

  const languages = [
    { value: 'pt-BR', label: t('settings.languageOptionsExtended.pt-BR') },
    { value: 'en-US', label: t('settings.languageOptionsExtended.en-US') },
    { value: 'es-ES', label: t('settings.languageOptionsExtended.es-ES') },
    { value: 'fr-FR', label: t('settings.languageOptionsExtended.fr-FR') },
  ];

  const currencies = [
    { value: 'BRL', label: t('settings.currencyOptions.BRL') },
    { value: 'USD', label: t('settings.currencyOptions.USD') },
    { value: 'EUR', label: t('settings.currencyOptions.EUR') },
  ];

  const dateFormats = [
    { value: 'DD/MM/YYYY', label: t('settings.dateFormatOptions.DD/MM/YYYY') },
    { value: 'MM/DD/YYYY', label: t('settings.dateFormatOptions.MM/DD/YYYY') },
    { value: 'YYYY-MM-DD', label: t('settings.dateFormatOptions.YYYY-MM-DD') },
    { value: 'MMM DD, YYYY', label: t('settings.userPreferences.dateFormatOptions.MMM_DD_YYYY') },
  ];
  
  const form = useForm({
    defaultValues: {
      language: 'pt-BR',
      currency: 'BRL',
      date_format: 'DD/MM/YYYY',
      theme: 'light',
      supervisor_interface_mode: 'auto',
      notifications_project_updates: true,
      notifications_financial_alerts: true,
      notifications_schedule_changes: true,
      notifications_material_delivery: false,
      default_report_template: 'standard',
    },
  });

  // Reset form when preferences or settings change
  useEffect(() => {
    if (preferences || settings) {
      form.reset({
        language: preferences?.language || 'pt-BR',
        currency: preferences?.currency || 'BRL',
        date_format: preferences?.date_format || settings?.system_date_format || 'DD/MM/YYYY',
        theme: preferences?.theme || 'light',
        supervisor_interface_mode: preferences?.supervisor_interface_mode || 'auto',
        notifications_project_updates: settings?.notifications_project_updates ?? true,
        notifications_financial_alerts: settings?.notifications_financial_alerts ?? true,
        notifications_schedule_changes: settings?.notifications_schedule_changes ?? true,
        notifications_material_delivery: settings?.notifications_material_delivery ?? false,
        default_report_template: settings?.default_report_template || 'standard',
      });
    }
  }, [preferences, settings, form]);

  const onSubmit = (data: any) => {
    // Update user preferences
    updatePreferences.mutate({
      language: data.language,
      currency: data.currency,
      date_format: data.date_format,
      theme: data.theme,
      supervisor_interface_mode: data.supervisor_interface_mode,
    });

    // Update app settings for notifications
    updateSettings.mutate({
      notifications_project_updates: data.notifications_project_updates,
      notifications_financial_alerts: data.notifications_financial_alerts,
      notifications_schedule_changes: data.notifications_schedule_changes,
      notifications_material_delivery: data.notifications_material_delivery,
      default_report_template: data.default_report_template,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">{t('settings.userPreferences.title')}</h3>
          <div className="flex gap-4">
            <div className="w-[30%]">
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.language')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="w-[15%]">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.currency')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((curr) => (
                          <SelectItem key={curr.value} value={curr.value}>
                            {curr.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="w-[20%]">
              <FormField
                control={form.control}
                name="date_format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.dateFormat')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dateFormats.map((fmt) => (
                          <SelectItem key={fmt.value} value={fmt.value}>
                            {fmt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="w-[15%]">
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.userPreferences.appearanceLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="light">{t('settings.userPreferences.appearanceOptions.light')}</SelectItem>
                        <SelectItem value="dark">{t('settings.userPreferences.appearanceOptions.dark')}</SelectItem>
                        <SelectItem value="system">{t('settings.userPreferences.appearanceOptions.system')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="w-[20%]">
              <FormField
                control={form.control}
                name="default_report_template"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.userPreferences.reportsLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">{t('settings.userPreferences.reportOptions.standard')}</SelectItem>
                        <SelectItem value="detailed">{t('settings.userPreferences.reportOptions.detailed')}</SelectItem>
                        <SelectItem value="summary">{t('settings.userPreferences.reportOptions.summary')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        {isSiteSupervisor && (
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('settings.userPreferences.supervisorTitle')}</h3>
            <FormField
              control={form.control}
              name="supervisor_interface_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('settings.userPreferences.supervisorModeLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="auto">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4" />
                          <span>{t('settings.userPreferences.supervisorModeOptions.auto')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="mobile">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          <span>{t('settings.userPreferences.supervisorModeOptions.mobile')}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="desktop">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          <span>{t('settings.userPreferences.supervisorModeOptions.desktop')}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {t('settings.userPreferences.supervisorModeDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-4">{t('settings.userPreferences.notificationsTitle')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="notifications_project_updates"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('settings.projectUpdates')}</FormLabel>
                    <FormDescription>
                      {t('settings.userPreferences.notificationsDescriptions.projectUpdates')}
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

            <FormField
              control={form.control}
              name="notifications_financial_alerts"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('settings.financialAlerts')}</FormLabel>
                    <FormDescription>
                      {t('settings.userPreferences.notificationsDescriptions.financialAlerts')}
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

            <FormField
              control={form.control}
              name="notifications_schedule_changes"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('settings.notifications.scheduleChanges')}</FormLabel>
                    <FormDescription>
                      {t('settings.userPreferences.notificationsDescriptions.scheduleChanges')}
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

            <FormField
              control={form.control}
              name="notifications_material_delivery"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t('settings.notifications.materialDelivery')}</FormLabel>
                    <FormDescription>
                      {t('settings.userPreferences.notificationsDescriptions.materialDelivery')}
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
        </div>



        <Button type="submit" disabled={updatePreferences.isPending || updateSettings.isPending}>
          {(updatePreferences.isPending || updateSettings.isPending) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {t('settings.userPreferences.saveButton')}
        </Button>
      </form>
    </Form>
  );
}
