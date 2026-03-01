import { useState, useCallback, useRef } from "react";
import { Upload, File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLocalization } from "@/contexts/LocalizationContext";

interface DragDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  children: React.ReactNode;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedFileTypes?: string[];
}

export function DragDropZone({
  onFilesSelected,
  children,
  maxFiles = 10,
  maxSizeMB = 20,
  acceptedFileTypes,
}: DragDropZoneProps) {
  const { t } = useLocalization();
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const validateFiles = useCallback(
    (files: FileList | File[]): File[] => {
      const fileArray = Array.from(files);
      const validFiles: File[] = [];
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      for (const file of fileArray) {
        // Check file count
        if (validFiles.length >= maxFiles) {
          toast.error(`Maximum ${maxFiles} files allowed at once`);
          break;
        }

        // Check file size
        if (file.size > maxSizeBytes) {
          toast.error(
            `File "${file.name}" is too large. Maximum size is ${maxSizeMB}MB`
          );
          continue;
        }

        // Check file type if specified
        if (acceptedFileTypes && acceptedFileTypes.length > 0) {
          const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
          const mimeType = file.type;
          
          const isAccepted = acceptedFileTypes.some(
            (type) =>
              type === mimeType ||
              type === fileExtension ||
              (type.endsWith("/*") && mimeType.startsWith(type.replace("/*", "")))
          );

          if (!isAccepted) {
            toast.error(
              `File "${file.name}" has unsupported type. Accepted: ${acceptedFileTypes.join(", ")}`
            );
            continue;
          }
        }

        validFiles.push(file);
      }

      return validFiles;
    },
    [maxFiles, maxSizeMB, acceptedFileTypes]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const validFiles = validateFiles(e.dataTransfer.files);
        if (validFiles.length > 0) {
          onFilesSelected(validFiles);
        }
      }
    },
    [validateFiles, onFilesSelected]
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative"
    >
      {children}

      {/* Drag overlay */}
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity",
          isDragging ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-primary bg-card p-12 shadow-lg">
          <div className="rounded-full bg-primary/10 p-6">
            <Upload className="h-12 w-12 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold">{t("messages.dropFilesToUpload")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Release to upload files to this folder
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <FileIcon className="h-4 w-4" />
              <span>
                Max {maxFiles} files • {maxSizeMB}MB per file
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
