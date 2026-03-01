import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import resolveStorageUrl from '@/utils/storage';

export type UserWithRoles = {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  roles: string[];
  created_at: string;
};

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRoles[] = await Promise.all(
        profiles.map(async (profile) => {
          const rawAvatar = profile.avatar_url || undefined;
          const avatar = rawAvatar ? await resolveStorageUrl(rawAvatar) : undefined;
          return {
            id: profile.user_id,
            email: profile.email || "",
            display_name: profile.display_name,
            avatar_url: avatar || undefined,
            roles: roles.filter((r) => r.user_id === profile.user_id).map((r) => r.role),
            created_at: profile.created_at,
          };
        })
      );

      return usersWithRoles;
    },
  });
}

export type ProjectManager = {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
};

export function useProjectManagers() {
  return useQuery({
    queryKey: ["project-managers"],
    queryFn: async () => {
      // Get users with project_manager OR architect role
      const { data: pmRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["project_manager", "architect"]);

      if (rolesError) throw rolesError;

      if (!pmRoles || pmRoles.length === 0) {
        return [];
      }

      // Get profile details for project managers and architects
      const pmUserIds = pmRoles.map((r) => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("user_id, email, display_name, avatar_url")
        .in("user_id", pmUserIds)
        .order("display_name", { ascending: true });

      if (profilesError) throw profilesError;

      const projectManagers: ProjectManager[] = await Promise.all(
        profiles.map(async (profile) => {
          const rawAvatar = profile.avatar_url || undefined;
          const avatar = rawAvatar ? await resolveStorageUrl(rawAvatar) : undefined;
          return {
            id: profile.user_id,
            email: profile.email || "",
            display_name: profile.display_name,
            avatar_url: avatar || undefined,
          };
        })
      );

      return projectManagers;
    },
  });
}
