import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { supabase } from '@/integrations/supabase/client'
import { Upload, X, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useLocalization } from '@/contexts/LocalizationContext'

interface TemplateImageUploadProps {
  currentImageUrl?: string | null
  onImageUrlChange: (url: string | null) => void
  bucketName?: string
  maxFileSizeBytes?: number
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export function TemplateImageUpload({
  currentImageUrl,
  onImageUrlChange,
  bucketName = 'template-images',
  maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE,
}: TemplateImageUploadProps) {
  const { t } = useLocalization()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Sync previewUrl with currentImageUrl when it changes
  useEffect(() => {
    setPreviewUrl(currentImageUrl || null)
  }, [currentImageUrl])

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: t('templates:imageUpload.invalidFileType', 'Please upload a valid image file (JPEG, PNG, WebP, or GIF)'),
      }
    }

    if (file.size > maxFileSizeBytes) {
      const maxSizeMB = Math.round(maxFileSizeBytes / 1024 / 1024)
      return {
        valid: false,
        error: t('templates:imageUpload.fileTooLarge', `File size must be less than ${maxSizeMB}MB`),
      }
    }

    return { valid: true }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validation = validateFile(file)
    if (!validation.valid) {
      toast({
        title: t('common.error'),
        description: validation.error,
        variant: 'destructive',
      })
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `templates/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath)

      if (data?.publicUrl) {
        onImageUrlChange(data.publicUrl)
        toast({
          title: t('common.success'),
          description: t('templates:imageUpload.uploadSuccess', 'Image uploaded successfully'),
        })
      }
    } catch (error: any) {
       toast({
         title: t('common.error'),
         description: typeof error?.message === 'string' 
           ? error.message 
           : t('templates:imageUpload.uploadFailed', 'Failed to upload image'),
         variant: 'destructive',
       })
       setPreviewUrl(currentImageUrl || null)
     } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteImage = async () => {
    setIsUploading(true)
    try {
      // Delete the file from storage if it exists
      if (currentImageUrl) {
        // Extract the file path from the URL
        const urlParts = currentImageUrl.split('/storage/v1/object/public/')
        if (urlParts[1]) {
          const filePath = urlParts[1].split('/').slice(1).join('/')
          await supabase.storage
            .from(bucketName)
            .remove([filePath])
        }
      }

      onImageUrlChange(null)
      setPreviewUrl(null)
      setShowDeleteConfirm(false)
      toast({
        title: t('common.success'),
        description: t('templates:imageUpload.deleteSuccess', 'Image deleted successfully'),
      })
     } catch (error: any) {
       toast({
         title: t('common.error'),
         description: typeof error?.message === 'string'
           ? error.message
           : t('templates:imageUpload.deleteFailed', 'Failed to delete image'),
         variant: 'destructive',
       })
     } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
        {previewUrl ? (
          <div className="relative w-full h-40 bg-slate-100 rounded-lg overflow-hidden">
            <img
              src={previewUrl}
              alt="Template preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {t('common.change', 'Change')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('common.delete', 'Delete')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-40 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-700">
              {t('templates:imageUpload.dragDrop', 'Drag and drop your image here')}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {t('templates:imageUpload.orClick', 'or click to select')}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {t('templates:imageUpload.supportedFormats', 'Supported formats: JPEG, PNG, WebP, GIF')}
            </p>
            <p className="text-xs text-slate-400">
              {t('templates:imageUpload.maxSize', `Max size: ${Math.round(maxFileSizeBytes / 1024 / 1024)}MB`)}
            </p>
          </div>
        )}
      </div>

      <Input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {isUploading && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('common.uploading', 'Uploading...')}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('templates:imageUpload.confirmDelete', 'Delete Image')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('templates:imageUpload.deleteConfirmation', 'Are you sure you want to delete this image? This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>
              {t('common.cancel', 'Cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImage}
              disabled={isUploading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUploading ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
