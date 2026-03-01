import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Grid, Maximize2 } from "lucide-react";
import { resolveStorageUrl } from "@/utils/storage";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PhotoGalleryModalProps {
  photos: string[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
  title?: string;
}

export function PhotoGalleryModal({
  photos,
  isOpen,
  onClose,
  initialIndex = 0,
  title = 'Photo Gallery',
}: PhotoGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [viewMode, setViewMode] = useState<'lightbox' | 'grid'>('lightbox');
  const [resolvedUrls, setResolvedUrls] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    const resolveAllUrls = async () => {
      if (photos.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const resolved = await Promise.all(
        photos.map(url => resolveStorageUrl(url, 60 * 60 * 24))
      );
      setResolvedUrls(resolved);
      setLoading(false);
    };

    if (isOpen) {
      resolveAllUrls();
    }
  }, [photos, isOpen]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const currentPhoto = resolvedUrls[currentIndex];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode(viewMode === 'lightbox' ? 'grid' : 'lightbox')}
            >
              {viewMode === 'lightbox' ? <Grid className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'lightbox' ? (
            <div className="relative h-full flex items-center justify-center bg-black/5">
              {loading ? (
                <Skeleton className="w-full h-full max-w-4xl max-h-[70vh]" />
              ) : currentPhoto ? (
                <>
                  <img
                    src={currentPhoto}
                    alt={`Photo ${currentIndex + 1}`}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                  {photos.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePrevious}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  No photo available
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 overflow-y-auto h-full">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {loading ? (
                  Array.from({ length: photos.length }).map((_, idx) => (
                    <Skeleton key={idx} className="w-full aspect-square rounded-lg" />
                  ))
                ) : (
                  resolvedUrls.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setViewMode('lightbox');
                      }}
                      className={cn(
                        "relative rounded-lg overflow-hidden border-2 transition-all",
                        idx === currentIndex ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50"
                      )}
                    >
                      {url ? (
                        <img
                          src={url}
                          alt={`Photo ${idx + 1}`}
                          className="w-full aspect-square object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">Failed to load</span>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1} / {photos.length}
          </div>
          {viewMode === 'lightbox' && photos.length > 1 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
