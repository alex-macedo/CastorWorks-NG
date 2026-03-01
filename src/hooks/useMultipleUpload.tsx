import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PostgrestError, PostgrestSingleResponse } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadProgress {
  fileName: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
}

interface UploadMultipleParams {
  projectId: string;
  files: File[];
  folderId?: string | null;
}

export function useMultipleUpload() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
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

  const insertDocumentRecord = async (record: Record<string, unknown>) => {
    let payload: Record<string, unknown> | null = { ...record };
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

  const mutation = useMutation({
    mutationFn: async ({ projectId, files, folderId }: UploadMultipleParams) => {
      console.log('useMultipleUpload: Starting upload of files', { projectId, count: files.length, folderId });
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Initialize progress tracking
      const initialProgress: Record<string, UploadProgress> = {};
      files.forEach((file) => {
        initialProgress[file.name] = {
          fileName: file.name,
          status: "pending",
          progress: 0,
        };
      });
      setUploadProgress(initialProgress);

      const results = await Promise.allSettled(
        files.map(async (file) => {
          try {
            // Update to uploading
            setUploadProgress((prev) => ({
              ...prev,
              [file.name]: { ...prev[file.name], status: "uploading", progress: 30 },
            }));

            // Generate unique file path
            const timestamp = Date.now();
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const storagePath = `${projectId}/${timestamp}_${sanitizedFileName}`;

            // Upload to storage
            const { error: uploadError } = await supabase.storage
              .from("project-documents")
              .upload(storagePath, file);

            if (uploadError) {
              console.error('useMultipleUpload: Storage upload failed', uploadError);
              
              // Handle Nginx 404 errors or other non-JSON responses
              if (uploadError.message?.includes('<html>') || (uploadError as any).status === 404) {
                throw new Error('Upload failed: Storage service endpoint not found (404). Please contact support to verify server routing configuration.');
              }
              
              throw uploadError;
            }

            // Update progress
            setUploadProgress((prev) => ({
              ...prev,
              [file.name]: { ...prev[file.name], progress: 60 },
            }));

            // Create document record with schema fallback
            const documentRecord: Record<string, unknown> = {
              project_id: projectId,
              folder_id: folderId || null,
              file_name: file.name,
              file_type: file.type.split("/")[0] || "other",
              mime_type: file.type,
              file_size: file.size,
              storage_path: storagePath,
              file_url: storagePath,
              uploaded_by: user.id,
            };

            console.log(`useMultipleUpload: Inserting record for ${file.name}`, documentRecord);
            const { error: dbError } = await insertDocumentRecord(documentRecord);

            if (dbError) {
              // Cleanup uploaded file if DB insert fails
              await supabase.storage.from("project-documents").remove([storagePath]);
              throw dbError;
            }

            // Success
            setUploadProgress((prev) => ({
              ...prev,
              [file.name]: { ...prev[file.name], status: "success", progress: 100 },
            }));

            return { fileName: file.name, success: true };
          } catch (error) {
            setUploadProgress((prev) => ({
              ...prev,
              [file.name]: {
                ...prev[file.name],
                status: "error",
                progress: 0,
                error: error instanceof Error ? error.message : "Upload failed",
              },
            }));
            throw error;
          }
        })
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return { successful, failed, total: files.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project-documents"] });
      
      if (data.failed === 0) {
        toast.success(`Successfully uploaded ${data.successful} file${data.successful > 1 ? "s" : ""}`);
      } else {
        toast.warning(
          `Uploaded ${data.successful} file${data.successful > 1 ? "s" : ""}, ${data.failed} failed`
        );
      }

      // Clear progress after a delay
      setTimeout(() => setUploadProgress({}), 3000);
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
      setTimeout(() => setUploadProgress({}), 3000);
    },
  });

  return {
    ...mutation,
    uploadProgress,
  };
}
