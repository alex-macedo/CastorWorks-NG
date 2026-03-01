import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import resolveStorageUrl from '@/utils/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLocalization } from '@/contexts/LocalizationContext';
import {
  Upload,
  X,
  FileText,
  Image,
  Video,
  Music,
  File,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface FileUploadZoneProps {
  estimateId: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
}

interface PendingFile {
  file: File;
  preview?: string;
  type: 'image' | 'pdf' | 'video' | 'audio' | 'other';
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
  dbId?: string;
}

interface UploadedFile {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
}

// File size limits (in bytes)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB total

export function FileUploadZone({ estimateId, onUploadComplete }: FileUploadZoneProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { t } = useLocalization();

  const getFileType = (file: File): PendingFile['type'] => {
    const mimeType = file.type.toLowerCase();
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'other';
  };

  const getFileIcon = (type: PendingFile['type']) => {
    switch (type) {
      case 'image':
        return Image;
      case 'pdf':
        return FileText;
      case 'video':
        return Video;
      case 'audio':
        return Music;
      default:
        return File;
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach((rejection) => {
        const errors = rejection.errors.map((e: any) => e.message).join(', ');
        toast({
          title: t('estimates.fileUpload.fileRejected'),
          description: `${rejection.file.name}: ${errors}`,
          variant: 'destructive',
        });
      });
    }

    // Check individual file sizes
    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: t('estimates.fileUpload.fileTooLarge'),
          description: t('estimates.fileUpload.fileTooLargeDescription', {
            name: file.name,
            max: '50MB',
          }),
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    // Check total size
    const currentTotal = pendingFiles.reduce((sum, f) => sum + f.file.size, 0);
    const newTotal = validFiles.reduce((sum, f) => sum + f.size, 0);
    if (currentTotal + newTotal > MAX_TOTAL_SIZE) {
      toast({
        title: t('estimates.fileUpload.totalSizeTooLarge'),
        description: t('estimates.fileUpload.totalSizeTooLargeDescription', { max: '200MB' }),
        variant: 'destructive',
      });
      return;
    }

    const newFiles = validFiles.map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      type: getFileType(file),
      status: 'pending' as const,
      progress: 0,
    }));

    setPendingFiles((prev) => [...prev, ...newFiles]);
  }, [pendingFiles, toast, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.heic', '.webp'],
      'application/pdf': ['.pdf'],
      'video/*': ['.mp4', '.mov'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.webm'],
    },
    multiple: true,
    maxSize: MAX_FILE_SIZE,
  });

  const removeFile = (index: number) => {
    setPendingFiles((prev) => {
      const file = prev[index];
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadFile = async (file: PendingFile, index: number): Promise<UploadedFile | null> => {
    // Update status to uploading
    setPendingFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, status: 'uploading' as const } : f))
    );

    try {
      // Generate unique file name
      const fileExt = file.file.name.split('.').pop();
      const fileName = `${estimateId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('estimate-files')
        .upload(fileName, file.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Persist the stable storage path (fileName) to DB. Do NOT store expiring signed URLs.
      // Generate a short-lived preview URL for immediate UI feedback only.
      const previewUrl = await resolveStorageUrl(`estimate-files/${fileName}`, 60 * 60);

      // Create database record with stable path
      const { data: dbData, error: dbError } = await supabase
        .from('estimate_files')
        .insert({
          estimate_id: estimateId,
          file_url: fileName, // store path (bucket key)
          file_name: file.file.name,
          file_type: file.file.type,
          file_size: file.file.size,
          processing_status: 'pending',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Update status to processing
      setPendingFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? { ...f, status: 'processing' as const, progress: 100, dbId: dbData.id, preview: previewUrl || f.preview }
            : f
        )
      );

      return dbData as UploadedFile;
    } catch (error: any) {
      // Update status to error
      setPendingFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? { ...f, status: 'error' as const, error: error.message }
            : f
        )
      );
      return null;
    }
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;

    setUploading(true);
    const uploadedFiles: UploadedFile[] = [];

    try {
      // Upload files one by one
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        if (file.status === 'pending') {
          const uploaded = await uploadFile(file, i);
          if (uploaded) {
            uploadedFiles.push(uploaded);
          }
        }
      }

      // Mark successful uploads as complete
      setPendingFiles((prev) =>
        prev.map((f) =>
          f.status === 'processing' ? { ...f, status: 'complete' as const } : f
        )
      );

      toast({
        title: t('estimates.fileUpload.uploadComplete'),
        description: t('estimates.fileUpload.uploadCompleteDescription', {
          count: uploadedFiles.length,
        }),
      });

      if (onUploadComplete && uploadedFiles.length > 0) {
        onUploadComplete(uploadedFiles);
      }

      // Clear completed files after a delay
      setTimeout(() => {
        setPendingFiles((prev) => prev.filter((f) => f.status === 'error'));
      }, 2000);
    } catch (error: any) {
      toast({
        title: t('estimates.fileUpload.uploadFailed'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusIcon = (status: PendingFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const totalSize = pendingFiles.reduce((sum, f) => sum + f.file.size, 0);
  const hasErrors = pendingFiles.some((f) => f.status === 'error');

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">
          {isDragActive
            ? t('estimates.fileUpload.dropHere')
            : t('estimates.fileUpload.dragDrop')}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('estimates.fileUpload.supportedFormats')}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <Badge variant="outline">Images (JPG, PNG, HEIC, WebP)</Badge>
          <Badge variant="outline">PDF</Badge>
          <Badge variant="outline">Video (MP4, MOV)</Badge>
          <Badge variant="outline">Audio (MP3, WAV, M4A)</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          {t('estimates.fileUpload.limits', { maxFile: '50MB', maxTotal: '200MB' })}
        </p>
      </div>

      {/* Pending Files List */}
      {pendingFiles.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {pendingFiles.map((file, index) => {
                const FileIcon = getFileIcon(file.type);
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.file.name}
                        className="h-12 w-12 object-cover rounded"
                      />
                    ) : (
                      <div className="h-12 w-12 flex items-center justify-center bg-muted rounded">
                        <FileIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{file.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file.size)} • {file.type.toUpperCase()}
                      </p>
                      {file.status === 'uploading' && (
                        <Progress value={file.progress} className="h-1 mt-2" />
                      )}
                      {file.error && (
                        <p className="text-xs text-destructive mt-1">{file.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(file.status)}
                      {file.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(index)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm">
                <span className="font-medium">{pendingFiles.length}</span>{' '}
                {pendingFiles.length === 1
                  ? t('estimates.fileUpload.file')
                  : t('estimates.fileUpload.files')}{' '}
                • <span className="font-medium">{formatFileSize(totalSize)}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPendingFiles([])}
                  disabled={uploading}
                >
                  {t('estimates.fileUpload.clearAll')}
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || pendingFiles.length === 0 || hasErrors}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('estimates.fileUpload.uploading')}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {t('estimates.fileUpload.upload')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
