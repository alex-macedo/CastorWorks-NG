import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AvatarResolved } from "@/components/ui/AvatarResolved";
import { StatusIndicator, StatusType } from "./StatusIndicator";
import { format } from "date-fns";
import { Image, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveStorageUrl } from "@/utils/storage";
import { useState, useEffect } from "react";
import { useLocalization } from "@/contexts/LocalizationContext";

interface TimelineCardProps {
  id: string;
  timestamp: string | Date;
  title?: string;
  description?: string;
  photoUrl?: string | null;
  photoUrls?: string[];
  status?: StatusType;
  metadata?: Record<string, any>;
  contributors?: Array<{ id: string; name: string; avatar?: string }>;
  onViewGallery?: (photoUrls: string[]) => void;
  className?: string;
}

export function TimelineCard({
  id,
  timestamp,
  title,
  description,
  photoUrl,
  photoUrls,
  status,
  metadata,
  contributors,
  onViewGallery,
  className,
}: TimelineCardProps) {
  const [resolvedPhotoUrl, setResolvedPhotoUrl] = useState<string | null>(null);
  const [resolvedPhotoUrls, setResolvedPhotoUrls] = useState<string[]>([]);

  // Resolve photo URLs
  useEffect(() => {
    const resolvePhotos = async () => {
      if (photoUrl) {
        const resolved = await resolveStorageUrl(photoUrl, 60 * 60 * 24);
        setResolvedPhotoUrl(resolved);
      }
      if (photoUrls && photoUrls.length > 0) {
        const resolved = await Promise.all(
          photoUrls.map(url => resolveStorageUrl(url, 60 * 60 * 24))
        );
        setResolvedPhotoUrls(resolved.filter(Boolean) as string[]);
      }
    };
    resolvePhotos();
  }, [photoUrl, photoUrls]);

  const displayPhotoUrl = resolvedPhotoUrl || (resolvedPhotoUrls.length > 0 ? resolvedPhotoUrls[0] : null);
  const hasMultiplePhotos = (photoUrls?.length || 0) > 1 || (resolvedPhotoUrls.length > 1);

  const formattedTime = typeof timestamp === 'string' 
    ? format(new Date(timestamp), 'HH:mm')
    : format(timestamp, 'HH:mm');
  
  const formattedDate = typeof timestamp === 'string'
    ? format(new Date(timestamp), 'MMM d, yyyy')
    : format(timestamp, 'MMM d, yyyy');

  return (
    <Card className={cn("border-2 shadow-sm", className)}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Timeline dot connector area - left side */}
          <div className="flex flex-col items-center">
            <div className="h-4 w-4 rounded-full bg-primary border-2 border-background shadow-sm" />
            <div className="flex-1 w-0.5 bg-border mt-2" />
          </div>

          {/* Content - right side */}
          <div className="flex-1 min-w-0">
            {/* Header: Time and Status */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <time className="text-sm font-semibold text-foreground">
                  {formattedTime}
                </time>
                <span className="text-xs text-muted-foreground">
                  {formattedDate}
                </span>
              </div>
              {status && (
                <StatusIndicator status={status} variant="badge" size="sm" />
              )}
            </div>

            {/* Title */}
            {title && (
              <h3 className="text-base font-semibold mb-1">{title}</h3>
            )}

            {/* Photo */}
            {displayPhotoUrl && (
              <div className="relative mb-3 rounded-lg overflow-hidden border-2">
                <img
                  src={displayPhotoUrl}
                  alt={title || t('supervisor.timeline.photoAlt')}
                  className="w-full h-48 object-cover"
                />
                {hasMultiplePhotos && (
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="secondary"
                      className="bg-black/60 text-white backdrop-blur-sm"
                    >
                      <Image className="h-3 w-3 mr-1" />
                      {photoUrls?.length || resolvedPhotoUrls.length}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                {description}
              </p>
            )}

            {/* Metadata */}
            {metadata && Object.keys(metadata).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {Object.entries(metadata).map(([key, value]) => (
                  value && (
                    <Badge key={key} variant="outline" className="text-xs">
                      {key}: {String(value)}
                    </Badge>
                  )
                ))}
              </div>
            )}

            {/* Footer: Contributors and Gallery Link */}
            <div className="flex items-center justify-between">
              {contributors && contributors.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {contributors.slice(0, 3).map((contributor, idx) => (
                      <AvatarResolved
                        key={contributor.id}
                        src={contributor.avatar}
                        alt={contributor.name}
                        fallback={contributor.name.charAt(0).toUpperCase()}
                        className="h-6 w-6 border-2 border-background"
                        fallbackClassName="text-xs"
                      />
                    ))}
                  </div>
                  {contributors.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{contributors.length - 3}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {contributors.length}
                  </span>
                </div>
              )}

              {hasMultiplePhotos && onViewGallery && (
                <button
                  onClick={() => onViewGallery(resolvedPhotoUrls.length > 0 ? resolvedPhotoUrls : photoUrls || [])}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Image className="h-3 w-3" />
                  View Gallery
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
