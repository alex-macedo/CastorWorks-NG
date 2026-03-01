import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  mime_type: string | null;
  storage_path: string;
}

interface DocumentPreviewDialogProps {
  document: Document;
  open: boolean;
  onClose: () => void;
}

export function DocumentPreviewDialog({
  document,
  open,
  onClose,
}: DocumentPreviewDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) {
      setPreviewUrl(null);
      return;
    }

    let isMounted = true;
    let objectUrl: string | null = null;

    const loadPreview = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from("project-documents")
          .download(document.storage_path);

        if (error) throw error;

        objectUrl = URL.createObjectURL(data);
        if (isMounted) {
          setPreviewUrl(objectUrl);
        }
      } catch (error) {
        console.error("Preview error:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [open, document.storage_path]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{document.file_name}</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[70vh]">
          {loading && (
            <Skeleton className="w-full h-96" />
          )}
          {!loading && previewUrl && (
            <>
              {document.file_type === "image" && (
                <img
                  src={previewUrl}
                  alt={document.file_name}
                  className="w-full h-auto"
                />
              )}
              {document.mime_type === "application/pdf" && (
                <iframe
                  src={previewUrl}
                  className="w-full h-[600px] border-0"
                  title={document.file_name}
                />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
