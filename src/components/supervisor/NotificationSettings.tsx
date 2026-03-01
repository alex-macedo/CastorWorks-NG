import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Volume2, Smartphone } from "lucide-react";
import { useNotificationPreferences, updateNotificationPreferences } from "@/hooks/useNotificationAlerts";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "@/hooks/use-toast";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function NotificationSettings() {
  const { t } = useLocalization();
  const { data: preferences, refetch } = useNotificationPreferences();
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (preferences) {
      setAlertsEnabled(preferences.alerts_enabled);
       
      setSoundEnabled(preferences.sound_enabled);
    }
  }, [preferences]);

  const handleAlertsToggle = async (enabled: boolean) => {
    try {
      setAlertsEnabled(enabled);
      await updateNotificationPreferences(enabled, soundEnabled);
      await refetch();
      toast({
        title: t("supervisor.settings.saved") || "Settings saved",
        description: enabled
          ? t("supervisor.settings.alertsEnabled") || "Critical alerts enabled"
          : t("supervisor.settings.alertsDisabled") || "Critical alerts disabled",
      });
    } catch (error) {
      console.error("Error updating preferences:", error);
      setAlertsEnabled(!enabled); // Revert on error
    }
  };

  const handleSoundToggle = async (enabled: boolean) => {
    try {
      setSoundEnabled(enabled);
      await updateNotificationPreferences(alertsEnabled, enabled);
      await refetch();
      toast({
        title: t("supervisor.settings.saved") || "Settings saved",
        description: enabled
          ? t("supervisor.settings.soundEnabled") || "Notification sounds enabled"
          : t("supervisor.settings.soundDisabled") || "Notification sounds disabled",
      });
    } catch (error) {
      console.error("Error updating preferences:", error);
      setSoundEnabled(!enabled); // Revert on error
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        toast({
          title: t("supervisor.settings.permissionGranted") || "Permission granted",
          description: t("supervisor.settings.browserNotificationsEnabled") || "Browser notifications enabled",
        });
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t("supervisor.settings.notificationAlerts") || "Notification Alerts"}
        </CardTitle>
        <CardDescription>
          {t("supervisor.settings.notificationDescription") ||
            "Configure how you receive alerts for critical issues and overdue tasks"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="alerts-enabled" className="text-base">
              {t("supervisor.settings.enableAlerts") || "Enable Critical Alerts"}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("supervisor.settings.enableAlertsDescription") ||
                "Receive visual and sound alerts for urgent safety issues and overdue inspections"}
            </p>
          </div>
          <Switch
            id="alerts-enabled"
            checked={alertsEnabled}
            onCheckedChange={handleAlertsToggle}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sound-enabled" className="text-base flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              {t("supervisor.settings.enableSound") || "Enable Alert Sounds"}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("supervisor.settings.enableSoundDescription") ||
                "Play an audible alert when critical notifications arrive"}
            </p>
          </div>
          <Switch
            id="sound-enabled"
            checked={soundEnabled}
            onCheckedChange={handleSoundToggle}
            disabled={!alertsEnabled}
          />
        </div>

        {typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted" && (
          <div className="pt-4 border-t">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("supervisor.settings.browserNotificationPermission") ||
                  "Browser notifications require permission to display"}
              </p>
              <Button onClick={requestNotificationPermission} variant="outline" size="sm">
                {t("supervisor.settings.enableBrowserNotifications") || "Enable Browser Notifications"}
              </Button>
            </div>
          </div>
        )}

        {isSupported && (
          <div className="pt-4 border-t">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5 flex-1">
                  <Label className="text-base flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    {t("supervisor.settings.pushNotifications") || "Push Notifications"}
                    {isSubscribed && (
                      <Badge variant="secondary" className="ml-2">
                        {t("supervisor.settings.active") || "Active"}
                      </Badge>
                    )}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t("supervisor.settings.pushNotificationsDescription") ||
                      "Receive alerts even when the app is closed or in the background"}
                  </p>
                </div>
                <Button
                  onClick={isSubscribed ? unsubscribe : subscribe}
                  disabled={isLoading}
                  variant={isSubscribed ? "outline" : "default"}
                  size="sm"
                >
                  {isLoading
                    ? t("supervisor.settings.loading") || "Loading..."
                    : isSubscribed
                    ? t("supervisor.settings.disable") || "Disable"
                    : t("supervisor.settings.enable") || "Enable"}
                </Button>
              </div>
              {!isSubscribed && (
                <p className="text-xs text-muted-foreground">
                  {t("supervisor.settings.pushNotificationsNote") ||
                    "Push notifications work even when you close the browser or switch apps"}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
