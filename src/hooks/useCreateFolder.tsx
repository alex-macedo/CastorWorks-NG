import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type FolderType = 'personal' | 'shared' | 'client';

interface CreateFolderParams {
  projectId: string;
  folderName: string;
  parentFolderId?: string | null;
  folderType?: FolderType;
  description?: string;
  clientAccessible?: boolean;
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      projectId, 
      folderName, 
      parentFolderId,
      folderType = 'shared',
      description,
      clientAccessible = false
    }: CreateFolderParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("project_folders")
        .insert({
          project_id: projectId,
          folder_name: folderName,
          parent_folder_id: parentFolderId || null,
          folder_type: folderType,
          description: description || null,
          client_accessible: folderType === 'client' ? clientAccessible : false,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-folders"] });
      toast.success(`Folder "${data.folder_name}" created`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create folder: ${error.message}`);
    },
  });
}
