import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDateFormat } from "@/hooks/useDateFormat";

export function useMaintenanceNotifications() {
  const { formatDate, formatTime } = useDateFormat();
  useEffect(() => {
    // Listen for maintenance settings changes
    const settingsChannel = supabase
      .channel('maintenance-settings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'maintenance_settings'
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;
          
          // If maintenance mode was just enabled
          if (newData.enabled === true && oldData.enabled === false) {
            toast.warning("System Maintenance Activated", {
              description: `The system is now in maintenance mode. ${
                newData.estimated_time 
                  ? `Estimated duration: ${newData.estimated_time}` 
                  : 'We\'ll be back soon.'
              }`,
              duration: 10000,
            });
          }
          
          // If maintenance mode was just disabled
          if (newData.enabled === false && oldData.enabled === true) {
            toast.success("Maintenance Complete", {
              description: "The system is now back online. Thank you for your patience!",
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    // Listen for new scheduled maintenance
    const scheduledChannel = supabase
      .channel('scheduled-maintenance-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'scheduled_maintenance'
        },
        (payload) => {
          const newMaintenance = payload.new as any;
          const scheduledDate = new Date(newMaintenance.scheduled_start);
          
          toast.info("Scheduled Maintenance Notice", {
            description: `${newMaintenance.title} - Scheduled for ${formatDate(scheduledDate)} at ${formatTime(scheduledDate)}`,
            duration: 10000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(settingsChannel);
      supabase.removeChannel(scheduledChannel);
    };
  }, [formatDate, formatTime]);
}
