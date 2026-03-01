import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export function useProjectDocuments(projectId: string | undefined, folderId?: string | null) {
  return useQuery({
    queryKey: ["project-documents", projectId, folderId],
    queryFn: async () => {
      if (!projectId) return [];

      // If projectId is not a valid UUID, return empty array
      if (!isValidUUID(projectId)) {
        return [] as any[];
      }

      try {
        let query = supabase
          .from("project_documents")
          .select("*")
          .eq("project_id", projectId)
          .eq("is_deleted", false)
          .eq("is_latest_version", true)
          .order("created_at", { ascending: false });

        if (folderId === null || folderId === undefined) {
          query = query.is("folder_id", null);
        } else {
          query = query.eq("folder_id", folderId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return (data || []) as any[];
      } catch (err) {
        console.warn('Project documents unavailable, returning empty array', err);
        return [] as any[];
      }
    },
    enabled: !!projectId,
  });
}
