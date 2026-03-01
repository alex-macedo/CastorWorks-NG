import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AppRole } from "@/hooks/useUserRoles";

export interface PermissionChange {
  type: "option" | "tab";
  optionId: string;
  tabId?: string;
  role: AppRole;
  granted: boolean;
}

/**
 * Admin-only hook for managing sidebar permissions.
 * Provides mutations to grant/revoke access to sidebar options and tabs.
 */
export function useSidebarPermissionManagement() {
  const queryClient = useQueryClient();

  // Grant access to a sidebar option
  const grantOptionAccess = useMutation({
    mutationFn: async ({ optionId, role }: { optionId: string; role: AppRole }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("sidebar_option_permissions")
        .insert({
          option_id: optionId,
          role,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sidebar-option-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-tab-permissions"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to grant access: ${error.message}`);
    },
  });

  // Revoke access from a sidebar option
  const revokeOptionAccess = useMutation({
    mutationFn: async ({ optionId, role }: { optionId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("sidebar_option_permissions")
        .delete()
        .eq("option_id", optionId)
        .eq("role", role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sidebar-option-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-tab-permissions"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke access: ${error.message}`);
    },
  });

  // Grant access to a sidebar tab
  const grantTabAccess = useMutation({
    mutationFn: async ({
      optionId,
      tabId,
      role,
    }: {
      optionId: string;
      tabId: string;
      role: AppRole;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("sidebar_tab_permissions").insert({
        option_id: optionId,
        tab_id: tabId,
        role,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sidebar-tab-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-option-permissions"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to grant tab access: ${error.message}`);
    },
  });

  // Revoke access from a sidebar tab
  const revokeTabAccess = useMutation({
    mutationFn: async ({
      optionId,
      tabId,
      role,
    }: {
      optionId: string;
      tabId: string;
      role: AppRole;
    }) => {
      const { error } = await supabase
        .from("sidebar_tab_permissions")
        .delete()
        .eq("option_id", optionId)
        .eq("tab_id", tabId)
        .eq("role", role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sidebar-tab-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-option-permissions"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke tab access: ${error.message}`);
    },
  });

  // Bulk update permissions (optimized for multiple changes)
  const bulkUpdatePermissions = useMutation({
    mutationFn: async (changes: PermissionChange[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Separate grants and revokes
      const grants = changes.filter((c) => c.granted);
      const revokes = changes.filter((c) => !c.granted);

      // Process grants
      const grantPromises = grants.map((change) => {
        if (change.type === "option") {
          return supabase.from("sidebar_option_permissions").insert({
            option_id: change.optionId,
            role: change.role,
          });
        } else {
          return supabase.from("sidebar_tab_permissions").insert({
            option_id: change.optionId,
            tab_id: change.tabId!,
            role: change.role,
          });
        }
      });

      // Process revokes
      const revokePromises = revokes.map((change) => {
        if (change.type === "option") {
          return supabase
            .from("sidebar_option_permissions")
            .delete()
            .eq("option_id", change.optionId)
            .eq("role", change.role);
        } else {
          return supabase
            .from("sidebar_tab_permissions")
            .delete()
            .eq("option_id", change.optionId)
            .eq("tab_id", change.tabId!)
            .eq("role", change.role);
        }
      });

      // Execute all operations
      const grantResults = await Promise.all(grantPromises);
      const revokeResults = await Promise.all(revokePromises);

      // Check for errors
      const grantErrors = grantResults.filter((r) => r.error);
      const revokeErrors = revokeResults.filter((r) => r.error);

      if (grantErrors.length > 0 || revokeErrors.length > 0) {
        const errors = [
          ...grantErrors.map((e) => e.error?.message),
          ...revokeErrors.map((e) => e.error?.message),
        ]
          .filter(Boolean)
          .join("; ");
        throw new Error(`Some operations failed: ${errors}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sidebar-option-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["sidebar-tab-permissions"] });
      toast.success("Permissions updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update permissions: ${error.message}`);
    },
  });

  return {
    grantOptionAccess: grantOptionAccess.mutate,
    revokeOptionAccess: revokeOptionAccess.mutate,
    grantTabAccess: grantTabAccess.mutate,
    revokeTabAccess: revokeTabAccess.mutate,
    bulkUpdatePermissions: bulkUpdatePermissions.mutate,
    isUpdating:
      grantOptionAccess.isPending ||
      revokeOptionAccess.isPending ||
      grantTabAccess.isPending ||
      revokeTabAccess.isPending ||
      bulkUpdatePermissions.isPending,
  };
}
