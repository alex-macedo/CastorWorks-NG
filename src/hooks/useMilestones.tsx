import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Milestone {
  id: string;
  project_id: string;
  phase_id?: string | null;
  name: string;
  description?: string | null;
  due_date: string;
  status: 'pending' | 'achieved' | 'missed';
  achieved_date?: string | null;
  notify_days_before: number;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMilestoneInput {
  project_id: string
  phase_id: string | null
  name: string
  description?: string | null
  due_date: string
  notify_days_before: number
  status?: 'pending' | 'achieved' | 'missed'
  achieved_date?: string | null
}

export interface MarkMilestoneAchievedInput {
  id: string
  achieved_date: string
}

export const useMilestones = (projectId?: string) => {
  const queryClient = useQueryClient();

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ["project-milestones", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from("project_milestones")
        .select("*")
        .eq("project_id", projectId)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as Milestone[];
    },
    enabled: !!projectId,
  });

  const createMilestone = useMutation({
    mutationFn: async (newMilestone: CreateMilestoneInput) => {
      const { data, error } = await supabase
        .from("project_milestones")
        .insert([newMilestone])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-milestones", projectId] });
      toast.success("Milestone created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create milestone: ${error.message}`);
    },
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Milestone> & { id: string }) => {
      const { data, error } = await supabase
        .from("project_milestones")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-milestones", projectId] });
      toast.success("Milestone updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update milestone: ${error.message}`);
    },
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_milestones")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-milestones", projectId] });
      toast.success("Milestone deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete milestone: ${error.message}`);
    },
  });

  const markAchieved = useMutation({
    mutationFn: async ({ id, achieved_date }: MarkMilestoneAchievedInput) => {
      const { data, error } = await supabase
        .from("project_milestones")
        .update({
          status: 'achieved',
          achieved_date,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-milestones", projectId] });
      toast.success("Milestone marked as achieved! 🎉");
    },
    onError: (error) => {
      toast.error(`Failed to mark milestone as achieved: ${error.message}`);
    },
  });

  const checkUpcomingMilestones = async () => {
    if (!milestones) return;

    const today = new Date();
    const upcomingMilestones = milestones.filter(m => {
      if (m.status !== 'pending' || m.notification_sent) return false;
      
      const dueDate = new Date(m.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysUntilDue <= m.notify_days_before && daysUntilDue >= 0;
    });

    return upcomingMilestones;
  };

  const sendMilestoneNotifications = useMutation({
    mutationFn: async () => {
      const upcoming = await checkUpcomingMilestones();
      if (!upcoming || upcoming.length === 0) {
        toast.info("No upcoming milestones to notify");
        return;
      }

      // Call edge function to send notifications
      const { data, error } = await supabase.functions.invoke('send-milestone-notifications', {
        body: { projectId, milestones: upcoming }
      });

      if (error) throw error;
      
      // Mark notifications as sent
      for (const milestone of upcoming) {
        await updateMilestone.mutateAsync({
          id: milestone.id,
          notification_sent: true,
        });
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Milestone notifications sent successfully");
    },
    onError: (error) => {
      toast.error(`Failed to send notifications: ${error.message}`);
    },
  });

  return {
    milestones,
    isLoading,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    markAchieved,
    sendMilestoneNotifications,
  };
};
