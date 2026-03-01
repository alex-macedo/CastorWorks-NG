import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      display_name,
      avatar_url,
      email,
      phone,
      city,
    }: {
      userId: string;
      display_name: string;
      avatar_url?: string;
      email?: string | null;
      phone?: string | null;
      city?: string | null;
    }) => {
      const updateData: {
        display_name: string;
        avatar_url?: string;
        email?: string | null;
        phone?: string | null;
        city?: string | null;
      } = { display_name };
      
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (city !== undefined) updateData.city = city;

      const { data, error } = await supabase
        .from("user_profiles")
        .update(updateData)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      toast.success("Profile updated successfully");
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : String(error);
      toast.error(`Failed to update profile: ${errorMessage}`);
    },
  });
}
