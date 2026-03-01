import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Smartphone } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLocalization } from "@/contexts/LocalizationContext";

export function SupervisorPushNotifications() {
  const { t } = useLocalization();
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  return (
    <Card className="border-2">
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="truncate">{t("supervisor.pushNotifications.title") || "Push Notifications"}</span>
              {isSubscribed && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  <Bell className="h-2.5 w-2.5 mr-0.5" />
                  {t("supervisor.pushNotifications.active") || "Active"}
                </Badge>
              )}
            </div>
          </div>
        </CardTitle>
        <CardDescription className="text-xs leading-tight mt-1">
          {isSubscribed
            ? t("supervisor.pushNotifications.activeDescription")
            : t("supervisor.pushNotifications.enableDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
          <p className="text-xs font-medium">
            {t("supervisor.pushNotifications.alertsTitle") || "You'll receive alerts for:"}
          </p>
          <ul className="text-[11px] space-y-1 text-muted-foreground leading-tight">
            <li>• {t("supervisor.pushNotifications.criticalIssues") || "Critical safety issues"}</li>
            <li>• {t("supervisor.pushNotifications.overdueInspections") || "Overdue quality inspections"}</li>
            <li>• {t("supervisor.pushNotifications.pendingDeliveries") || "Pending delivery confirmations"}</li>
            <li>• {t("supervisor.pushNotifications.urgentUpdates") || "Urgent project updates"}</li>
          </ul>
        </div>

        <Button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
          variant={isSubscribed ? "outline" : "default"}
          size="default"
          className="w-full h-10 text-sm"
        >
          {isLoading
            ? t("supervisor.pushNotifications.loading") || "Loading..."
            : isSubscribed
            ? t("supervisor.pushNotifications.disable") || "Disable Push Notifications"
            : t("supervisor.pushNotifications.enable") || "Enable Push Notifications"}
        </Button>

        {!isSubscribed && (
          <p className="text-[10px] text-muted-foreground text-center leading-tight">
            {t("supervisor.pushNotifications.alwaysWorks")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
