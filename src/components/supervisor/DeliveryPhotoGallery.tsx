import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PhotoGalleryModal } from "./PhotoGalleryModal";
import { resolveStorageUrl } from "@/utils/storage";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalization } from "@/contexts/LocalizationContext";

interface DeliveryPhoto {
  id: string;
  photo_storage_path: string;
  photo_url: string;
  caption?: string | null;
  sort_order?: number | null;
}

interface DeliveryPhotoGalleryProps {
  purchaseOrderId: string;
  deliveryConfirmationId?: string;
  className?: string;
  status?: string; // Add status prop
  onPhotosLoaded?: (count: number) => void;
}

export function DeliveryPhotoGallery({
  purchaseOrderId,
  deliveryConfirmationId,
  className,
  status,
  onPhotosLoaded,
}: DeliveryPhotoGalleryProps) {
  const { t } = useLocalization();
  const hasPotentialPhotos = !status || status === 'fulfilled' || status === 'delivered' || status === 'partially_delivered' || !!deliveryConfirmationId;
  const [photos, setPhotos] = useState<DeliveryPhoto[]>([]);
  const [loading, setLoading] = useState(hasPotentialPhotos);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [resolvedUrls, setResolvedUrls] = useState<string[]>([]);

  const onPhotosLoadedRef = useRef(onPhotosLoaded);
  
  useEffect(() => {
    onPhotosLoadedRef.current = onPhotosLoaded;
  }, [onPhotosLoaded]);

  useEffect(() => {
    if (!hasPotentialPhotos) {
      setLoading(false);
      onPhotosLoadedRef.current?.(0);
      return;
    }

    const fetchPhotos = async () => {
      try {
        setLoading(true);
        
        // First, get delivery confirmation for this PO
        let confirmationId = deliveryConfirmationId;
        if (!confirmationId) {
          const { data: confirmation } = await supabase
            .from('delivery_confirmations')
            .select('id')
            .eq('purchase_order_id', purchaseOrderId)
            .maybeSingle();
          
          if (!confirmation) {
            setPhotos([]);
            setLoading(false);
            onPhotosLoadedRef.current?.(0);
            return;
          }
          confirmationId = confirmation.id;
        }

        // Fetch delivery photos
        const { data, error } = await supabase
          .from('delivery_photos')
          .select('*')
          .eq('delivery_confirmation_id', confirmationId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        const sortedPhotos = (data || []).sort((a, b) => 
          (a.sort_order || 0) - (b.sort_order || 0)
        );
        
        setPhotos(sortedPhotos);
        onPhotosLoadedRef.current?.(sortedPhotos.length);

        // Resolve URLs
        const resolved = await Promise.all(
          sortedPhotos.map(photo => 
            resolveStorageUrl(photo.photo_storage_path, 60 * 60 * 24)
          )
        );
        setResolvedUrls(resolved.filter(Boolean) as string[]);
      } catch (error) {
        console.error('Error fetching delivery photos:', error);
        setPhotos([]);
        onPhotosLoadedRef.current?.(0);
      } finally {
        setLoading(false);
      }
    };

    if (purchaseOrderId) {
      fetchPhotos();
    }
  }, [purchaseOrderId, deliveryConfirmationId, hasPotentialPhotos]);

  if (loading) {
    return null;
  }

  if (photos.length === 0) {
    return null;
  }

  const primaryPhoto = resolvedUrls[0] || photos[0]?.photo_storage_path;

  return (
    <>
      <div className={cn("relative", className)}>
        {primaryPhoto && (
          <button
            onClick={() => setGalleryOpen(true)}
            className="relative w-full rounded-lg overflow-hidden border-2 hover:border-primary transition-colors"
          >
            <img
              src={primaryPhoto}
              alt={t('supervisor.delivery.photoAlt')}
              className="w-full h-48 object-cover"
            />
            {photos.length > 1 && (
              <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-md text-xs font-semibold backdrop-blur-sm flex items-center gap-1">
                <Image className="h-3 w-3" />
                {photos.length}
              </div>
            )}
          </button>
        )}
      </div>

      <PhotoGalleryModal
        photos={resolvedUrls.length > 0 ? resolvedUrls : photos.map(p => p.photo_storage_path)}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        title={t('supervisor.delivery.photosTitle')}
      />
    </>
  );
}
