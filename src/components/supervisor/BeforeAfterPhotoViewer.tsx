import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveStorageUrl } from "@/utils/storage";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface BeforeAfterPhotoViewerProps {
  beforeUrl?: string | null;
  afterUrl?: string | null;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function BeforeAfterPhotoViewer({
  beforeUrl,
  afterUrl,
  beforeLabel = 'BEFORE',
  afterLabel = 'AFTER',
  className,
  showLabels = true,
  size = 'md',
}: BeforeAfterPhotoViewerProps) {
  const [resolvedBeforeUrl, setResolvedBeforeUrl] = useState<string | null>(null);
  const [resolvedAfterUrl, setResolvedAfterUrl] = useState<string | null>(null);
  const [loadingBefore, setLoadingBefore] = useState(true);
  const [loadingAfter, setLoadingAfter] = useState(true);

  useEffect(() => {
    const resolveUrls = async () => {
      if (beforeUrl) {
        setLoadingBefore(true);
        const resolved = await resolveStorageUrl(beforeUrl, 60 * 60 * 24);
        setResolvedBeforeUrl(resolved);
        setLoadingBefore(false);
      } else {
        setLoadingBefore(false);
      }

      if (afterUrl) {
        setLoadingAfter(true);
        const resolved = await resolveStorageUrl(afterUrl, 60 * 60 * 24);
        setResolvedAfterUrl(resolved);
        setLoadingAfter(false);
      } else {
        setLoadingAfter(false);
      }
    };
    resolveUrls();
  }, [beforeUrl, afterUrl]);

  const heightClasses = {
    sm: 'h-32',
    md: 'h-48',
    lg: 'h-64',
  };

  if (!beforeUrl && !afterUrl) {
    return null;
  }

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {/* Before Photo */}
      <div className="relative">
        {showLabels && (
          <Badge
            variant="outline"
            className="absolute top-2 left-2 z-10 bg-black/60 text-white border-white/20 backdrop-blur-sm"
          >
            {beforeLabel}
          </Badge>
        )}
        {loadingBefore ? (
          <Skeleton className={cn("w-full rounded-lg", heightClasses[size])} />
        ) : resolvedBeforeUrl ? (
          <img
            src={resolvedBeforeUrl}
            alt={beforeLabel}
            className={cn("w-full rounded-lg object-cover border-2", heightClasses[size])}
          />
        ) : (
          <div className={cn("w-full rounded-lg border-2 border-dashed flex items-center justify-center bg-muted", heightClasses[size])}>
            <span className="text-xs text-muted-foreground">No {beforeLabel.toLowerCase()} photo</span>
          </div>
        )}
      </div>

      {/* After Photo */}
      <div className="relative">
        {showLabels && (
          <Badge
            variant="outline"
            className="absolute top-2 right-2 z-10 bg-green-600/80 text-white border-green-500/20 backdrop-blur-sm"
          >
            {afterLabel}
          </Badge>
        )}
        {loadingAfter ? (
          <Skeleton className={cn("w-full rounded-lg", heightClasses[size])} />
        ) : resolvedAfterUrl ? (
          <img
            src={resolvedAfterUrl}
            alt={afterLabel}
            className={cn("w-full rounded-lg object-cover border-2 border-green-500", heightClasses[size])}
          />
        ) : (
          <div className={cn("w-full rounded-lg border-2 border-dashed flex items-center justify-center bg-muted", heightClasses[size])}>
            <span className="text-xs text-muted-foreground">No {afterLabel.toLowerCase()} photo</span>
          </div>
        )}
      </div>
    </div>
  );
}
