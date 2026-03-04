import { useState, useEffect } from "react";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { TranslationDashboard } from "@/components/Settings/TranslationDashboard";
import { Building2, User, Bell, Lock, Languages, List, Users, Smartphone, Download, Upload, FileJson, Table, FileSpreadsheet, Database, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocalization, languageMetadata } from "@/contexts/LocalizationContext";
import { useNavigate } from "react-router-dom";
import { NumberFormatPreview } from "@/components/Settings/NumberFormatPreview";
import { toast } from "sonner";
import { exportAllData, exportTables, getAvailableTables } from "@/utils/dataExport";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { LocalizationTab } from "@/components/Settings/LocalizationTab";
import { TranslationCoverageCard } from "@/components/Settings/TranslationCoverageCard";
import { UITranslationEditor } from "@/components/Settings/UITranslationEditor";

import { DefaultValuesForm } from "@/components/Settings/DefaultValuesForm";
import { BDIParametersForm } from "@/components/Settings/BDIParametersForm";
import { SinapiConfigForm } from "@/components/Settings/SinapiConfigForm";
import { SinapiCatalogView } from "@/components/Settings/SinapiCatalogView";
import { ContactTypesManager } from "@/components/Settings/ContactTypesManager";
import { DropdownOptionsManager } from "@/components/Settings/DropdownOptionsManager";
import { INSSStrategyLinksManager } from "@/components/Settings/INSSStrategyLinksManager";
import { INSSReferenceDataManager } from "@/components/Settings/INSSReferenceDataManager";
import { UserPreferencesForm } from "@/components/Settings/UserPreferencesForm";
import { DataManagementPanel } from "@/components/Settings/DataManagementPanel";
import { DemoDataTab } from "@/components/Settings/DemoDataTab";
import { LogSearchPanel } from "@/components/Settings/LogSearchPanel";
import { GoogleDriveSettings } from "@/components/Settings/GoogleDriveSettings";
import { CalendarSyncButton } from "@/components/Schedule/CalendarSyncButton";
import { UserManagementPanel } from "@/components/Settings/UserManagementPanel";
import { EditCompanyProfileDialog } from "@/components/Settings/EditCompanyProfileDialog";
import { EditProfileDialog } from "@/components/Settings/EditProfileDialog";
import { NotificationPreferencesDialog } from "@/components/Settings/NotificationPreferencesDialog";
import { ChangePasswordDialog } from "@/components/Settings/ChangePasswordDialog";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserRoles } from "@/hooks/useUserRoles";
import { RequireAdministrativeRoles, RequireAdmin, RequireFinancialRoles } from "@/components/RoleGuard";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAppSettings } from "@/hooks/useAppSettings";
import { RolePermissionsTable } from "@/components/Settings/RolePermissionsTable";
import { SidebarOrderManager } from "@/components/Settings/SidebarOrderManager";
import { ROLE_LABEL_KEYS } from "@/constants/rolePermissions";
import { ApiTestingTools } from "@/components/Settings/ApiTestingTools";
import { ThirdPartyServices } from "@/components/Settings/ThirdPartyServices";
import { AIProviderSettings } from "@/components/Settings/AIProviderSettings";
import { WhatsAppAiAutoResponderCard } from "@/components/Settings/WhatsAppAiAutoResponderCard";
import { AdminToolsPanel } from "@/components/Settings/AdminToolsPanel";
import { SubscriptionPage } from "@/components/Settings/SubscriptionPage";
import { BillingPage } from "@/components/Settings/BillingPage";
const Settings = () => {
  const navigate = useNavigate();
  const { language, currency, timeZone, weatherLocation, temperatureUnit, numberFormat, updateSettings, t } = useLocalization();
  const { data: currentUser } = useUserProfile();
  const { data: currentUserRolesData = [], isLoading: rolesLoading } = useUserRoles();
  const currentUserRoles = currentUserRolesData?.map(r => r.role) || [];
  const { settings: companySettings } = useCompanySettings();
  const { settings: appSettings, updateSettings: updateAppSettings } = useAppSettings() as any;
   
  const [isCompanyProfileDialogOpen, setIsCompanyProfileDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isNotificationsDialogOpen, setIsNotificationsDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [systemPrefsForm, setSystemPrefsForm] = useState(() => ({
    system_language: appSettings?.system_language || 'en-US',
    system_currency: appSettings?.system_currency || 'USD',
    system_date_format: appSettings?.system_date_format || 'MM/DD/YYYY',
    system_time_zone: appSettings?.system_time_zone || 'America/New_York',
    system_weather_location: appSettings?.system_weather_location || 'New York, USA',
    system_temperature_unit: appSettings?.system_temperature_unit || 'F',
    system_number_format: appSettings?.system_number_format || 'compact',
    default_budget_model: appSettings?.default_budget_model || 'simple',
    auto_create_simple_budget: appSettings?.auto_create_simple_budget || false,
    auto_create_bdi_brazil_budget: appSettings?.auto_create_bdi_brazil_budget || false,
    auto_create_cost_control_budget: appSettings?.auto_create_cost_control_budget || false
  }));
  const [hasSystemPrefsChanges, setHasSystemPrefsChanges] = useState(false);

  // Data management state
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'excel'>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [availableTables, setAvailableTables] = useState<any[]>([]);

  // Load available tables for selective export
  useEffect(() => {
    const loadTables = async () => {
      try {
        const tables = await getAvailableTables();
        setAvailableTables(tables);
      } catch (error) {
        console.error('Failed to load available tables:', error);
      }
    };
    loadTables();
  }, []);

  // Handle URL query param for tab selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab);
      // Clean up URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

    // Update form when app settings change
    useEffect(() => {
      if (appSettings) {
        setSystemPrefsForm({
          system_language: appSettings.system_language || 'en-US',
          system_currency: appSettings.system_currency || 'USD',
          system_date_format: appSettings.system_date_format || 'MM/DD/YYYY',
          system_time_zone: appSettings.system_time_zone || 'America/New_York',
          system_weather_location: appSettings.system_weather_location || 'New York, USA',
          system_temperature_unit: appSettings.system_temperature_unit || 'F',
          system_number_format: appSettings.system_number_format || 'compact',
          default_budget_model: appSettings.default_budget_model || 'simple',
          auto_create_simple_budget: appSettings.auto_create_simple_budget || false,
          auto_create_bdi_brazil_budget: appSettings.auto_create_bdi_brazil_budget || false,
          auto_create_cost_control_budget: appSettings.auto_create_cost_control_budget || false
        });
      }
    }, [appSettings]);

  const handleSaveChanges = () => {
    toast.success(t('settings.settingsUpdated'));
  };

  const handleSaveSystemSettings = () => {
    if (!canEditSystemSettings) {
      toast.error(t('settings.adminRequired'));
      return;
    }
    toast.success(t('settings.systemSettingsUpdated'));
  };

  const updateSystemPrefsForm = (field: string, value: string | boolean) => {
    if (!canEditSystemSettings) return;

    setSystemPrefsForm(prev => ({
      ...prev,
      [field]: value
    }));
    setHasSystemPrefsChanges(true);
  };

  const saveSystemPreferences = () => {
    if (!canEditSystemSettings || !hasSystemPrefsChanges) return;

    // Only send the actual system preference fields
    const safeUpdates = {
      system_language: systemPrefsForm.system_language,
      system_currency: systemPrefsForm.system_currency,
      system_date_format: systemPrefsForm.system_date_format,
      system_time_zone: systemPrefsForm.system_time_zone,
      system_weather_location: systemPrefsForm.system_weather_location,
      system_temperature_unit: systemPrefsForm.system_temperature_unit,
      system_number_format: systemPrefsForm.system_number_format,
      default_budget_model: systemPrefsForm.default_budget_model,
      auto_create_simple_budget: systemPrefsForm.auto_create_simple_budget,
      auto_create_bdi_brazil_budget: systemPrefsForm.auto_create_bdi_brazil_budget,
      auto_create_cost_control_budget: systemPrefsForm.auto_create_cost_control_budget,
    };

    updateAppSettings.mutate(safeUpdates, {
      onSuccess: () => {
        setHasSystemPrefsChanges(false);
        toast.success(t('settings.systemSettingsUpdated'));
      },
      onError: () => {
        toast.error(t('settings.errorSavingSettings'));
      }
    });
  };

  // Data management functions
  const handleQuickBackup = async () => {
    setIsExporting(true);
    try {
      await exportAllData();
      toast.success('Data exported successfully');
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectiveExport = async () => {
    if (selectedTables.length === 0) {
      toast.error('Please select at least one table to export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    try {
      await exportTables(selectedTables, exportFormat, setExportProgress);
      toast.success(`Data exported successfully as ${exportFormat.toUpperCase()}`);
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleSelectAllTables = () => {
    if (selectedTables.length === availableTables.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(availableTables.map(table => table.name));
    }
  };

  const mappedRoles = currentUserRoles.map((role) => t(ROLE_LABEL_KEYS[role] || role));
  const canAccessSettings = currentUserRoles.includes("admin") || currentUserRoles.includes("global_admin");
  const canEditSystemSettings = currentUserRoles.includes("admin") || currentUserRoles.includes("global_admin");

  if (rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!canAccessSettings) {
    return (
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('settings.subtitle')}</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-warning/10">
                <Lock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle>{t('settings.settingsAccessRestrictedTitle')}</CardTitle>
                <CardDescription>{t('settings.settingsAccessRestrictedDescription')}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">{t('settings.subtitle')}</p>
          </div>
        </div>
      </SidebarHeaderShell>

      <Tabs value={activeTab} onValueChange={setActiveTab} variant="pill" className="w-full">
        <TabsList className="flex flex-nowrap gap-0.5 h-auto p-1 rounded-xl bg-muted/40 border border-border/50 w-full justify-start items-center overflow-x-auto scrollbar-hide">
          <TabsTrigger value="general" className="whitespace-nowrap text-[11px] sm:text-xs px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t('settings.tabs.general')}</TabsTrigger>

          <RequireAdministrativeRoles>
            <TabsTrigger value="users" className="whitespace-nowrap text-[11px] sm:text-xs px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t('settings.tabs.users')}</TabsTrigger>
          </RequireAdministrativeRoles>

          <TabsTrigger value="preferences" className="whitespace-nowrap text-[11px] sm:text-xs px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t("settings:tabs.preferences")}</TabsTrigger>
          <TabsTrigger value="subscription" className="whitespace-nowrap text-[11px] sm:text-xs px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t("settings:tabs.subscription")}</TabsTrigger>
          <TabsTrigger value="billing" className="whitespace-nowrap text-[11px] sm:text-xs px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t("settings:tabs.billing")}</TabsTrigger>
          <TabsTrigger value="business-settings" className="whitespace-nowrap text-[11px] sm:text-xs px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t("settings:tabs.business-settings")}</TabsTrigger>
          <TabsTrigger value="integrations" className="whitespace-nowrap text-[11px] sm:text-xs px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t('settings.tabs.integrations')}</TabsTrigger>
          <TabsTrigger value="data-management" className="whitespace-nowrap text-[11px] sm:text-xs px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t("settings:tabs.data-management")}</TabsTrigger>
          <RequireAdmin>
            <TabsTrigger value="log-search" className="whitespace-nowrap text-[11px] sm:text-xs px-2 py-1.5 h-auto min-w-0 flex-shrink-0">Log Search</TabsTrigger>
          </RequireAdmin>

          <RequireAdmin>
            <TabsTrigger value="system-translation" className="whitespace-nowrap text-[11px] sm:text-xs px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t("settings:tabs.system-translation")}</TabsTrigger>
          </RequireAdmin>
          <TabsTrigger value="pwa" className="whitespace-nowrap text-[11px] sm:text-xs px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t('settings.tabs.pwa')}</TabsTrigger>
          <RequireAdmin>
            <TabsTrigger value="admin-tools" className="whitespace-nowrap text-[11px] sm:text-xs px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t('settings.adminTools.title', 'Admin Tools')}</TabsTrigger>
          </RequireAdmin>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col h-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>{t('settings.companyProfileTitle')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 min-h-0">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('settings.companyName')}</p>
                <p className="font-medium">{companySettings?.company_name || t('settings.status.notSet')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('settings.contactEmail')}</p>
                <p className="font-medium">{companySettings?.email || t('settings.status.notSet')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('settings.phone')}</p>
                <p className="font-medium">{companySettings?.phone || t('settings.status.notSet')}</p>
              </div>
            </div>
            <Button
              className="w-full hover:bg-primary/10/90 mt-auto"
              onClick={() => setIsCompanyProfileDialogOpen(true)}
            >
              {t('settings.editCompanyProfile')}
            </Button>
           </CardContent>
         </Card>



         <Card className="flex flex-col h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-success/10">
                  <User className="h-5 w-5 text-success" />
                </div>
                <CardTitle>{t('settings.userProfile')}</CardTitle>
             </div>
           </CardHeader>
           <CardContent className="flex flex-col flex-1 min-h-0">
             <div className="space-y-4">
               <div>
                 <p className="text-sm text-muted-foreground mb-1">{t('settings.name')}</p>
                 <p className="font-medium">{currentUser?.display_name || t('settings.status.notSet')}</p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground mb-1">{t('settings.email')}</p>
                 <p className="font-medium">{currentUser?.email || t('settings.status.notSet')}</p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground mb-1">{t('settings.role')}</p>
                 <p className="font-medium">{mappedRoles.length ? mappedRoles.join(", ") : t('settings.status.noRoles')}</p>
               </div>
             </div>
             <Button 
               className="w-full hover:bg-primary/10/90 mt-auto"
               onClick={() => setIsUserDialogOpen(true)}
             >
               {t('settings.editProfile')}
             </Button>
           </CardContent>
         </Card>

         <Card className="flex flex-col h-full">
           <CardHeader>
             <div className="flex items-center gap-2">
               <div className="p-2 rounded-lg bg-warning/10">
                 <Bell className="h-5 w-5 text-warning" />
               </div>
               <CardTitle>{t('settings.notificationPreferences')}</CardTitle>
             </div>
           </CardHeader>
           <CardContent className="flex flex-col flex-1 min-h-0">
             <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <span className="text-sm">{t('settings.projectUpdates')}</span>
                 <Badge className={appSettings?.notifications_project_updates ? "bg-success hover:bg-success" : "bg-muted hover:bg-muted"}>
                   {appSettings?.notifications_project_updates ? t('settings.enabled') : t('settings.disabled')}
                 </Badge>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-sm">{t('settings.financialAlerts')}</span>
                 <Badge className={appSettings?.notifications_financial_alerts ? "bg-success hover:bg-success" : "bg-muted hover:bg-muted"}>
                   {appSettings?.notifications_financial_alerts ? t('settings.enabled') : t('settings.disabled')}
                 </Badge>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-sm">{t('settings.notifications.scheduleChanges')}</span>
                 <Badge className={appSettings?.notifications_schedule_changes ? "bg-success hover:bg-success" : "bg-muted hover:bg-muted"}>
                   {appSettings?.notifications_schedule_changes ? t('settings.enabled') : t('settings.disabled')}
                 </Badge>
               </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('settings.notifications.materialDelivery')}</span>
                  <Badge className={appSettings?.notifications_material_delivery ? "bg-success hover:bg-success" : "bg-muted hover:bg-muted"}>
                    {appSettings?.notifications_material_delivery ? t('settings.enabled') : t('settings.disabled')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('settings.notifications.checkFrequency')}</span>
                  <Badge className="bg-muted hover:bg-muted">
                    {t('settings.notifications.checkFrequencyValue', {
                      value: appSettings?.notification_check_frequency_seconds ?? 15,
                    })}
                  </Badge>
                </div>

             </div>
             <Button 
               className="w-full hover:bg-primary/10/90 mt-auto"
               onClick={() => setIsNotificationsDialogOpen(true)}
             >
               {t('settings.manageNotifications')}
             </Button>
           </CardContent>
         </Card>

         <Card className="flex flex-col h-full">
           <CardHeader>
             <div className="flex items-center gap-2">
               <div className="p-2 rounded-lg bg-secondary/10">
                 <Lock className="h-5 w-5 text-secondary" />
               </div>
               <CardTitle>{t('settings.security')}</CardTitle>
             </div>
           </CardHeader>
           <CardContent className="flex flex-col flex-1 min-h-0">
             <div className="space-y-4">
               <div>
                 <p className="text-sm text-muted-foreground mb-1">{t('settings.password')}</p>
                 <p className="font-medium">••••••••</p>
               </div>
               <div>
                 <p className="text-sm text-muted-foreground mb-1">
                   {t('settings.twoFactorAuth')}
                 </p>
                 <p className="font-medium">{t('settings.notEnabled')}</p>
               </div>
             </div>
             <Button 
               className="w-full hover:bg-primary/10/90 mt-auto"
               onClick={() => setIsPasswordDialogOpen(true)}
             >
               {t('settings.changePassword')}
             </Button>
           </CardContent>
         </Card>
       </div>


       
       <EditProfileDialog
         userId={currentUser?.id || ""}
         open={isUserDialogOpen}
         onClose={() => setIsUserDialogOpen(false)}
       />
       
       <NotificationPreferencesDialog
         open={isNotificationsDialogOpen}
         onClose={() => setIsNotificationsDialogOpen(false)}
       />
       
       <ChangePasswordDialog
         open={isPasswordDialogOpen}
         onClose={() => setIsPasswordDialogOpen(false)}
       />

       <EditCompanyProfileDialog
         open={isCompanyProfileDialogOpen}
         onClose={() => setIsCompanyProfileDialogOpen(false)}
       />


         </TabsContent>

         <TabsContent value="subscription" className="mt-6">
           <SubscriptionPage />
         </TabsContent>

         <TabsContent value="billing" className="mt-6">
           <BillingPage />
         </TabsContent>

         <TabsContent value="users" className="space-y-6">
           <Tabs defaultValue="user-management" className="w-full">
             <TabsList className="grid w-full grid-cols-3">
               <TabsTrigger value="user-management">{t("settings:tabs.user-management")}</TabsTrigger>
               <TabsTrigger value="permissions">{t("settings:tabs.permission-management")}</TabsTrigger>
               <TabsTrigger value="menu-order">{t("settings:tabs.menu-order") || "Menu Order"}</TabsTrigger>
             </TabsList>

             <TabsContent value="user-management" className="mt-6">
               <UserManagementPanel />
             </TabsContent>

             <TabsContent value="permissions" className="mt-6">
               <RolePermissionsTable />
             </TabsContent>

             <TabsContent value="menu-order" className="mt-6">
               <SidebarOrderManager />
             </TabsContent>
           </Tabs>
         </TabsContent>



         <TabsContent value="preferences" className="space-y-6">
           <Tabs defaultValue="user-preferences" className="w-full">
             <TabsList className="grid w-full grid-cols-2">
               <TabsTrigger value="user-preferences">{t("settings:tabs.user-preferences")}</TabsTrigger>
               <TabsTrigger value="system-preferences">{t("settings:tabs.system-preferences")}</TabsTrigger>
             </TabsList>

             <TabsContent value="user-preferences" className="mt-6">
               <UserPreferencesForm />
             </TabsContent>

             <TabsContent value="system-preferences" className="mt-6">
               <Card>
                 <CardHeader>
                   <div className="flex items-center justify-between">
                     <CardTitle>{t('settings.systemPreferences')}</CardTitle>
                     {!canEditSystemSettings && (
                       <Badge variant="secondary" className="text-xs">
                         <Lock className="h-3 w-3 mr-1" />
                         {t('settings.adminOnly')}
                       </Badge>
                     )}
                   </div>
                   <CardDescription>
                     {canEditSystemSettings
                       ? t('settings.systemPreferencesAdminDescription')
                       : t('settings.systemPreferencesViewOnlyDescription')
                     }
                     <br />
                     <span className="text-xs text-muted-foreground">
                       {t('settings.systemPreferencesDefaultsNote')}
                     </span>
                   </CardDescription>
                 </CardHeader>
                 <CardContent>
           <div className="grid gap-4 lg:grid-cols-4 md:grid-cols-2">
                     <div className="space-y-2">
                        <Label htmlFor="system-language">{t("settings:defaultLanguageLabel")}</Label>
                       <Select
                         value={systemPrefsForm.system_language}
                         onValueChange={(value) => updateSystemPrefsForm('system_language', value)}
                         disabled={!canEditSystemSettings}
                       >
                         <SelectTrigger id="system-language">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="en-US">{t('settings.languageOptionsExtended.en-US')}</SelectItem>
                           <SelectItem value="pt-BR">{t('settings.languageOptionsExtended.pt-BR')}</SelectItem>
                           <SelectItem value="es-ES">{t('settings.languageOptionsExtended.es-ES')}</SelectItem>
                           <SelectItem value="fr-FR">{t('settings.languageOptionsExtended.fr-FR')}</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>

                     <div className="space-y-2">
                        <Label htmlFor="system-currency">{t("settings:defaultCurrencyLabel")}</Label>
                       <Select
                         value={systemPrefsForm.system_currency}
                         onValueChange={(value) => updateSystemPrefsForm('system_currency', value)}
                         disabled={!canEditSystemSettings}
                       >
                         <SelectTrigger id="system-currency">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="BRL">{t('settings.currencyOptions.BRL')}</SelectItem>
                           <SelectItem value="USD">{t('settings.currencyOptions.USD')}</SelectItem>
                           <SelectItem value="EUR">{t('settings.currencyOptions.EUR')}</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>

                     <div className="space-y-2">
                        <Label htmlFor="system-dateFormat">{t("settings:defaultDateFormatLabel")}</Label>
                       <Select
                         value={systemPrefsForm.system_date_format}
                         onValueChange={(value) => updateSystemPrefsForm('system_date_format', value)}
                         disabled={!canEditSystemSettings}
                       >
                         <SelectTrigger id="system-dateFormat">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="DD/MM/YYYY">{t('settings.dateFormatOptions.DD/MM/YYYY')}</SelectItem>
                           <SelectItem value="MM/DD/YYYY">{t('settings.dateFormatOptions.MM/DD/YYYY')}</SelectItem>
                           <SelectItem value="YYYY-MM-DD">{t('settings.dateFormatOptions.YYYY-MM-DD')}</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>

                     <div className="space-y-2">
                        <Label htmlFor="system-timeZone">{t("settings:systemTimeZoneLabel")}</Label>
                       <Select
                         value={systemPrefsForm.system_time_zone}
                         onValueChange={(value) => updateSystemPrefsForm('system_time_zone', value)}
                         disabled={!canEditSystemSettings}
                       >
                         <SelectTrigger id="system-timeZone">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="America/Sao_Paulo">{t('settings.timeZoneOptions.America/Sao_Paulo')}</SelectItem>
                           <SelectItem value="America/New_York">{t('settings.timeZoneOptions.America/New_York')}</SelectItem>
                           <SelectItem value="Europe/London">{t('settings.timeZoneOptions.Europe/London')}</SelectItem>
                           <SelectItem value="Asia/Tokyo">{t('settings.timeZoneOptions.Asia/Tokyo')}</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>

                     <div className="space-y-2">
                        <Label htmlFor="system-weatherLocation">{t("settings:systemWeatherLocationLabel")}</Label>
                       <Input
                         id="system-weatherLocation"
                         type="text"
                         value={systemPrefsForm.system_weather_location}
                         onChange={(e) => updateSystemPrefsForm('system_weather_location', e.target.value)}
                         placeholder={t('settings.weatherLocationPlaceholder')}
                         disabled={!canEditSystemSettings}
                       />
                     </div>

                     <div className="space-y-2">
                        <Label htmlFor="system-temperatureUnit">{t("settings:systemTemperatureUnitLabel")}</Label>
                       <Select
                         value={systemPrefsForm.system_temperature_unit}
                         onValueChange={(value) => updateSystemPrefsForm('system_temperature_unit', value)}
                         disabled={!canEditSystemSettings}
                       >
                         <SelectTrigger id="system-temperatureUnit">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="C">{t('settings.temperatureUnitOptions.C')}</SelectItem>
                           <SelectItem value="F">{t('settings.temperatureUnitOptions.F')}</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>

                     <div className="space-y-2">
                        <Label htmlFor="system-numberFormat">{t("settings:systemNumberFormatLabel")}</Label>
                       <Select
                         value={systemPrefsForm.system_number_format}
                         onValueChange={(value) => updateSystemPrefsForm('system_number_format', value)}
                         disabled={!canEditSystemSettings}
                       >
                         <SelectTrigger id="system-numberFormat">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="compact">{t('settings.numberFormatOptions.compact')}</SelectItem>
                           <SelectItem value="full">{t('settings.numberFormatOptions.full')}</SelectItem>
                         </SelectContent>
                       </Select>
                       <p className="text-xs text-muted-foreground">
                         {t('settings.numberFormatDescription')}
                       </p>
                     </div>

                     <div className="space-y-2">
                        <Label htmlFor="default-budget-model">{t("settings:defaultBudgetModelLabel")}</Label>
                       <Select
                         value={systemPrefsForm.default_budget_model}
                         onValueChange={(value) => updateSystemPrefsForm('default_budget_model', value)}
                         disabled={!canEditSystemSettings}
                       >
                         <SelectTrigger id="default-budget-model">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="simple">{t('projects:budgetTypeSimple')}</SelectItem>
                           <SelectItem value="bdi_brazil">{t('projects:budgetTypeBDIBrazil')}</SelectItem>
                           <SelectItem value="cost_control">{t('projects:budgetTypeCostControl')}</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   </div>

                   <div className="space-y-4 mt-6">
                     <div className="space-y-2">
                       <Label>{t("settings:autoCreateBudgetsLabel")}</Label>
                       <div className="space-y-3">
                         <div className="flex items-center space-x-2">
                           <Checkbox
                             id="auto-create-simple-budget"
                             checked={systemPrefsForm.auto_create_simple_budget || false}
                             onCheckedChange={(checked) => updateSystemPrefsForm('auto_create_simple_budget', checked as boolean)}
                             disabled={!canEditSystemSettings}
                           />
                           <Label htmlFor="auto-create-simple-budget" className="text-sm">
                             {t("settings:autoCreateBudgets.simple")}
                           </Label>
                         </div>
                         <div className="flex items-center space-x-2">
                           <Checkbox
                             id="auto-create-bdi-brazil-budget"
                             checked={systemPrefsForm.auto_create_bdi_brazil_budget || false}
                             onCheckedChange={(checked) => updateSystemPrefsForm('auto_create_bdi_brazil_budget', checked as boolean)}
                             disabled={!canEditSystemSettings}
                           />
                           <Label htmlFor="auto-create-bdi-brazil-budget" className="text-sm">
                             {t("settings:autoCreateBudgets.bdiBrazil")}
                           </Label>
                         </div>
                         <div className="flex items-center space-x-2">
                           <Checkbox
                             id="auto-create-cost-control-budget"
                             checked={systemPrefsForm.auto_create_cost_control_budget || false}
                             onCheckedChange={(checked) => updateSystemPrefsForm('auto_create_cost_control_budget', checked as boolean)}
                             disabled={!canEditSystemSettings}
                           />
                           <Label htmlFor="auto-create-cost-control-budget" className="text-sm">
                             {t("settings:autoCreateBudgets.costControl")}
                           </Label>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Number Format Preview Widget */}
                   <div>
                     <h4 className="text-md font-semibold mb-3">{t("settings:numberFormatPreviewHeading")}</h4>
                     <NumberFormatPreview />
                   </div>

                   {canEditSystemSettings ? (
                     <div className="mt-6">
                       <Button
                         onClick={saveSystemPreferences}
                         disabled={!hasSystemPrefsChanges || updateAppSettings.isPending}
                         className=""
                       >
                         {updateAppSettings.isPending ? t('settings.saving') : t('settings.saveChanges')}
                       </Button>
                       {hasSystemPrefsChanges && (
                         <p className="mt-2 text-sm text-amber-600">
                           {t('settings.unsavedChanges')}
                         </p>
                       )}
                     </div>
                   ) : (
                     <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                       <div className="flex items-center gap-2 text-sm text-muted-foreground">
                         <Lock className="h-4 w-4" />
                         <span>{t('settings.systemPreferencesReadOnly')}</span>
                       </div>
                     </div>
                   )}
                 </CardContent>
               </Card>
             </TabsContent>
           </Tabs>
         </TabsContent>
         
          <TabsContent value="business-settings" className="space-y-6">
            <Tabs defaultValue="defaults" className="w-full">
              <TabsList className="flex flex-nowrap justify-start gap-1 h-auto p-1 bg-muted/50 rounded-lg overflow-x-auto scrollbar-hide">
                <TabsTrigger value="defaults" className="text-sm px-3 py-1.5 h-auto min-w-max flex-shrink-0">{t('settings.tabs.defaults')}</TabsTrigger>
                <TabsTrigger value="contact-types" className="text-sm px-3 py-1.5 h-auto min-w-max flex-shrink-0">{t('settings.tabs.contact-types')}</TabsTrigger>
                <TabsTrigger value="dropdown-options" className="text-sm px-3 py-1.5 h-auto min-w-max flex-shrink-0">{t('settings.tabs.dropdown-options')}</TabsTrigger>
                <TabsTrigger value="inss-strategy" className="text-sm px-3 py-1.5 h-auto min-w-max flex-shrink-0">{t("settings:tabs.inss-strategy")}</TabsTrigger>
                <TabsTrigger value="inss-reference" className="text-sm px-3 py-1.5 h-auto min-w-max flex-shrink-0">{t("settings:tabs.inss-reference")}</TabsTrigger>
                <RequireFinancialRoles>
                  <TabsTrigger value="bdi" className="text-sm px-3 py-1.5 h-auto min-w-max flex-shrink-0">{t('settings.tabs.bdi')}</TabsTrigger>
                </RequireFinancialRoles>
                <TabsTrigger value="sinapi" className="text-sm px-3 py-1.5 h-auto min-w-max flex-shrink-0">{t('settings.tabs.sinapi')}</TabsTrigger>
              </TabsList>

              <TabsContent value="defaults" className="mt-6">
                <DefaultValuesForm />
              </TabsContent>

              <TabsContent value="contact-types" className="mt-6">
                <ContactTypesManager />
              </TabsContent>

              <TabsContent value="dropdown-options" className="mt-6">
                <DropdownOptionsManager />
              </TabsContent>

              <TabsContent value="inss-strategy" className="mt-6">
                <INSSStrategyLinksManager />
              </TabsContent>

              <TabsContent value="inss-reference" className="mt-6">
                <INSSReferenceDataManager />
              </TabsContent>

              <TabsContent value="bdi" className="mt-6">
                <BDIParametersForm />
              </TabsContent>

               <TabsContent value="sinapi" className="mt-6 space-y-6">
                 <SinapiConfigForm />
                 <SinapiCatalogView />
               </TabsContent>
            </Tabs>
          </TabsContent>



         <TabsContent value="integrations" className="space-y-6">
           <Tabs defaultValue="google" className="w-full">
             <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-1">
               <TabsTrigger value="google" className="text-sm px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t('settings.integrations.tabs.google')}</TabsTrigger>
               <TabsTrigger value="third-party" className="text-sm px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t('settings.integrations.tabs.thirdParty')}</TabsTrigger>
               <RequireAdmin>
                 <TabsTrigger value="whatsapp" className="text-sm px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t('settings.integrations.tabs.whatsapp')}</TabsTrigger>
               </RequireAdmin>
               <RequireAdmin>
                 <TabsTrigger value="api-testing" className="text-sm px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t('settings.integrations.tabs.apiTesting')}</TabsTrigger>
               </RequireAdmin>
               <RequireAdmin>
                 <TabsTrigger value="ai-providers" className="text-sm px-2 py-1.5 h-auto min-w-0 flex-shrink-0">{t('settings.integrations.tabs.aiProviders')}</TabsTrigger>
               </RequireAdmin>
             </TabsList>

             <TabsContent value="google" className="mt-6 space-y-6">
               <div className="grid gap-6 md:grid-cols-2">
                 <GoogleDriveSettings />
                 <CalendarSyncButton />
               </div>
             </TabsContent>

             <TabsContent value="third-party" className="mt-6">
               <ThirdPartyServices />
             </TabsContent>

             <RequireAdmin>
               <TabsContent value="whatsapp" className="mt-6 space-y-6">
                 <WhatsAppAiAutoResponderCard />
               </TabsContent>
             </RequireAdmin>

             <RequireAdmin>
               <TabsContent value="api-testing" className="mt-6">
                 <ApiTestingTools />
               </TabsContent>
             </RequireAdmin>

             <RequireAdmin>
               <TabsContent value="ai-providers" className="mt-6">
                 <AIProviderSettings />
               </TabsContent>
             </RequireAdmin>
           </Tabs>
         </TabsContent>

         <RequireAdmin>
            <TabsContent value="log-search" className="space-y-6">
              <LogSearchPanel />
            </TabsContent>
          </RequireAdmin>

          <TabsContent value="data-management" className="space-y-6">
            <Tabs defaultValue="quick-backup" className="w-full">
             <TabsList className="grid w-full grid-cols-4">
               <TabsTrigger value="quick-backup">{t("settings:tabs.quick-backup")}</TabsTrigger>
               <TabsTrigger value="selective-export">{t("settings:tabs.selective-export")}</TabsTrigger>
               <TabsTrigger value="csv-import">{t("settings:tabs.csv-import")}</TabsTrigger>
               <TabsTrigger value="demo-data">{t("settings:tabs.demoData")}</TabsTrigger>
             </TabsList>

             <TabsContent value="quick-backup" className="mt-6">
               <div className="space-y-6">
                 <Card>
                   <CardHeader>
                     <CardTitle>{t("settings:dataManagement.quickBackupTitle")}</CardTitle>
                     <CardDescription>
                       {t("settings:dataManagement.quickBackupDescription")}
                     </CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     <div className="space-y-2">
                       <Label>{t("settings:dataManagement.exportFormatLabel")}</Label>
                       <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="json">
                             <div className="flex items-center gap-2">
                               <FileJson className="h-4 w-4" />
                               {t("settings:dataManagement.exportFormatOptions.json")}
                             </div>
                           </SelectItem>
                           <SelectItem value="csv">
                             <div className="flex items-center gap-2">
                               <Table className="h-4 w-4" />
                               {t("settings:dataManagement.exportFormatOptions.csv")}
                             </div>
                           </SelectItem>
                           <SelectItem value="excel">
                             <div className="flex items-center gap-2">
                               <FileSpreadsheet className="h-4 w-4" />
                               {t("settings:dataManagement.exportFormatOptions.excel")}
                             </div>
                           </SelectItem>
                         </SelectContent>
                       </Select>
                     </div>

                     <Button onClick={handleQuickBackup} disabled={isExporting} className="w-full hover:bg-primary/10/90">
                       <Download className="mr-2 h-4 w-4" />
                       {isExporting ? t("settings:dataManagement.exportingAllData") : t("settings:dataManagement.exportAllData")}
                     </Button>
                   </CardContent>
                 </Card>

                 <Card>
                   <CardHeader>
                     <CardTitle>{t("commonUI.completeDatabaseExport") }</CardTitle>
                     <CardDescription>
                       {t("settings:dataManagement.completeDatabaseExportDescription")}
                     </CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     <Alert>
                       <Database className="h-4 w-4" />
                       <AlertDescription>
                         <p className="font-semibold mb-2">{t("settings:dataManagement.sqlExportIntro")}</p>
                         <p className="text-sm mb-2">{t("settings:dataManagement.sqlExportDetails")}</p>
                         <ul className="list-disc list-inside space-y-1 text-sm mb-2">
                           <li>{t("settings:dataManagement.sqlExportTargets.localSupabase")}</li>
                           <li>{t("settings:dataManagement.sqlExportTargets.anotherSupabase")}</li>
                           <li>{t("settings:dataManagement.sqlExportTargets.postgresql")}</li>
                         </ul>
                         <p className="text-sm font-semibold mt-2">{t("settings:dataManagement.importInstructionsTitle")}</p>
                         <ol className="list-decimal list-inside mt-1 space-y-1 text-sm">
                           <li>{t("settings:dataManagement.importInstructionsMigrations")} <code className="bg-muted px-1 rounded">supabase migration up</code></li>
                           <li>{t("settings:dataManagement.importInstructionsImport")} <code className="bg-muted px-1 rounded">psql &lt;connection-string&gt; &lt; dump.sql</code></li>
                         </ol>
                       </AlertDescription>
                     </Alert>

                      <div className="space-y-2">
                        <Button className="w-full hover:bg-primary/10/90">
                          <FileCode className="mr-2 h-4 w-4" />
                          {t("settings:dataManagement.exportDatabaseDump")}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                   <CardHeader>
                     <CardTitle>{t("commonUI.databaseStatistics") }</CardTitle>
                     <CardDescription>
                       {t("settings:dataManagement.databaseOverviewDescription")}
                     </CardDescription>
                   </CardHeader>
                   <CardContent>
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                       <div className="flex flex-col gap-1">
                         <p className="text-sm text-muted-foreground">{t("commonUI.totalProjects") }</p>
                         <p className="text-2xl font-bold">3</p>
                       </div>
                       <div className="flex flex-col gap-1">
                         <p className="text-sm text-muted-foreground">{t("commonUI.totalExpenses") }</p>
                         <p className="text-2xl font-bold">57</p>
                       </div>
                       <div className="flex flex-col gap-1">
                         <p className="text-sm text-muted-foreground">{t("commonUI.totalMaterials") }</p>
                         <p className="text-2xl font-bold">348</p>
                       </div>
                       <div className="flex flex-col gap-1">
                         <p className="text-sm text-muted-foreground">{t("settings:dataManagement.databaseSizeLabel")}</p>
                         <p className="text-2xl font-bold">408 KB</p>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               </div>
             </TabsContent>

             <TabsContent value="selective-export" className="mt-6">
               <div className="space-y-6">
                 <Card>
                   <CardHeader>
                     <CardTitle>{t("settings:dataManagement.selectiveExportTitle")}</CardTitle>
                     <CardDescription>
                       {t("settings:dataManagement.selectiveExportDescription")}
                     </CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-4">
                     <div className="space-y-2">
                       <div className="flex items-center justify-between">
                         <Label>{t("settings:dataManagement.selectTablesLabel")}</Label>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={handleSelectAllTables}
                         >
                           {selectedTables.length === availableTables.length
                             ? t("settings:dataManagement.deselectAll")
                             : t("settings:dataManagement.selectAll")}
                         </Button>
                       </div>

                       <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-3">
                         {Object.entries(
                           availableTables.reduce((acc: Record<string, any[]>, table) => {
                             if (!acc[table.category]) acc[table.category] = [];
                             acc[table.category].push(table);
                             return acc;
                           }, {} as Record<string, any[]>)
                         ).map(([category, tables]: [string, any[]]) => (
                           <div key={category} className="space-y-2">
                             <p className="text-sm font-semibold text-muted-foreground">{category}</p>
                             {tables.map((table) => (
                               <div key={table.name} className="flex items-center space-x-2 ml-4">
                                 <Checkbox
                                   id={table.name}
                                   checked={selectedTables.includes(table.name)}
                                   onCheckedChange={(checked) => {
                                     if (checked) {
                                       setSelectedTables([...selectedTables, table.name]);
                                     } else {
                                       setSelectedTables(selectedTables.filter(t => t !== table.name));
                                     }
                                   }}
                                 />
                                 <label
                                   htmlFor={table.name}
                                   className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                 >
                                   {table.name}
                                 </label>
                               </div>
                             ))}
                           </div>
                         ))}
                       </div>
                     </div>

                     <div className="space-y-2">
                       <Label>{t("settings:dataManagement.exportFormatLabel")}</Label>
                       <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="json">{t("settings:dataManagement.exportFormatOptions.json")}</SelectItem>
                           <SelectItem value="csv">{t("settings:dataManagement.exportFormatOptions.csv")}</SelectItem>
                           <SelectItem value="excel">{t("settings:dataManagement.exportFormatOptions.excel")}</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>

                     {isExporting && (
                       <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>{t('settings.dataManagement.exportingLabel')}</span>
                            <span>{Math.round(exportProgress)}%</span>
                          </div>
                          <Progress value={exportProgress} className="h-2" />
                        </div>
                      )}
 
                      <Button onClick={handleSelectiveExport} disabled={isExporting || selectedTables.length === 0} className="w-full hover:bg-primary/10/90">
                        <Download className="mr-2 h-4 w-4" />
                        {isExporting ? t('settings.dataManagement.exportingLabel') : t("settings:dataManagement.exportSelectedTables")}
                      </Button>
                   </CardContent>
                 </Card>
               </div>
             </TabsContent>

             <TabsContent value="csv-import" className="mt-6">
               <Card>
                 <CardHeader>
                   <CardTitle>{t("settings:dataManagement.csvImportTitle")}</CardTitle>
                   <CardDescription>
                     {t("settings:dataManagement.csvImportDescription")}
                   </CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   <div className="grid gap-4">
                     <div className="space-y-2">
                       <Label htmlFor="import-table">{t("settings:dataManagement.targetTableLabel")}</Label>
                       <Select>
                         <SelectTrigger id="import-table">
                           <SelectValue placeholder={t("settings:dataManagement.selectTargetTable")} />
                         </SelectTrigger>
                         <SelectContent>
                           {availableTables.map(table => (
                             <SelectItem key={table.name} value={table.name}>{table.name}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                     <div className="border-2 border-dashed rounded-lg p-12 text-center space-y-4">
                       <Upload className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                       <div className="space-y-1">
                         <p className="text-lg font-medium">{t("settings:dataManagement.dropCsvFile")}</p>
                         <p className="text-sm text-muted-foreground">{t("settings:dataManagement.csvSizeLimit")}</p>
                       </div>
                       <Button variant="outline" className="mx-auto">
                         {t("settings:dataManagement.selectFile")}
                       </Button>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </TabsContent>

             <TabsContent value="demo-data" className="mt-6">
               <DemoDataTab />
             </TabsContent>
           </Tabs>
         </TabsContent>

         <RequireAdmin>
           <TabsContent value="system-translation" className="space-y-6">
             <Tabs defaultValue="dashboard" className="w-full">
               <TabsList className="grid w-full grid-cols-2">
                 <TabsTrigger value="dashboard">{t("settings:tabs.translation-dashboard")}</TabsTrigger>
                 <TabsTrigger value="editor">{t("settings:tabs.translation-editor")}</TabsTrigger>
               </TabsList>
               <TabsContent value="dashboard" className="mt-6 space-y-6">
                 <div className="grid gap-6 md:grid-cols-2">
                   <TranslationCoverageCard />
                   <TranslationDashboard />
                 </div>
               </TabsContent>
               <TabsContent value="editor" className="mt-6">
                 <UITranslationEditor />
               </TabsContent>
             </Tabs>
           </TabsContent>
         </RequireAdmin>

          <TabsContent value="pwa" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <CardTitle>{t('settings.pwa.title')}</CardTitle>
                </div>
                <CardDescription>{t('settings.pwa.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-0.5">
                    <p className="font-medium">{t('settings.pwa.offlineMode')}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.pwa.offlineModeDesc')}</p>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    {t('settings.pwa.available')}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    {t('settings.pwa.installation')}
                  </h4>
                   <div className="grid gap-4 sm:grid-cols-2">
                     <div className="p-4 border rounded-lg">
                       <p className="font-medium mb-1">{t('settings.pwa.safariIOS.title')}</p>
                       <p className="text-sm text-muted-foreground">
                         {t('settings.pwa.iosInstructions')}
                       </p>
                     </div>
                     <div className="p-4 border rounded-lg">
                       <p className="font-medium mb-1">{t('settings.pwa.chromeAndroid.title')}</p>
                       <p className="text-sm text-muted-foreground">
                         {t('settings.pwa.androidInstructions')}
                       </p>
                     </div>
                   </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <RequireAdmin>
            <TabsContent value="admin-tools" className="space-y-6">
              <AdminToolsPanel />
            </TabsContent>
          </RequireAdmin>

        </Tabs>
    </div>
  );
};

export default Settings;
