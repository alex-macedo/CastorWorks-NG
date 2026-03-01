import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type AppRole = "admin" | "project_manager" | "viewer" | "site_supervisor" | "admin_office" | "client" | "accountant" | "architect" | "global_admin";

export interface UserWithRoles {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  roles: AppRole[];
  created_at: string;
  last_sign_in_at: string | null;
}

export const useRoleManagement = () => {
  const queryClient = useQueryClient();

  // Fetch all users with their roles
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-users-with-roles');

      if (error) {
        console.error('Error fetching users with roles:', error);
        throw error;
      }

      if (!data || !data.users) {
        throw new Error('Invalid response from server');
      }

      return data.users as UserWithRoles[];
    },
  });

  // Assign a role to a user
  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // First check if the role already exists (idempotent operation)
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", role)
        .maybeSingle();

      if (existingRole) {
        // Role already exists, skip insert and return early
        return;
      }

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error) throw error;

      // Log audit event
      try {
        await supabase.from("admin_events").insert({
          event_key: "role_assigned",
          user_id: userId,
          payload: { role, assigned_by: (await supabase.auth.getUser()).data.user?.id }
        });
      } catch (auditError) {
        console.error('Failed to log audit event:', auditError);
      }

      // Send notification email
      try {
        await supabase.functions.invoke('send-role-notification', {
          body: { userId, role, action: 'assigned' }
        });
      } catch (notifError) {
        console.error('Failed to send role notification:', notifError);
        // Don't fail the mutation if notification fails
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "Success",
        description: "Role assigned successfully. User will receive an email notification.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign role",
        variant: "destructive",
      });
    },
  });

  // Remove a role from a user
  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);

      if (error) throw error;

      // Log audit event
      try {
        await supabase.from("admin_events").insert({
          event_key: "role_removed",
          user_id: userId,
          payload: { role, removed_by: (await supabase.auth.getUser()).data.user?.id }
        });
      } catch (auditError) {
        console.error('Failed to log audit event:', auditError);
      }

      // Send notification email
      try {
        await supabase.functions.invoke('send-role-notification', {
          body: { userId, role, action: 'removed' }
        });
      } catch (notifError) {
        console.error('Failed to send role notification:', notifError);
        // Don't fail the mutation if notification fails
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      toast({
        title: "Success",
        description: "Role removed successfully. User will receive an email notification.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove role",
        variant: "destructive",
      });
    },
  });

  return {
    users,
    isLoading,
    error,
    assignRole,
    removeRole,
  };
};
