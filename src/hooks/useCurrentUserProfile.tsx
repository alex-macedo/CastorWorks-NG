import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import resolveStorageUrl from '@/utils/storage';

export type CurrentUserProfile = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
};

export function useCurrentUserProfile() {
  return useQuery({
    queryKey: ["current-user-profile"],
    queryFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Not authenticated");
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("user_id, email, display_name, avatar_url")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        // If no profile, return basic user info with explicit null avatar
        return {
          id: user.id,
          email: user.email || "",
          display_name: user.email || "Unknown User",
          avatar_url: null,
        } as CurrentUserProfile;
      }

      const rawAvatar = profile.avatar_url ?? null;
      const avatar_url = rawAvatar ? await resolveStorageUrl(rawAvatar) : null;

      return {
        id: profile.user_id,
        email: profile.email || user.email || "",
        display_name: profile.display_name || user.email || "Unknown User",
        avatar_url: avatar_url ?? null,
      } as CurrentUserProfile;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false,
  });
}
