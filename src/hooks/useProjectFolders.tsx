/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProjectFolders(projectId: string | undefined, parentFolderId?: string | null) {
  return useQuery({
    queryKey: ["project-folders", projectId, parentFolderId],
    queryFn: async () => {
      if (!projectId) {
        console.log("[useProjectFolders] No projectId, returning empty array");
        return [];
      }

      console.log("[useProjectFolders] Fetching folders", { projectId, parentFolderId });

      // Try to select with new schema columns first
      let query = supabase
        .from("project_folders")
        .select(`
          id, 
          folder_name, 
          folder_type, 
          description, 
          client_accessible, 
          created_at, 
          created_by, 
          parent_folder_id, 
          is_deleted
        `)
        .eq("project_id", projectId)
        .eq("is_deleted", false)
        .order("folder_name");

      // Apply parent_folder_id filter only if the argument is explicitly provided (not undefined)
      if (parentFolderId !== undefined) {
        if (parentFolderId === null) {
          query = query.is("parent_folder_id", null);
        } else {
          query = query.eq("parent_folder_id", parentFolderId);
        }
      }

      let { data, error } = await query;

      // If error indicates missing columns (PGRST204 = column not found in schema cache),
      // fall back to basic schema without new columns
      if (error && error.code === 'PGRST204') {
        console.warn("[useProjectFolders] New folder schema columns not available, using basic schema for query");
        query = supabase
          .from("project_folders")
          .select(`
            id, 
            folder_name, 
            created_at, 
            created_by, 
            parent_folder_id, 
            is_deleted
          `)
          .eq("project_id", projectId)
          .eq("is_deleted", false)
          .order("folder_name");

        if (parentFolderId === null || parentFolderId === undefined) {
          query = query.is("parent_folder_id", null);
        } else {
          query = query.eq("parent_folder_id", parentFolderId);
        }

        const retryResult = await query;
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        console.error("[useProjectFolders] Query error:", error);
        
        // Handle infinite recursion error from RLS policy
        if (error.code === '42P17') {
          console.warn("[useProjectFolders] RLS policy recursion detected. This is a database configuration issue.");
          console.warn("[useProjectFolders] Returning empty array. Folders may exist but cannot be queried due to policy.");
          return [];
        }
        
        throw error;
      }
      
      console.log("[useProjectFolders] Query returned", data?.length || 0, "folders");
      
      // Fetch document counts for each folder separately, filtering out deleted documents
      const foldersWithCounts = await Promise.all(
        (data || []).map(async (folder: any) => {
          // Count only non-deleted documents
          const { count, error: countError } = await supabase
            .from("project_documents")
            .select("*", { count: "exact", head: true })
            .eq("folder_id", folder.id)
            .eq("is_deleted", false)
            .is("deleted_at", null);
          
          if (countError) {
            console.warn(`[useProjectFolders] Error counting documents for folder ${folder.id}:`, countError);
          }
          
          return {
            ...folder,
            folder_type: folder.folder_type || 'shared',
            description: folder.description || null,
            client_accessible: folder.client_accessible || false,
            document_count: count || 0,
          };
        })
      );
      
      return foldersWithCounts;
    },
    enabled: !!projectId,
    staleTime: Infinity, // Never consider cache stale - we manually manage updates
    refetchOnMount: false, // Don't auto-refetch on mount to avoid RLS errors
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    retry: false, // Don't retry failed queries
  });
}