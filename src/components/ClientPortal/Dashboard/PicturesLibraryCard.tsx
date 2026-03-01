import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, Camera } from "lucide-react";
import { useLocalization } from '@/contexts/LocalizationContext';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { useProjectPhotos } from '@/hooks/clientPortal/useProjectPhotos';
import { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

interface PicturesLibraryCardProps {
  clientId?: string | null;
}

export function PicturesLibraryCard({ clientId }: PicturesLibraryCardProps) {
  const navigate = useNavigate();
  const { projectId } = useClientPortalAuth();
  const { t } = useLocalization();
  const { photos, isLoading, getPhotoUrl } = useProjectPhotos();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loadingUrls, setLoadingUrls] = useState(true);

  // Fetch signed URLs for all photos
  useEffect(() => {
    const fetchPhotoUrls = async () => {
      if (photos.length === 0) {
        setPhotoUrls([]);
        setLoadingUrls(false);
        return;
      }

      try {
        const urls = await Promise.all(
          photos.map(async (photo) => {
            const url = await getPhotoUrl(photo.file_path);
            return url || '';
          })
        );
        setPhotoUrls(urls.filter(url => url !== ''));
      } catch (error) {
        console.error('Error fetching photo URLs:', error);
        setPhotoUrls([]);
      } finally {
        setLoadingUrls(false);
      }
    };

    fetchPhotoUrls();
    // Only depend on photos array length to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length]);

  // Use real photos or fallback to placeholders
  const images = photoUrls.length > 0
    ? photoUrls
    : [
        "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=300&h=200",
        "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=300&h=200",
        "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=300&h=200",
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=300&h=200"
      ];

  const handleViewAllPhotos = () => {
    if (projectId) {
      navigate(`/portal/${projectId}/photos`);
    }
  };

  return (
    <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-2xl hover:shadow-md transition-all duration-300 h-full overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 border-b border-border/50 bg-muted/30">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          {t("clientPortal.dashboard.picturesLibrary.title")}
        </CardTitle>
        <Button
          onClick={handleViewAllPhotos}
          variant="default"
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white rounded-full shadow-sm h-8 px-3"
        >
          {t("clientPortal.dashboard.picturesLibrary.viewAll")}
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading || loadingUrls ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="relative group">
            <div
              className="flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-hide"
            >
              <style>
                {`
                  .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                  }
                `}
              </style>
              {images.map((src, i) => (
                <div key={i} className="flex-none w-64 aspect-video rounded-xl overflow-hidden snap-center shadow-sm hover:shadow-md transition-shadow">
                  <img src={src} alt={t("clientPortal.dashboard.picturesLibrary.photoAlt", { number: i + 1 })} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          
          <Button variant="secondary" size="icon" className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -ml-5 shadow-lg bg-white/90 backdrop-blur-sm">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="secondary" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity -mr-5 shadow-lg bg-white/90 backdrop-blur-sm">
            <ChevronRight className="h-5 w-5" />
          </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
