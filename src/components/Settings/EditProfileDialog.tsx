import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUpdateUserProfile } from "@/hooks/useUpdateUserProfile";
import { useUploadAvatar, useRemoveAvatar } from "@/hooks/useUploadAvatar";
import { useLocalization, languageMetadata } from "@/contexts/LocalizationContext";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveStorageUrl } from "@/utils/storage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2 } from "lucide-react";

interface EditProfileDialogProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

export function EditProfileDialog({
  userId,
  open,
  onClose,
}: EditProfileDialogProps) {
  const { t, setLanguage: setGlobalLanguage } = useLocalization();
  const updateProfile = useUpdateUserProfile();
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const { preferences, updatePreferences } = useUserPreferences();
  const { data: currentUserRolesData = [] } = useUserRoles();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [resolvedAvatar, setResolvedAvatar] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Preferences State
  const [language, setLanguage] = useState("en-US");
  const [currency, setCurrency] = useState("USD");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [theme, setTheme] = useState("system");
  const [supervisorMode, setSupervisorMode] = useState("auto");
  
  // Notifications State
  const [notifProjectUpdates, setNotifProjectUpdates] = useState(true);
  const [notifFinancialAlerts, setNotifFinancialAlerts] = useState(true);
  const [notifScheduleChanges, setNotifScheduleChanges] = useState(true);
  const [notifMaterialDelivery, setNotifMaterialDelivery] = useState(false);

  const isSiteSupervisor = currentUserRolesData?.some(r => r.role === "site_supervisor");
  const isAdmin = currentUserRolesData?.some(r => r.role === "admin");

  useEffect(() => {
    if (open && userId) {
      const fetchProfile = async () => {
         const { data } = await supabase
           .from("user_profiles")
           .select("display_name, avatar_url, email, phone, city")
           .eq("user_id", userId)
           .maybeSingle();
         
         if (data) {
           setDisplayName(data.display_name || "");
           setAvatarUrl(data.avatar_url || "");
           setEmail(data.email || "");
           setPhone(data.phone || "");
           setCity(data.city || "");
         }
      };
      fetchProfile();
    } else {
      // Reset state when dialog closes
      setDisplayName("");
      setAvatarUrl("");
      setEmail("");
      setPhone("");
      setCity("");
      setAvatarPreview(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [userId, open]);

  useEffect(() => {
    if (avatarUrl) {
      resolveStorageUrl(avatarUrl).then(url => setResolvedAvatar(url));
    } else {
      setResolvedAvatar(null);
    }
  }, [avatarUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return;
    }

    // Validate file size (5MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile) return;

    try {
      const storagePath = await uploadAvatar.mutateAsync({
        userId,
        file: selectedFile,
      });
      setAvatarUrl(storagePath);
      setSelectedFile(null);
    } catch (error) {
      console.error("Failed to upload avatar:", error);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await removeAvatar.mutateAsync(userId);
      setAvatarUrl("");
      setAvatarPreview(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to remove avatar:", error);
    }
  };

  useEffect(() => {
    if (preferences) {
      setLanguage(preferences.language || "en-US");
      setCurrency(preferences.currency || "USD");
      setDateFormat(preferences.date_format || "MM/DD/YYYY");
      setTheme(preferences.theme || "system");
      setSupervisorMode(preferences.supervisor_interface_mode || "auto");
    }
  }, [preferences]);

  useEffect(() => {
    if (preferences) {
      setNotifProjectUpdates(preferences.notifications_project_updates ?? true);
      setNotifFinancialAlerts(preferences.notifications_financial_alerts ?? true);
      setNotifScheduleChanges(preferences.notifications_schedule_changes ?? true);
      setNotifMaterialDelivery(preferences.notifications_material_delivery ?? false);
    }
  }, [preferences]);

  const handleSave = async () => {
    try {
      // Sync global language immediately if it changed
      if (language !== preferences?.language) {
        setGlobalLanguage(language as any);
      }
      
      await Promise.all([
        updateProfile.mutateAsync({
          userId,
          display_name: displayName,
          avatar_url: avatarUrl || undefined,
          email: isAdmin ? email : undefined,
          phone: phone || null,
          city: city || null,
        }),
        updatePreferences.mutateAsync({
          language,
          currency,
          date_format: dateFormat,
          theme: theme as any,
          supervisor_interface_mode: supervisorMode,
          notifications_project_updates: notifProjectUpdates,
          notifications_financial_alerts: notifFinancialAlerts,
          notifications_schedule_changes: notifScheduleChanges,
          notifications_material_delivery: notifMaterialDelivery
        })
      ]);
      onClose();
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const isSaving = updateProfile.isPending || updatePreferences.isPending || uploadAvatar.isPending || removeAvatar.isPending;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("settings:editUserProfile")}</SheetTitle>
        </SheetHeader>
        
        <Tabs defaultValue="profile" variant="pill" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">{t("settings:userProfile")}</TabsTrigger>
            <TabsTrigger value="preferences">{t("settings:tabs.preferences")}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-4">
             <div className="flex flex-col items-center gap-4">
               <Avatar className="h-24 w-24">
                 <AvatarImage src={avatarPreview || resolvedAvatar || undefined} />
                 <AvatarFallback>{displayName?.substring(0, 2).toUpperCase() || "U"}</AvatarFallback>
               </Avatar>
               {avatarPreview && (
                 <p className="text-xs text-muted-foreground">{t("settings:editProfileDialog.avatarPreview")}</p>
               )}
             </div>

             <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("settings:email")}</Label>
                <Input 
                  id="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isAdmin}
                  className={!isAdmin ? "bg-muted" : ""}
                />
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground">{t("settings:emailAdminOnly")}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="displayName">{t("settings:name")}</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("settings:namePlaceholder", "Enter your name")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("settings:phoneLabel")}</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("settings:phonePlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">{t("settings:cityLabel")}</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("settings:cityPlaceholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar-upload-input">{t("settings:editProfileDialog.avatarUpload")}</Label>
                <div className="flex flex-col gap-2">
                  <input
                    id="avatar-upload-input"
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    aria-label={t("settings:editProfileDialog.avatarUpload")}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1"
                      disabled={uploadAvatar.isPending || removeAvatar.isPending}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {selectedFile ? t("settings:editProfileDialog.avatarChange") : t("settings:editProfileDialog.avatarUpload")}
                    </Button>
                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemoveAvatar}
                        disabled={uploadAvatar.isPending || removeAvatar.isPending}
                      >
                        <X className="h-4 w-4 mr-2" />
                        {t("settings:editProfileDialog.avatarRemove")}
                      </Button>
                    )}
                  </div>
                  {selectedFile && (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={handleUploadAvatar}
                        disabled={uploadAvatar.isPending || removeAvatar.isPending}
                        className="flex-1"
                      >
                        {uploadAvatar.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {t("settings:editProfileDialog.avatarUploading")}
                          </>
                        ) : (
                          t("settings:editProfileDialog.avatarUpload")
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setAvatarPreview(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        disabled={uploadAvatar.isPending || removeAvatar.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t("settings:editProfileDialog.avatarFileTypeError")} ({t("settings:editProfileDialog.avatarFileSizeError")})
                  </p>
                </div>
              </div>
             </div>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("settings:language")}</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(languageMetadata).map(([code, meta]) => (
                      <SelectItem key={code} value={code}>
                        {meta.nativeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("settings:currency")}</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="BRL">BRL</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("settings:dateFormat")}</Label>
                <Select value={dateFormat} onValueChange={setDateFormat}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("settings:userPreferences.appearanceLabel")}</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t("settings:userPreferences.appearanceOptions.light")}</SelectItem>
                    <SelectItem value="dark">{t("settings:userPreferences.appearanceOptions.dark")}</SelectItem>
                    <SelectItem value="system">{t("settings:userPreferences.appearanceOptions.system")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {isSiteSupervisor && (
                 <div className="space-y-2">
                  <Label>{t("settings:userPreferences.supervisorModeLabel")}</Label>
                  <Select value={supervisorMode} onValueChange={setSupervisorMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{t("settings:userPreferences.supervisorModeOptions.auto")}</SelectItem>
                      <SelectItem value="mobile">{t("settings:userPreferences.supervisorModeOptions.mobile")}</SelectItem>
                      <SelectItem value="desktop">{t("settings:userPreferences.supervisorModeOptions.desktop")}</SelectItem>
                    </SelectContent>
                  </Select>
                 </div>
              )}

              <Separator />

              <div className="space-y-3">
                 <h4 className="font-medium text-sm">{t("settings:userPreferences.notificationsTitle")}</h4>
                 
                 <div className="flex items-center justify-between">
                    <Label className="font-normal text-sm">{t("settings:projectUpdates")}</Label>
                    <Switch checked={notifProjectUpdates} onCheckedChange={setNotifProjectUpdates} />
                 </div>
                 <div className="flex items-center justify-between">
                    <Label className="font-normal text-sm">{t("settings:financialAlerts")}</Label>
                    <Switch checked={notifFinancialAlerts} onCheckedChange={setNotifFinancialAlerts} />
                 </div>
                 <div className="flex items-center justify-between">
                    <Label className="font-normal text-sm">{t("settings:notifications.scheduleChanges")}</Label>
                    <Switch checked={notifScheduleChanges} onCheckedChange={setNotifScheduleChanges} />
                 </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <SheetFooter className="mt-8">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t('settings.saving') : t("common.save")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
