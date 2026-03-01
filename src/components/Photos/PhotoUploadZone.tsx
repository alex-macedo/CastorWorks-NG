import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { useTranslation } from "react-i18next";
interface PhotoUploadZoneProps {
  projectId: string;
  onUploadComplete?: () => void;
}

interface PendingPhoto {
  file: File;
  preview: string;
  category: string;
  caption: string;
}

export function PhotoUploadZone({ projectId, onUploadComplete }: PhotoUploadZoneProps) {
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const { t } = useTranslation('projectDetail');

    const onDrop = useCallback((acceptedFiles: File[]) => {
      const newPhotos = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        category: 'other', // Default category for new photos
        caption: '',
      }));
      setPendingPhotos(prev => [...prev, ...newPhotos]);
    }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: true
  });

  const removePhoto = (index: number) => {
    setPendingPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updatePhoto = (index: number, field: 'category' | 'caption', value: string) => {
    setPendingPhotos(prev => prev.map((photo, i) => 
      i === index ? { ...photo, [field]: value } : photo
    ));
  };

  const handleUpload = async () => {
    if (pendingPhotos.length === 0) return;

    console.log('📸 PhotoUploadZone: Starting upload process', {
      projectId,
      pendingPhotosCount: pendingPhotos.length
    });

    setUploading(true);
    setUploadProgress(0);
    const totalPhotos = pendingPhotos.length;
    let uploaded = 0;

    try {
      for (const [index, photo] of pendingPhotos.entries()) {
        console.log(`📸 PhotoUploadZone: Processing photo ${index + 1}/${totalPhotos}`, {
          fileName: photo.file.name,
          fileSize: photo.file.size,
          category: photo.category,
          caption: photo.caption
        });

        const fileExt = photo.file.name.split('.').pop();
        const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        console.log('📸 PhotoUploadZone: Generated file path', { fileName });

        // Upload to storage
        console.log('📸 PhotoUploadZone: Starting storage upload...');
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-images')
          .upload(fileName, photo.file);

        if (uploadError) {
          console.error('📸 PhotoUploadZone: Storage upload failed', { uploadError, fileName });
          throw uploadError;
        }

        console.log('📸 PhotoUploadZone: Storage upload successful', { uploadData, fileName });

        // Get current user
        console.log('📸 PhotoUploadZone: Getting current user...');
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError) {
          console.error('📸 PhotoUploadZone: Failed to get user', { userError });
          throw userError;
        }

        console.log('📸 PhotoUploadZone: User retrieved', { userId: userData.user?.id });

        // Create database record
        console.log('📸 PhotoUploadZone: Creating database record...');
        const dbPayload = {
          project_id: projectId,
          file_path: fileName,
          category: photo.category || 'other', // Ensure category defaults to 'other' if not set
          caption: photo.caption || null,
          uploaded_by: userData.user?.id,
        };

        console.log('📸 PhotoUploadZone: Database insert payload', dbPayload);

        const { data: dbData, error: dbError } = await supabase
          .from('project_photos')
          .insert(dbPayload)
          .select();

        if (dbError) {
          console.error('📸 PhotoUploadZone: Database insert failed', { dbError, dbPayload });
          throw dbError;
        }

        console.log('📸 PhotoUploadZone: Database insert successful', { dbData });

        uploaded++;
        setUploadProgress(Math.round((uploaded / totalPhotos) * 100));
        URL.revokeObjectURL(photo.preview);

        console.log(`📸 PhotoUploadZone: Photo ${index + 1} completed successfully`);
      }

      console.log('📸 PhotoUploadZone: All photos uploaded successfully', { uploaded });

      toast({
        title: t('common.success'),
        description: t('photos.uploadSuccess', { count: uploaded }),
      });

      setPendingPhotos([]);

      console.log('📸 PhotoUploadZone: Calling onUploadComplete callback');
      onUploadComplete?.();
    } catch (error: any) {
      console.error('📸 PhotoUploadZone: Upload process failed', {
        error,
        errorMessage: error.message,
        errorDetails: error
      });

      toast({
        title: t('photos.uploadFailed'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      console.log('📸 PhotoUploadZone: Upload process finished');
      setUploading(false);
      setUploadProgress(0);
    }
  };



  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              {isDragActive ? t('photos.dropHere') : t('photos.dragDropHere')}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {t('photos.clickToBrowse')}
            </p>
            <Button type="button" variant="secondary" size="sm">
              <Camera className="h-4 w-4 mr-2" />
              {t('photos.selectPhotos')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Photos */}
      {pendingPhotos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {t('photos.photosReady', { count: pendingPhotos.length })}
            </h3>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? t('photos.uploading') : t('photos.uploadSaveAll')}
            </Button>
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-xs text-center text-muted-foreground">
                {t('photos.uploadProgress', { percent: uploadProgress })}
              </p>
            </div>
          )}

          <div className="grid gap-4">
            {pendingPhotos.map((photo, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <img
                      src={photo.preview}
                      alt={t("images.preview")}
                      className="w-24 h-24 object-cover rounded"
                    />
                    <div className="flex-1 space-y-3">
                      <div className="space-y-2">
                        <Label>{t('photos.category')}</Label>
                        <Select
                          value={photo.category}
                          onValueChange={(value) => updatePhoto(index, 'category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('photos.selectCategory')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="before">{t('photos.categories.before')}</SelectItem>
                            <SelectItem value="during">{t('photos.categories.during')}</SelectItem>
                            <SelectItem value="after">{t('photos.categories.after')}</SelectItem>
                            <SelectItem value="issues">{t('photos.categories.issues')}</SelectItem>
                            <SelectItem value="completion">{t('photos.categories.completion')}</SelectItem>
                            <SelectItem value="project_delivery">{t('photos.categories.projectDelivery')}</SelectItem>
                            <SelectItem value="other">{t('photos.categories.other')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('photos.captionOptional')}</Label>
                        <Input
                          placeholder={t('photos.addDescription')}
                          value={photo.caption}
                          onChange={(e) => updatePhoto(index, 'caption', e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePhoto(index)}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
