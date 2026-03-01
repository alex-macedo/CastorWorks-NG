import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import resolveStorageUrl from '@/utils/storage';

export function useUserProfile() {
  return useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      const rawAvatar = data?.avatar_url || user.user_metadata?.avatar_url || "";
      const avatar_url = await resolveStorageUrl(rawAvatar);

      return {
        id: user.id,
        email: user.email || data?.email || "",
        display_name: data?.display_name || user.user_metadata?.full_name || user.email?.split('@')[0] || "",
        avatar_url: avatar_url || "",
        company_id: data?.company_id || null,
      };
    },
  });
}
