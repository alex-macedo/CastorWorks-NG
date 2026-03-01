import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const sendMaintenanceNotification = async (data: {
  type: "scheduled" | "activated";
  title?: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  estimatedTime?: string;
  contactEmail?: string;
}) => {
  const { data: result, error } = await supabase.functions.invoke(
    "send-maintenance-notification",
    { body: data }
  );

  if (error) throw error;
  return result;
};

export interface MaintenanceSettings {
  id: string;
  enabled: boolean;
  estimated_time: string | null;
  contact_email: string | null;
  updated_at: string;
  updated_by: string | null;
}

export function useMaintenanceSettings() {
  return useQuery({
    queryKey: ["maintenance-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      return data as MaintenanceSettings;
    },
  });
}

export function useUpdateMaintenanceSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<MaintenanceSettings> & { sendNotification?: boolean }) => {
      const { data: user } = await supabase.auth.getUser();
      const { sendNotification, ...updateData } = settings;
      
      const { data, error } = await supabase
        .from("maintenance_settings")
        .update({
          ...updateData,
          updated_by: user?.user?.id,
        })
        .eq("id", settings.id)
        .select()
        .single();

      if (error) throw error;

      // Send email notification if maintenance mode was just activated
      if (sendNotification && updateData.enabled === true) {
        try {
          await sendMaintenanceNotification({
            type: "activated",
            estimatedTime: data.estimated_time || undefined,
            contactEmail: data.contact_email || undefined,
          });
          toast.success("Maintenance notifications sent to all users");
        } catch (notifError) {
          console.error("Failed to send notifications:", notifError);
          toast.error("Maintenance activated but failed to send email notifications");
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-settings"] });
      toast.success("Maintenance settings updated");
    },
    onError: (error) => {
      toast.error("Failed to update maintenance settings");
      console.error(error);
    },
  });
}
