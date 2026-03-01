import { useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDateFormat } from "@/hooks/useDateFormat";

export function useMaintenanceNotifications() {
  const { formatDate, formatTime } = useDateFormat();
  useEffect(() => {
    let settingsChannel: RealtimeChannel | null = null;
    let scheduledChannel: RealtimeChannel | null = null;

    const setup = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) return;

      settingsChannel = supabase
        .channel("maintenance-settings-changes")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "maintenance_settings"
          },
          (payload) => {
            const newData = payload.new as Record<string, unknown>;
            const oldData = payload.old as Record<string, unknown>;

            if (newData.enabled === true && oldData.enabled === false) {
              toast.warning("System Maintenance Activated", {
                description: `The system is now in maintenance mode. ${
                  newData.estimated_time
                    ? `Estimated duration: ${newData.estimated_time}`
                    : "We'll be back soon."
                }`,
                duration: 10000
              });
            }
            if (newData.enabled === false && oldData.enabled === true) {
              toast.success("Maintenance Complete", {
                description:
                  "The system is now back online. Thank you for your patience!",
                duration: 5000
              });
            }
          }
        )
        .subscribe();

      scheduledChannel = supabase
        .channel("scheduled-maintenance-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "scheduled_maintenance"
          },
          (payload) => {
            const newMaintenance = payload.new as {
              title?: string;
              scheduled_start?: string;
            };
            const scheduledDate = new Date(
              newMaintenance.scheduled_start ?? 0
            );
            toast.info("Scheduled Maintenance Notice", {
              description: `${newMaintenance.title ?? "Maintenance"} - Scheduled for ${formatDate(scheduledDate)} at ${formatTime(scheduledDate)}`,
              duration: 10000
            });
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (settingsChannel) supabase.removeChannel(settingsChannel);
      if (scheduledChannel) supabase.removeChannel(scheduledChannel);
    };
  }, [formatDate, formatTime]);
}
