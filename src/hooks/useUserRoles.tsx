import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'admin' | 'project_manager' | 'supervisor' | 'accountant' | 'client' | 'site_supervisor' | 'admin_office' | 'viewer' | 'editor' | 'architect' | 'global_admin';

export interface UserRoleRecord {
  role: AppRole;
}

// Hook to get roles for a specific user; if no userId is provided, use current session user
export const useUserRoles = (userId?: string) => {
  return useQuery<UserRoleRecord[]>({
    queryKey: ["user-roles", userId ?? "self"],
    queryFn: async () => {
      let targetUserId = userId;

      // If no userId provided, resolve from current auth session
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        targetUserId = user.id;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", targetUserId);

      if (error) throw error;

      return (data || []) as UserRoleRecord[];
    },
    // Always enabled; queryFn will short-circuit when no user
    enabled: true,
  });
};

// Utility hooks for role checking
export function useHasRole(requiredRole: AppRole): boolean {
  const { data: roles = [] } = useUserRoles();
  return roles.some(roleRecord => roleRecord.role === requiredRole);
}

export function useHasAnyRole(requiredRoles: AppRole[]): boolean {
  const { data: roles = [] } = useUserRoles();
  return requiredRoles.some(role => roles.some(roleRecord => roleRecord.role === role));
}

export function useHasAllRoles(requiredRoles: AppRole[]): boolean {
  const { data: roles = [] } = useUserRoles();
  return requiredRoles.every(role => roles.some(roleRecord => roleRecord.role === role));
}

// Hook to get just the roles array (convenience)
export function useCurrentUserRoles(): AppRole[] {
  const { data: roles = [] } = useUserRoles();
  return roles.map(roleRecord => roleRecord.role);
}
