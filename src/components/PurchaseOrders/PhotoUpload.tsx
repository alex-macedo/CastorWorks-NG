import { useState, useCallback } from 'react'
import { Upload, X, Image as ImageIcon, Loader2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/lib/toast-helpers'
import { PhotoAnnotator } from './PhotoAnnotator'
import { resolveStorageUrl } from '@/utils/storage'
import { useLocalization } from '@/contexts/LocalizationContext'

interface PhotoUploadProps {
  purchaseOrderId: string
  onPhotosChange: (urls: string[]) => void
  maxPhotos?: number
}

export function PhotoUpload({ purchaseOrderId, onPhotosChange, maxPhotos = 10 }: PhotoUploadProps) {
  const { t } = useLocalization();
  const [photos, setPhotos] = useState<Array<{ url: string; preview?: string; file?: File; uploading?: boolean }>>([])
  const [uploading, setUploading] = useState(false)
  const [annotatingPhoto, setAnnotatingPhoto] = useState<{ url: string; index: number } | null>(null)

  const uploadPhoto = useCallback(async (file: File | Blob, isAnnotated = false): Promise<string | null> => {
    try {
      const fileExt = file instanceof File ? file.name.split('.').pop() : 'png'
      const prefix = isAnnotated ? 'annotated' : 'original'
      const fileName = `${purchaseOrderId}/${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError, data } = await supabase.storage
        .from('delivery-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Create a signed URL for immediate preview (private bucket)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('delivery-photos')
        .createSignedUrl(fileName, 60 * 60) // short preview TTL (1 hour)

      if (urlError) {
        console.warn('Failed to create preview signed URL', urlError)
      }

      // Return the stable storage path so the parent can persist it
      return fileName
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error('Failed to upload photo', error instanceof Error ? error.message : 'Unknown error')
      return null
    }
  }, [purchaseOrderId])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (photos.length + files.length > maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos allowed`)
      return
    }

    // Validate file sizes (20MB limit)
    const invalidFiles = files.filter(f => f.size > 20 * 1024 * 1024)
    if (invalidFiles.length > 0) {
      toast.error('Some files exceed 20MB limit')
      return
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    const invalidTypes = files.filter(f => !validTypes.includes(f.type))
    if (invalidTypes.length > 0) {
      toast.error('Only JPEG, PNG, WEBP, and HEIC images are allowed')
      return
    }

    setUploading(true)

      // Create local previews for immediate UI
    const newPhotos = files.map(file => ({
      url: URL.createObjectURL(file),
      preview: URL.createObjectURL(file),
      file,
      uploading: true
    }))

    setPhotos(prev => [...prev, ...newPhotos])

    // Upload files
    const uploadedPaths: string[] = []
    for (let i = 0; i < files.length; i++) {
      const fileItemIndex = photos.length + i
      const path = await uploadPhoto(files[i])
      if (path) {
        uploadedPaths.push(path)
        // Resolve a preview signed URL via helper
        try {
          const preview = await resolveStorageUrl(path, 60 * 60)
          setPhotos(prev => prev.map((p, idx) => 
            idx === fileItemIndex
              ? { ...p, url: path, preview, uploading: false, file: undefined }
              : p
          ))
        } catch (e) {
          setPhotos(prev => prev.map((p, idx) => 
            idx === fileItemIndex
              ? { ...p, url: path, uploading: false, file: undefined }
              : p
          ))
        }
      } else {
        // Remove failed upload
        setPhotos(prev => prev.filter((_, idx) => idx !== fileItemIndex))
      }
    }

    setUploading(false)
    // Notify parent with stable storage paths (do not send expiring signed URLs)
    const stablePaths = [...photos.map(p => p.url).filter(u => !u.startsWith('blob:')) , ...uploadedPaths]
    onPhotosChange(stablePaths)

    // Clear input
    e.target.value = ''
  }, [photos, maxPhotos, onPhotosChange, uploadPhoto])

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    setPhotos(newPhotos)
    onPhotosChange(newPhotos.map(p => p.url).filter(url => !url.startsWith('blob:')))
  }

  const handleAnnotate = (index: number) => {
    setAnnotatingPhoto({ url: photos[index].url, index })
  }

  const handleAnnotationSave = async (annotatedBlob: Blob) => {
    if (!annotatingPhoto) return

    setUploading(true)
    
    // Upload annotated photo
    const url = await uploadPhoto(annotatedBlob, true)
    
    if (url) {
      // Replace the original photo with the annotated one
      setPhotos(prev => prev.map((p, idx) => 
        idx === annotatingPhoto.index 
          ? { ...p, url, uploading: false }
          : p
      ))
      onPhotosChange(photos.map((p, idx) => 
        idx === annotatingPhoto.index ? url : p.url
      ).filter(url => !url.startsWith('blob:')))
      toast.success('Annotation saved successfully')
    }

    setUploading(false)
    setAnnotatingPhoto(null)
  }

  return (
    <>
      {annotatingPhoto && (
        <PhotoAnnotator
          imageUrl={annotatingPhoto.url}
          onSave={handleAnnotationSave}
          onCancel={() => setAnnotatingPhoto(null)}
        />
      )}
      
      <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Photos ({photos.length}/{maxPhotos})</label>
        {photos.length < maxPhotos && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => document.getElementById('photo-upload')?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Add Photos
              </>
            )}
          </Button>
        )}
        <input
          id="photo-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {photos.map((photo, index) => (
            <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
              {photo.uploading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <img
                    src={photo.preview || (photo.url.startsWith('blob:') ? photo.url : undefined) || photo.url}
                    alt={`Delivery photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleAnnotate(index)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("messages.noPhotosAddedYet")}</p>
          <p className="text-xs mt-1">{t("messages.addPhotosToDocumentDelivery")}</p>
        </div>
      )}
    </div>
    </>
  )
}
