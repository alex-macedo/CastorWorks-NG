import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TimelineCard } from "./TimelineCard";
import { StatusIndicator } from "./StatusIndicator";
import { PhotoGalleryModal } from "./PhotoGalleryModal";
import { resolveStorageUrl } from "@/utils/storage";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useDateFormat } from "@/hooks/useDateFormat";
import { EmptyState } from "./EmptyState";
import { useLocalization } from "@/contexts/LocalizationContext";

interface ChecklistItem {
  id?: string;
  item: string;
  status: "passed" | "failed" | "conditional" | null;
  notes?: string;
  photos?: Array<{ url: string; caption?: string; preview?: string }>;
  before_photo?: string | null;
  after_photo?: string | null;
}

interface Inspection {
  id: string;
  inspection_date: string;
  overall_status: "passed" | "failed" | "conditional" | null;
  checklist_items: ChecklistItem[];
  photos?: any[] | null;
  phase_id?: string | null;
  project_phases?: {
    phase_name: string;
  } | null;
  created_at: string;
}

interface InspectionTimelineProps {
  projectId: string;
  className?: string;
}

export function InspectionTimeline({ projectId, className }: InspectionTimelineProps) {
  const { t } = useLocalization();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const { formatShortDate } = useDateFormat();

  useEffect(() => {
    const fetchInspections = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('quality_inspections')
          .select(`
            id,
            inspection_date,
            overall_status,
            checklist_items,
            photos,
            phase_id,
            created_at,
            project_phases (
              phase_name
            )
          `)
          .eq('project_id', projectId)
          .order('inspection_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setInspections(data || []);
      } catch (error) {
        console.error('Error fetching inspections:', error);
        setInspections([]);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchInspections();
    }
  }, [projectId]);

  const handleViewGallery = async (photos: any[]) => {
    if (!photos || photos.length === 0) return;
    
    const resolvedUrls = await Promise.all(
      photos.map((photo: any) => {
        const path = typeof photo === 'string' ? photo : photo.url || photo.path;
        return resolveStorageUrl(path, 60 * 60 * 24);
      })
    );
    
    setGalleryPhotos(resolvedUrls.filter(Boolean) as string[]);
    setGalleryOpen(true);
  };

  const getStatusType = (status: string | null): 'passed' | 'failed' | 'conditional' => {
    if (status === 'passed') return 'passed';
    if (status === 'failed') return 'failed';
    return 'conditional';
  };

  const getPassedCount = (items: ChecklistItem[]): number => {
    return items.filter(item => item.status === 'passed').length;
  };

  const getTotalItems = (items: ChecklistItem[]): number => {
    return items.length;
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (inspections.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title={t('supervisor.inspections.noInspectionsYet')}
        description={t('supervisor.inspections.willAppearWhenSubmitted')}
        iconClassName="text-muted-foreground"
      />
    );
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {inspections.map((inspection) => {
          const checklistItems = Array.isArray(inspection.checklist_items) 
            ? inspection.checklist_items 
            : [];
          const passedCount = getPassedCount(checklistItems);
          const totalItems = getTotalItems(checklistItems);
          const primaryPhoto = inspection.photos && inspection.photos.length > 0 
            ? inspection.photos[0] 
            : null;
          
          // Get first photo URL for timeline card
          let primaryPhotoUrl: string | null = null;
          if (primaryPhoto) {
            const path = typeof primaryPhoto === 'string' ? primaryPhoto : primaryPhoto.url || primaryPhoto.path;
            primaryPhotoUrl = path;
          }

          return (
            <Card key={inspection.id} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIndicator 
                      status={getStatusType(inspection.overall_status)} 
                      variant="dot" 
                      size="md" 
                    />
                    <CardTitle className="text-lg">
                      {inspection.project_phases?.phase_name || 'Inspection'}
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {formatShortDate(inspection.inspection_date)}
                  </Badge>
                </div>
                {inspection.overall_status && (
                  <div className="mt-2">
                    <StatusIndicator 
                      status={getStatusType(inspection.overall_status)} 
                      variant="badge" 
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckSquare className="h-4 w-4" />
                  <span>
                    {passedCount} of {totalItems} items passed
                  </span>
                </div>

                {primaryPhotoUrl && (
                  <div className="relative">
                    <button
                      onClick={() => inspection.photos && handleViewGallery(inspection.photos)}
                      className="relative w-full rounded-lg overflow-hidden border-2 hover:border-primary transition-colors"
                    >
                      <img
                        src={primaryPhotoUrl}
                        alt={t('supervisor.inspections.photoAlt')}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          // Try to resolve URL if direct path fails
                          resolveStorageUrl(primaryPhotoUrl!, 60 * 60 * 24).then(url => {
                            if (url && e.currentTarget) {
                              e.currentTarget.src = url;
                            }
                          });
                        }}
                      />
                      {inspection.photos && inspection.photos.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-md text-xs font-semibold backdrop-blur-sm">
                          {inspection.photos.length} photos
                        </div>
                      )}
                    </button>
                  </div>
                )}

                {checklistItems.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-medium text-muted-foreground">Checklist Summary:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {checklistItems.slice(0, 4).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <StatusIndicator 
                            status={item.status === 'passed' ? 'passed' : item.status === 'failed' ? 'failed' : 'conditional'} 
                            variant="dot" 
                            size="sm" 
                          />
                          <span className="truncate">{item.item}</span>
                        </div>
                      ))}
                      {checklistItems.length > 4 && (
                        <div className="text-xs text-muted-foreground">
                          +{checklistItems.length - 4} more items
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PhotoGalleryModal
        photos={galleryPhotos}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        title={t('supervisor.inspections.photosTitle')}
      />
    </div>
  );
}
