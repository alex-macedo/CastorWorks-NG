import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TimelineCard } from "./TimelineCard";
import { PhotoGalleryModal } from "./PhotoGalleryModal";
import { StatusIndicator, StatusType } from "./StatusIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { resolveStorageUrl } from "@/utils/storage";
import { format, parseISO } from "date-fns";
import { useLocalization } from "@/contexts/LocalizationContext";

interface ActivityLog {
  id: string;
  activity_date: string;
  weather_conditions?: string | null;
  crew_count?: number | null;
  notes?: string | null;
  photos?: any;
  created_at: string;
  supervisor_id: string;
  status?: 'on_track' | 'delayed' | null;
  user_profiles?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

interface DailyLogTimelineProps {
  projectId: string;
  selectedDate?: string;
  className?: string;
}

export function DailyLogTimeline({ projectId, selectedDate, className }: DailyLogTimelineProps) {
  const { t } = useLocalization();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [galleryTitle, setGalleryTitle] = useState('');

  const fetchLogs = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('site_activity_logs')
        .select(`
          id,
          activity_date,
          weather_conditions,
          crew_count,
          notes,
          photos,
          created_at,
          supervisor_id,
          status
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      // Filter by date if provided
      if (selectedDate) {
        query = query.eq('activity_date', selectedDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch user profiles separately
      const logsWithProfiles = await Promise.all(
        (data || []).map(async (log) => {
          if (log.supervisor_id) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('full_name, avatar_url')
              .eq('user_id', log.supervisor_id)
              .single();
            
            return {
              ...log,
              user_profiles: profile || null,
            };
          }
          return { ...log, user_profiles: null };
        })
      );
      
      setLogs(logsWithProfiles);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleViewGallery = (photoUrls: string[], title: string) => {
    setGalleryPhotos(photoUrls);
    setGalleryTitle(title);
    setGalleryOpen(true);
  };

  const parsePhotos = (photos: any): string[] => {
    if (!photos) return [];
    if (Array.isArray(photos)) {
      return photos.map((p: any) => typeof p === 'string' ? p : p.url || p.path || '').filter(Boolean);
    }
    if (typeof photos === 'string') {
      try {
        const parsed = JSON.parse(photos);
        return Array.isArray(parsed) ? parsed.map((p: any) => typeof p === 'string' ? p : p.url || p.path || '').filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const getStatus = (log: ActivityLog): StatusType => {
    if (log.status) {
      return log.status as StatusType;
    }
    // Default to on_track if no status set
    return 'on_track';
  };

  const getWeatherEmoji = (weather?: string | null) => {
    const weatherMap: Record<string, string> = {
      sunny: '☀️',
      cloudy: '☁️',
      rainy: '🌧️',
      stormy: '⛈️',
    };
    return weatherMap[weather || ''] || '';
  };

  if (loading) {
    return (
      <div className={className}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <Skeleton key={idx} className="h-64 w-full mb-4 rounded-lg" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">
            {selectedDate 
              ? t('supervisor.noLogsForDate', { date: format(parseISO(selectedDate), 'MMM d, yyyy') })
              : t('supervisor.noLogsYet', 'No activity logs yet')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className={className}>
        {logs.map((log, index) => {
          const photoUrls = parsePhotos(log.photos);
          const primaryPhoto = photoUrls.length > 0 ? photoUrls[0] : null;
          const hasMultiplePhotos = photoUrls.length > 1;

          const metadata: Record<string, any> = {};
          if (log.weather_conditions) {
            metadata[t('supervisor.weatherConditions')] = `${getWeatherEmoji(log.weather_conditions)} ${t(`supervisor.${log.weather_conditions}`)}`;
          }
          if (log.crew_count !== null && log.crew_count !== undefined) {
            metadata[t('supervisor.crewCount')] = log.crew_count;
          }

          const contributors = log.user_profiles ? [
            {
              id: log.supervisor_id,
              name: log.user_profiles.full_name || 'Unknown',
              avatar: log.user_profiles.avatar_url || undefined,
            }
          ] : [];

          return (
            <div key={log.id} className={index < logs.length - 1 ? 'mb-4' : ''}>
              <TimelineCard
                id={log.id}
                timestamp={log.created_at}
                title={format(parseISO(log.activity_date), 'EEEE, MMMM d')}
                description={log.notes || undefined}
                photoUrl={primaryPhoto}
                photoUrls={hasMultiplePhotos ? photoUrls : undefined}
                status={getStatus(log)}
                metadata={metadata}
                contributors={contributors}
                onViewGallery={hasMultiplePhotos ? (urls) => handleViewGallery(urls, format(parseISO(log.activity_date), 'MMM d, yyyy')) : undefined}
              />
            </div>
          );
        })}
      </div>

      <PhotoGalleryModal
        photos={galleryPhotos}
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        title={galleryTitle}
      />
    </>
  );
}
