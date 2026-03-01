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

export interface ScheduledMaintenance {
  id: string;
  title: string;
  description: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export function useScheduledMaintenance() {
  return useQuery({
    queryKey: ["scheduled-maintenance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_maintenance")
        .select("*")
        .order("scheduled_start", { ascending: true });

      if (error) throw error;
      return data as ScheduledMaintenance[];
    },
  });
}

export function useUpcomingMaintenance() {
  return useQuery({
    queryKey: ["upcoming-maintenance"],
    queryFn: async () => {
      const now = new Date();
      const twoDaysLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from("scheduled_maintenance")
        .select("*")
        .eq("status", "scheduled")
        .gte("scheduled_start", now.toISOString())
        .lte("scheduled_start", twoDaysLater.toISOString())
        .order("scheduled_start", { ascending: true })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as ScheduledMaintenance | null;
    },
    refetchInterval: 60000, // Check every minute
  });
}

export function useCreateScheduledMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (maintenance: Omit<ScheduledMaintenance, "id" | "created_at" | "updated_at" | "created_by"> & { sendNotification?: boolean }) => {
      const { data: user } = await supabase.auth.getUser();
      const { sendNotification, ...maintenanceData } = maintenance;
      
      const { data, error } = await supabase
        .from("scheduled_maintenance")
        .insert({
          ...maintenanceData,
          created_by: user?.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification if requested
      if (sendNotification) {
        try {
          // Get contact email from settings
          const { data: settings } = await supabase
            .from("maintenance_settings")
            .select("contact_email")
            .limit(1)
            .single();

          await sendMaintenanceNotification({
            type: "scheduled",
            title: data.title,
            description: data.description || undefined,
            scheduledStart: data.scheduled_start,
            scheduledEnd: data.scheduled_end,
            contactEmail: settings?.contact_email || undefined,
          });
          toast.success("Maintenance scheduled and notifications sent");
        } catch (notifError) {
          console.error("Failed to send notifications:", notifError);
          toast.error("Maintenance scheduled but failed to send email notifications");
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-maintenance"] });
      toast.success("Scheduled maintenance created");
    },
    onError: (error) => {
      toast.error("Failed to create scheduled maintenance");
      console.error(error);
    },
  });
}

export function useUpdateScheduledMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScheduledMaintenance> & { id: string }) => {
      const { data, error } = await supabase
        .from("scheduled_maintenance")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-maintenance"] });
      toast.success("Scheduled maintenance updated");
    },
    onError: (error) => {
      toast.error("Failed to update scheduled maintenance");
      console.error(error);
    },
  });
}

export function useDeleteScheduledMaintenance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_maintenance")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-maintenance"] });
      toast.success("Scheduled maintenance deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete scheduled maintenance");
      console.error(error);
    },
  });
}
