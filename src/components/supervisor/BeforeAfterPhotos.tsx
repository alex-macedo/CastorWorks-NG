import { BeforeAfterPhotoViewer } from "./BeforeAfterPhotoViewer";
import { resolveStorageUrl } from "@/utils/storage";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface BeforeAfterPhotosProps {
  beforePhoto?: string | null;
  afterPhoto?: string | null;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

/**
 * Component for displaying before/after photo pairs for issues
 * Supports both direct photo URLs and storage paths
 */
export function BeforeAfterPhotos({
  beforePhoto,
  afterPhoto,
  beforeLabel = "BEFORE",
  afterLabel = "AFTER",
  className,
  size = 'md',
  showLabels = true,
}: BeforeAfterPhotosProps) {
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolvePhotos = async () => {
      try {
        setLoading(true);
        
        const [before, after] = await Promise.all([
          beforePhoto ? resolveStorageUrl(beforePhoto, 60 * 60 * 24) : null,
          afterPhoto ? resolveStorageUrl(afterPhoto, 60 * 60 * 24) : null,
        ]);

        setBeforeUrl(before);
        setAfterUrl(after);
      } catch (error) {
        console.error('Error resolving before/after photos:', error);
      } finally {
        setLoading(false);
      }
    };

    resolvePhotos();
  }, [beforePhoto, afterPhoto]);

  if (loading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="w-full aspect-square rounded-lg" />
          <Skeleton className="w-full aspect-square rounded-lg" />
        </div>
      </div>
    );
  }

  // Only show if at least one photo exists
  if (!beforeUrl && !afterUrl) {
    return null;
  }

  return (
    <div className={className}>
      <BeforeAfterPhotoViewer
        beforeUrl={beforeUrl}
        afterUrl={afterUrl}
        beforeLabel={beforeLabel}
        afterLabel={afterLabel}
        size={size}
        showLabels={showLabels}
      />
    </div>
  );
}
