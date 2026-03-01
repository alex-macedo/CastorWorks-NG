import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveStorageUrl } from '@/utils/storage';
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Download, Trash2, Edit2, ZoomIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDateFormat } from "@/hooks/useDateFormat";
import { format } from "date-fns";

import { useLocalization } from "@/contexts/LocalizationContext";
interface Photo {
  id: string;
  file_path: string;
  category: string;
  caption?: string;
  uploaded_at: string;
  sort_order: number;
}

interface PhotoGalleryProps {
  photos: Photo[];
  projectId: string;
  onPhotoDeleted?: () => void;
  canEdit?: boolean;
}

const categoryColors: Record<string, string> = {
  before: "bg-blue-500",
  during: "bg-yellow-500",
  after: "bg-green-500",
  issues: "bg-red-500",
  completion: "bg-blue-500",
  project_delivery: "bg-teal-500",
  other: "bg-gray-500",
};

export function PhotoGallery({ photos, projectId, onPhotoDeleted, canEdit = true }: PhotoGalleryProps) {
  console.log('📸 PhotoGallery: Component mounted', {
    projectId,
    photosCount: photos?.length || 0
  });

  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const photoUrlsRef = useRef<Record<string, string>>({});
  const isMountedRef = useRef(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();
  const { t } = useLocalization();
  const { formatLongDate } = useDateFormat();
  const [isEditing, setIsEditing] = useState(false);
  const [editedCategory, setEditedCategory] = useState<string>("");
  const [editedCaption, setEditedCaption] = useState<string>("");

  useEffect(() => {
    photoUrlsRef.current = photoUrls;
  }, [photoUrls]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadPhotoUrl = useCallback(async (photo: Photo) => {
    console.log('📸 PhotoGallery: loadPhotoUrl called', {
      photoId: photo.id,
      filePath: photo.file_path,
      category: photo.category
    });

    const cachedUrl = photoUrlsRef.current[photo.id];
    if (cachedUrl) {
      console.log('📸 PhotoGallery: Using cached URL', { photoId: photo.id, cachedUrl: cachedUrl.substring(0, 50) + '...' });
      return cachedUrl;
    }

    console.log('📸 PhotoGallery: No cached URL, resolving storage URL', { photoId: photo.id, filePath: photo.file_path });

    // Use centralized resolver which accepts either a storage path or a full URL.
    const signedUrl = await resolveStorageUrl(photo.file_path, 60 * 60 * 24);

    if (!signedUrl) {
      console.error('📸 PhotoGallery: Failed to resolve storage URL', {
        photoId: photo.id,
        filePath: photo.file_path,
        signedUrl
      });
      return '';
    }

    console.log('📸 PhotoGallery: Successfully resolved storage URL', {
      photoId: photo.id,
      signedUrlLength: signedUrl.length,
      signedUrlPrefix: signedUrl.substring(0, 50) + '...'
    });

    photoUrlsRef.current = { ...photoUrlsRef.current, [photo.id]: signedUrl };

    if (isMountedRef.current) {
      console.log('📸 PhotoGallery: Updating photo URLs state', { photoId: photo.id });
      setPhotoUrls(prev => {
        if (prev[photo.id]) {
          console.log('📸 PhotoGallery: URL already exists in state', { photoId: photo.id });
          return prev;
        }
        console.log('📸 PhotoGallery: Adding new URL to state', { photoId: photo.id });
        return { ...prev, [photo.id]: signedUrl };
      });
    }

    return signedUrl;
  }, []);

  // Preload all photo URLs when photos change
  useEffect(() => {
    console.log('📸 PhotoGallery: Photos changed, preloading URLs', {
      photosCount: photos.length,
      photos: photos.map(p => ({ id: p.id, file_path: p.file_path })),
      existingUrlsCount: Object.keys(photoUrlsRef.current).length
    });

    photos.forEach(photo => {
      if (!photoUrlsRef.current[photo.id]) {
        console.log('📸 PhotoGallery: Preloading URL for photo', { photoId: photo.id, filePath: photo.file_path });
        void loadPhotoUrl(photo);
      } else {
        console.log('📸 PhotoGallery: URL already cached for photo', { photoId: photo.id });
      }
    });
  }, [loadPhotoUrl, photos]);

  const handleDelete = async (photoId: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    const { error: storageError } = await supabase.storage
      .from('project-images')
      .remove([filePath]);

    if (storageError) {
      toast({
        title: 'Error',
        description: 'Failed to delete photo from storage',
        variant: 'destructive',
      });
      return;
    }

    const { error: dbError } = await supabase
      .from('project_photos')
      .delete()
      .eq('id', photoId);

    if (dbError) {
      toast({
        title: 'Error',
        description: 'Failed to delete photo record',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: t('toast.photoDeletedSuccessfully') });
    setSelectedPhoto(null);
    onPhotoDeleted?.();
  };

  const handleDownload = async (photo: Photo) => {
    const url = await loadPhotoUrl(photo);
    if (!url) return;

    const link = document.createElement('a');
    link.href = url;
    link.download = `photo-${photo.id}.jpg`;
    link.click();
  };

  const handleEdit = (photo: Photo) => {
    setIsEditing(true);
    setEditedCategory(photo.category || "other"); // Ensure category defaults to 'other' if not set
    setEditedCaption(photo.caption || "");
  };

  const handleSaveEdit = async () => {
    if (!selectedPhoto) return;

    const { error } = await supabase
      .from('project_photos')
      .update({
        category: editedCategory,
        caption: editedCaption || null,
      })
      .eq('id', selectedPhoto.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update photo',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: t('toast.photoUpdatedSuccessfully') });
    setIsEditing(false);
    setSelectedPhoto(null);
    onPhotoDeleted?.();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedCategory("");
    setEditedCaption("");
  };

  const filteredPhotos = selectedCategory === 'all'
    ? photos
    : photos.filter(p => p.category === selectedCategory);

  const categories = ['all', ...new Set(photos.map(p => p.category))];

  console.log('📸 PhotoGallery: Rendering gallery', {
    totalPhotos: photos?.length || 0,
    filteredPhotos: filteredPhotos?.length || 0,
    selectedCategory,
    categories,
    photoUrlsCount: Object.keys(photoUrls).length,
    photoUrls: Object.keys(photoUrls)
  });

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="capitalize"
          >
            {category}
            {category !== 'all' && (
              <Badge variant="secondary" className="ml-2">
                {photos.filter(p => p.category === category).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredPhotos.map((photo) => (
          <Card
            key={photo.id}
            className="group relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedPhoto(photo)}
          >
            <CardContent className="p-0">
              <div className="aspect-square relative bg-muted">
                <img
                  src={photoUrls[photo.id] || '/placeholder.svg'}
                  alt={photo.caption || 'Project photo'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute top-2 left-2">
                  <Badge className={categoryColors[photo.category]}>
                    {photo.category}
                  </Badge>
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn className="h-8 w-8 text-white" />
                </div>
              </div>
              {photo.caption && (
                <div className="p-2 bg-background">
                  <p className="text-xs text-muted-foreground truncate">{photo.caption}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog 
        open={!!selectedPhoto} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPhoto(null);
            setIsEditing(false);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedPhoto?.caption || "Project photo"}</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={photoUrls[selectedPhoto.id] || '/placeholder.svg'}
                  alt={selectedPhoto.caption || 'Project photo'}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              </div>
              
              {!isEditing ? (
                // VIEW MODE
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={categoryColors[selectedPhoto.category]}>
                        {selectedPhoto.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatLongDate(new Date(selectedPhoto.uploaded_at))}
                      </span>
                    </div>
                    {selectedPhoto.caption && (
                      <p className="text-sm">{selectedPhoto.caption}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(selectedPhoto)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(selectedPhoto)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(selectedPhoto.id, selectedPhoto.file_path)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                // EDIT MODE
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={editedCategory}
                      onValueChange={setEditedCategory}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                <SelectContent>
                  <SelectItem value="before">Before</SelectItem>
                  <SelectItem value="during">During</SelectItem>
                  <SelectItem value="after">After</SelectItem>
                  <SelectItem value="issues">Issues</SelectItem>
                  <SelectItem value="completion">Completion</SelectItem>
                  <SelectItem value="project_delivery">Project Delivery</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Caption</Label>
                    <Textarea
                      placeholder={t("additionalPlaceholders.addDescription")}
                      value={editedCaption}
                      onChange={(e) => setEditedCaption(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs text-muted-foreground mr-auto">
                      {formatLongDate(new Date(selectedPhoto.uploaded_at))}
                    </span>
                    <Button
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
