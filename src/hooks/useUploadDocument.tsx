import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PostgrestError, PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadDocumentParams {
  projectId: string;
  file: File;
  folderId?: string | null;
  description?: string;
  tags?: string[];
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  const isMissingColumnError = (error: PostgrestError | null) => {
    if (!error) return false;
    return (
      error.code === "PGRST204" ||
      error.message?.toLowerCase().includes("schema cache") ||
      error.message?.toLowerCase().includes("could not find")
    );
  };

  const removeMissingColumnFromRecord = (record: Record<string, unknown>, error: PostgrestError | null) => {
    if (!error || !error.message) return null;

    const match = error.message.match(/'([^']+)' column/);
    if (!match) return null;

    const columnName = match[1];
    if (!(columnName in record)) return null;

    const nextRecord = { ...record };
    delete nextRecord[columnName];
    return nextRecord;
  };

  return useMutation({
    mutationFn: async ({ projectId, file, folderId, description, tags }: UploadDocumentParams) => {
      console.log('useUploadDocument: Starting upload', { projectId, fileName: file.name, folderId });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${projectId}/${timestamp}_${sanitizedFileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(storagePath, file);

      if (uploadError) {
        console.error('useUploadDocument: Storage upload failed', uploadError);
        
        // Handle Nginx 404 errors or other non-JSON responses
        if (uploadError.message?.includes('<html>') || (uploadError as any).status === 404) {
          throw new Error('Upload failed: Storage service endpoint not found (404). Please contact support to verify server routing configuration.');
        }
        
        throw uploadError;
      }

      const documentRecord: Record<string, unknown> = {
        project_id: projectId,
        folder_id: folderId || null,
        file_name: file.name,
        file_type: file.type.split('/')[0] || 'other',
        mime_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        file_url: storagePath,
        uploaded_by: user.id,
      };

      if (typeof description !== "undefined") {
        documentRecord.description = description || null;
      }

      if (Array.isArray(tags)) {
        documentRecord.tags = tags.length > 0 ? tags : null;
      }

      const insertDocument = async () => {
        let payload: Record<string, unknown> | null = { ...documentRecord };
        let lastResponse: PostgrestSingleResponse<Record<string, unknown>> | null = null;

        while (payload) {
          const response = await supabase.from("project_documents").insert(payload).select().single();
          if (!response.error) {
            return response;
          }

          lastResponse = response;
          if (!isMissingColumnError(response.error)) {
            return response;
          }

          payload = removeMissingColumnFromRecord(payload, response.error);
        }

        return (
          lastResponse || {
            data: null,
            error: {
              message: "Missing required columns",
              code: "PGRST204",
              details: null,
              hint: null,
              name: "PostgrestError",
            } satisfies PostgrestError,
          }
        );
      };

      const { data, error } = await insertDocument();

      if (error) {
        // Cleanup uploaded file if DB insert fails
        await supabase.storage.from("project-documents").remove([storagePath]);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-documents"] });
      toast.success(`File "${data.file_name}" uploaded successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
}
