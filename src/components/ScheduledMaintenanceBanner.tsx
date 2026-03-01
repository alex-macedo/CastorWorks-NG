import { AlertCircle, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useUpcomingMaintenance } from "@/hooks/useScheduledMaintenance";
import { format, parseISO } from "date-fns";
import { useState } from "react";

import { useLocalization } from "@/contexts/LocalizationContext";
export function ScheduledMaintenanceBanner() {
  const { data: maintenance } = useUpcomingMaintenance();
  const [dismissed, setDismissed] = useState(false);

  if (!maintenance || dismissed) return null;

  const scheduledStart = new Date(maintenance.scheduled_start);
  const now = new Date();
  const hoursUntil = Math.floor((scheduledStart.getTime() - now.getTime()) / (1000 * 60 * 60));

  return (
    <Alert variant="default" className="border-primary/50 bg-primary/5">
      <AlertCircle className="h-4 w-4 text-primary" />
      <AlertTitle className="flex items-center justify-between">
        <span>{t("ui.scheduledMaintenance")}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription>
        <p className="font-semibold">{maintenance.title}</p>
        {maintenance.description && (
          <p className="text-sm text-muted-foreground mt-1">{maintenance.description}</p>
        )}
        <p className="text-sm mt-2">
          Scheduled for {format(parseISO(maintenance.scheduled_start), "MMM dd, yyyy")} at{" "}
          {format(parseISO(maintenance.scheduled_start), "HH:mm")}
          {hoursUntil > 0 && (
            <span className="text-muted-foreground"> (in {hoursUntil} hours)</span>
          )}
        </p>
      </AlertDescription>
    </Alert>
  );
}
