/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useArchitectClientPortal } from '@/hooks/useArchitectClientPortal';
import { useLocalization } from '@/contexts/LocalizationContext';
import { getProjectScheduleStatus } from '@/types/projectScheduleStatus';
import { useDateFormat } from '@/hooks/useDateFormat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  File,
  Download,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Building2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';

const FILE_TYPE_ICONS = {
  document: FileText,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  archive: FileArchive,
  other: File,
};

export default function ClientPortalViewPage() {
  useRouteTranslations(); // Load translations for this route
  const { t, language } = useLocalization();
  const { formatDate, formatLongDate } = useDateFormat();
  const { token } = useParams<{ token: string }>();
  const { getPortalDataByToken } = useArchitectClientPortal();
  const [portalData, setPortalData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadPortalData = async () => {
      try {
        setIsLoading(true);
        const data = await getPortalDataByToken(token);
        setPortalData(data);
      } catch (err) {
        console.error('Portal load error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load portal');
      } finally {
        setIsLoading(false);
      }
    };

    loadPortalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleDownload = async (doc: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(doc.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(t('architect.clientPortal.downloadError'));
      console.error('Download error:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="text-muted-foreground">{t('architect.clientPortal.loading')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">{t('architect.clientPortal.accessError')}</CardTitle>
            <CardDescription>{error || t('architect.clientPortal.invalidLink')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('architect.clientPortal.linkExpiredMessage')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { project, documents, diaryEntries } = portalData;

  return (
    <div className="min-h-screen bg-muted/30 animate-in fade-in duration-500 pb-20">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary-light p-12 text-white shadow-lg">
        <div className="relative z-10 space-y-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">{t('architect.clientPortal.title')}</h1>
              <p className="text-primary-foreground/80 font-medium">
                {t('architect.clientPortal.welcomeMessage')}
              </p>
            </div>
          </div>
        </div>
        
        {/* Background Decorative Elements */}
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-12 bottom-0 h-32 w-32 rounded-full bg-primary-light/20 blur-2xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Project Overview with Refined Design */}
        <Card className="border-none shadow-xl shadow-primary/5 bg-white/80 backdrop-blur-md rounded-[2rem] overflow-hidden">
          <CardHeader className="p-10 border-b border-border/50">
            <CardTitle className="text-3xl font-extrabold tracking-tight">{project.name}</CardTitle>
            {project.description && (
              <CardDescription className="text-lg leading-relaxed">{project.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="p-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {project.location && (
                <div className="flex items-start gap-5">
                  <div className="p-4 rounded-2xl bg-primary/5 text-primary">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('architect.clientPortal.location')}</div>
                    <div className="font-bold text-lg">{project.location}</div>
                  </div>
                </div>
              )}

              {project.start_date && (
                <div className="flex items-start gap-5">
                  <div className="p-4 rounded-2xl bg-primary/5 text-primary">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('architect.clientPortal.startDate')}</div>
                    <div className="font-bold text-lg">
                      {formatDate(project.start_date)}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-5">
                <div className="p-4 rounded-2xl bg-primary/5 text-primary">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('architect.clientPortal.status')}</div>
                    <Badge variant="secondary" className="mt-1 bg-primary/10 text-primary border-none font-bold px-3 py-1 rounded-full uppercase tracking-wider text-[10px]">
                    {getProjectScheduleStatus(project as any) || t('architect.clientPortal.inProgress')}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents and Updates Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Project Documents */}
          <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm rounded-[2rem]">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                {t('architect.clientPortal.documents')}
              </CardTitle>
              <CardDescription className="text-base">{t('architect.clientPortal.documentsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              {!documents || documents.length === 0 ? (
                <div className="text-center py-16 bg-muted/20 rounded-3xl">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground opacity-10" />
                  <p className="text-muted-foreground mt-4 font-medium">{t('architect.clientPortal.noDocuments')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc: any) => {
                    const IconComponent =
                      FILE_TYPE_ICONS[doc.file_type as keyof typeof FILE_TYPE_ICONS] || File;

                    return (
                      <Card key={doc.id} className="group hover:shadow-xl hover:translate-x-1 transition-all duration-300 border-none bg-white rounded-2xl overflow-hidden">
                        <CardContent className="p-5 flex items-center gap-4">
                          <div className="p-3 rounded-xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                            <IconComponent className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate text-sm">{doc.file_name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>•</span>
                              <span>{formatDate(doc.uploaded_at)}</span>
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(doc)}
                            className="rounded-full hover:bg-primary/10 hover:text-primary"
                          >
                            <Download className="h-5 w-5" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Updates / Site Diary */}
          <Card className="border-none shadow-lg bg-white/50 backdrop-blur-sm rounded-[2rem]">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <Calendar className="h-6 w-6 text-primary" />
                {t('architect.clientPortal.projectUpdates')}
              </CardTitle>
              <CardDescription className="text-base">{t('architect.clientPortal.updatesDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-4">
              {!diaryEntries || diaryEntries.length === 0 ? (
                <div className="text-center py-16 bg-muted/20 rounded-3xl">
                  <Calendar className="h-16 w-16 mx-auto text-muted-foreground opacity-10" />
                  <p className="text-muted-foreground mt-4 font-medium">{t('architect.clientPortal.noDiaryEntries')}</p>
                </div>
              ) : (
                <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-border/60">
                  {diaryEntries.map((entry: any) => (
                    <div key={entry.id} className="relative pl-10 group">
                      <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full bg-white border-2 border-primary/30 z-10 group-hover:border-primary transition-colors flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                      <div className="space-y-3 p-5 rounded-2xl bg-white hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-primary uppercase tracking-wider">
                            {formatLongDate(entry.diary_date)}
                          </span>
                          {entry.weather && (
                            <Badge variant="outline" className="bg-muted/50 border-none text-[10px] uppercase font-bold tracking-widest text-muted-foreground px-2 py-0.5 rounded-md">
                              {entry.weather}
                            </Badge>
                          )}
                        </div>
                        {entry.progress_summary && (
                          <p className="text-base font-bold leading-snug">{entry.progress_summary}</p>
                        )}
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground leading-relaxed italic">"{entry.notes}"</p>
                        )}
                        {entry.photos && entry.photos.length > 0 && (
                          <div className="pt-2">
                             <Badge className="bg-success/10 text-success border-none rounded-lg px-2 py-1 font-bold text-[10px] uppercase tracking-widest">
                                📷 {t('architect.clientPortal.photosCount', { count: entry.photos.length })}
                             </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contact Architect Final Section */}
        <div className="bg-primary-dark text-white rounded-[3rem] p-12 text-center space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="space-y-4 relative z-10">
            <h3 className="text-3xl font-extrabold tracking-tight">{t('architect.clientPortal.contactTitle')}</h3>
            <p className="text-lg text-primary-foreground/70 max-w-xl mx-auto">
              {t('architect.clientPortal.contactArchitect')}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <Button size="lg">
                {t('architect.clientPortal.messageArchitect')}
              </Button>

              <Button size="lg" variant="outline">
                {t('architect.clientPortal.callNow')}
              </Button>

          </div>
        </div>
      </div>
    </div>
  );
}
