import { useState, useEffect } from 'react';
import { ZoomIn, Image, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectPhotos } from '@/hooks/clientPortal/useProjectPhotos';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { ClientPortalPageHeader } from '../Layout/ClientPortalPageHeader';
import { cn } from '@/lib/utils';

export function PhotosLibrary() {
  const { t } = useLocalization();
  const { projectId } = useClientPortalAuth();
  const [selectedPhase, setSelectedPhase] = useState('all');
  const { formatLongDate } = useDateFormat();
  
  const { photos, isLoading: isLoadingPhotos, getPhotoUrl } = useProjectPhotos();
  const [resolvedPhotos, setResolvedPhotos] = useState<any[]>([]);

  // Fetch project name for title display
  const { data: project } = useQuery({
    queryKey: ['clientPortalProject', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      return data;
    },
    enabled: !!projectId,
  });

  // Resolve all photo URLs
  const [isResolvingUrls, setIsResolvingUrls] = useState(false);
  
  useEffect(() => {
    let isCancelled = false;
    
    async function resolveUrls() {
      if (!photos || photos.length === 0) {
        setResolvedPhotos([]);
        return;
      }

      setIsResolvingUrls(true);

      const photoList = await Promise.all(
        photos.map(async (photo) => {
          const url = await getPhotoUrl(photo.file_path);
          return {
            ...photo,
            url: url || null
          };
        })
      );
      
      if (isCancelled) return;
      
      const validPhotos = photoList.filter(photo => photo.url !== null);
      setResolvedPhotos(validPhotos);
      setIsResolvingUrls(false);
    }

    resolveUrls();
    
    return () => {
      isCancelled = true;
    };
  }, [photos, getPhotoUrl]);

  const categories = ['all', ...new Set(photos.map(p => p.category))];

  const filteredPhotos = selectedPhase === 'all'
    ? resolvedPhotos
    : resolvedPhotos.filter(p => p.category === selectedPhase);

  const getCategoryLabel = (cat: string) => {
    if (cat === 'all') return t("clientPortal.photos.tabs.allPhotos");
    return t(`clientPortal.photos.categories.${cat}`, { defaultValue: cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ') });
  };

  const isStillLoading = isLoadingPhotos || isResolvingUrls || (photos.length > 0 && resolvedPhotos.length === 0);
  
  if (isStillLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const projName = project?.name || t("clientPortal.dashboard.loading");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <ClientPortalPageHeader
        title={t("clientPortal.photos.title", { defaultValue: "Project Photos" })}
        subtitle={t("clientPortal.photos.description")}
      />

      <Tabs defaultValue="all" onValueChange={setSelectedPhase} variant="pill" className="w-full">
        <div className="bg-card/50 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm mt-4 mb-6 sticky top-24 z-40">
          <TabsList className="bg-transparent h-14 px-2 w-full justify-start overflow-x-auto overflow-y-hidden scrollbar-hide flex-nowrap scroll-smooth gap-1">
            {categories.map(cat => (
              <TabsTrigger 
                key={cat} 
                value={cat}
                className="rounded-xl text-slate-600 hover:text-primary/80 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md font-bold transition-all h-11 px-4 whitespace-nowrap"
              >
                {getCategoryLabel(cat)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value={selectedPhase} className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map((photo) => (
              <Sheet key={photo.id}>
                <SheetTrigger asChild>
                  <Card className="cursor-pointer hover:opacity-90 transition-opacity overflow-hidden group">
                    <CardContent className="p-0 relative">
                      <AspectRatio ratio={4 / 3}>
                        <img
                          src={photo.url}
                          alt={photo.caption || ''}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=No+Image';
                          }}
                        />
                      </AspectRatio>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="text-white h-8 w-8" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-white text-xs backdrop-blur-sm">
                        <p className="font-medium truncate">{photo.caption || t("clientPortal.photos.untitled")}</p>
                        <p className="opacity-80">{formatLongDate(photo.uploaded_at)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </SheetTrigger>
                <SheetContent side="right" className="max-w-4xl p-0 overflow-hidden bg-black border-none">
                  <div className="relative w-full h-full flex items-center justify-center p-4">
                    <img
                      src={photo.url}
                      alt={photo.caption || ''}
                      className="max-w-full max-h-[85vh] object-contain shadow-2xl"
                    />
                    <div className="absolute bottom-10 left-0 right-0 text-center text-white px-6">
                      <h3 className="text-xl font-bold mb-2">{photo.caption}</h3>
                      <p className="text-sm opacity-70">{formatLongDate(photo.uploaded_at)}</p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            ))}
          </div>
          
          {filteredPhotos.length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
              <Image className="h-12 w-12 mx-auto mb-4 opacity-20" />
              {t("clientPortal.photos.noPhotos")}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
