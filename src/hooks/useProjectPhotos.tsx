import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useProjectPhotos = (projectId: string) => {
  const { data: photos, isLoading, error } = useQuery({
    queryKey: ["project-photos", projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from("project_photos")
        .select("*")
        .eq("project_id", projectId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!projectId,
  });

  return {
    photos: photos || [],
    isLoading,
    error
  };
};
