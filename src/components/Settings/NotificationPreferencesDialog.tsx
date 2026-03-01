import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useLocalization } from "@/contexts/LocalizationContext";

interface NotificationPreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPreferencesDialog({
  open,
  onClose,
}: NotificationPreferencesDialogProps) {
  const { t } = useLocalization();
  const { settings, updateSettings } = useAppSettings();
  const [projectUpdates, setProjectUpdates] = useState(true);
  const [financialAlerts, setFinancialAlerts] = useState(true);
  const [scheduleChanges, setScheduleChanges] = useState(true);
  const [materialDelivery, setMaterialDelivery] = useState(false);
  const [checkFrequencySeconds, setCheckFrequencySeconds] = useState(15);

  useEffect(() => {
    if (settings) {
      setProjectUpdates(settings.notifications_project_updates ?? true);
       
      setFinancialAlerts(settings.notifications_financial_alerts ?? true);
       
      setScheduleChanges(settings.notifications_schedule_changes ?? true);
       
      setMaterialDelivery(settings.notifications_material_delivery ?? false);
      setCheckFrequencySeconds(settings.notification_check_frequency_seconds ?? 15);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      const normalizedCheckFrequency = Math.max(5, Math.floor(checkFrequencySeconds || 0));

      await updateSettings.mutateAsync({
        notifications_project_updates: projectUpdates,
        notifications_financial_alerts: financialAlerts,
        notifications_schedule_changes: scheduleChanges,
        notifications_material_delivery: materialDelivery,
        notification_check_frequency_seconds: normalizedCheckFrequency,
      });
      onClose();
    } catch (error) {
      console.error("Failed to update notification preferences:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("settings:notificationPreferences")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="projectUpdates" className="flex-1">
              {t("settings:projectUpdates")}
            </Label>
            <Switch
              id="projectUpdates"
              checked={projectUpdates}
              onCheckedChange={setProjectUpdates}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="financialAlerts" className="flex-1">
              {t("settings:financialAlerts")}
            </Label>
            <Switch
              id="financialAlerts"
              checked={financialAlerts}
              onCheckedChange={setFinancialAlerts}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="scheduleChanges" className="flex-1">
              {t("settings:notifications.scheduleChanges")}
            </Label>
            <Switch
              id="scheduleChanges"
              checked={scheduleChanges}
              onCheckedChange={setScheduleChanges}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="materialDelivery" className="flex-1">
              {t("settings:notifications.materialDelivery")}
            </Label>
            <Switch
              id="materialDelivery"
              checked={materialDelivery}
              onCheckedChange={setMaterialDelivery}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkFrequencySeconds" className="flex-1">
              {t("settings:notifications.checkFrequency")}
            </Label>
            <Input
              id="checkFrequencySeconds"
              type="number"
              min={5}
              step={1}
              value={checkFrequencySeconds}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                setCheckFrequencySeconds(Number.isNaN(nextValue) ? 0 : nextValue);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {t("settings:notifications.checkFrequencyHelp")}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
