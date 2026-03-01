import { useParams, useNavigate } from 'react-router-dom';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useProject } from '@/hooks/useProjects';
import { useProjectPhases } from '@/hooks/useProjectPhases';
import { useDailyLogs } from '@/hooks/useDailyLogs';
import { useProjectPhotos } from '@/hooks/useProjectPhotos';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { resolveStorageUrl } from '@/utils/storage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Printer, ArrowLeft } from 'lucide-react';
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Bar } from 'recharts/es6/cartesian/Bar';
import { formatCurrency } from '@/utils/formatters';
import { formatDateSystem } from '@/utils/dateSystemFormatters';
import { useState, useEffect } from 'react';
import { useConfigDropdown } from '@/hooks/useConfigDropdown';

const ClientReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, currency } = useLocalization();
  const { project, isLoading: projectLoading } = useProject(id);
  const { phases, isLoading: phasesLoading } = useProjectPhases(id);
  const { dailyLogs, isLoading: logsLoading } = useDailyLogs(id);
  const { photos, isLoading: photosLoading } = useProjectPhotos(id || "");
  const { values: projectTypeOptions } = useConfigDropdown('project_types');
  const [projectImageUrl, setProjectImageUrl] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  // Helper to get translated project type label
  const getProjectTypeLabel = (typeKey: string | null | undefined) => {
    if (!typeKey) return '';
    const option = projectTypeOptions.find(opt => opt.key === typeKey);
    return option?.label || typeKey;
  };

  const { data: budgetItems } = useQuery({
    queryKey: ['budget_items', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('project_budget_items')
        .select('*')
        .eq('project_id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: financialEntries } = useQuery({
    queryKey: ['financial_entries', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('project_financial_entries')
        .select('*')
        .eq('project_id', id)
        .eq('entry_type', 'expense')
        .order('date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['team_members', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('project_team_members')
        .select('*')
        .eq('project_id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Load project image
  useEffect(() => {
    const loadProjectImage = async () => {
      if (!project?.image_url) {
        setProjectImageUrl(null);
        return;
      }

      // If it's already a full URL, use it directly
      if (project.image_url.startsWith('http')) {
        setProjectImageUrl(project.image_url);
        return;
      }

      // Generate signed URL from storage path using helper
      try {
        const url = await resolveStorageUrl(project.image_url, 60 * 60 * 24);
        setProjectImageUrl(url);
      } catch (err) {
        console.error('Error loading project image:', err);
        setProjectImageUrl(null);
      }
    };

    loadProjectImage();
  }, [project?.image_url]);

  // Load progress photos with signed URLs
  useEffect(() => {
    let isMounted = true;

    const loadProgressPhotos = async () => {
      if (!photos || photos.length === 0) {
        if (isMounted) {
          setPhotoUrls([]);
        }
        return;
      }

      const signedUrls = await Promise.all(
        photos.map(async (photo) => {
          // If it's already a full URL, use it directly
          if (photo.file_path?.startsWith('http')) {
            return photo.file_path;
          }

            // Generate signed URL from storage path using helper
            try {
              const url = await resolveStorageUrl(photo.file_path, 60 * 60 * 24);
              return url;
            } catch (err) {
              console.error('Error loading photo:', err);
            }
          return null;
        })
      );

      if (isMounted) {
        setPhotoUrls(signedUrls.filter((url): url is string => url !== null));
      }
    };

    loadProgressPhotos();

    return () => {
      isMounted = false;
    };
  }, [photos]);

  const handlePrint = () => {
    window.print();
  };

  if (projectLoading || phasesLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">{t('common.notFound')}</div>
        </div>
      </div>
    );
  }

  // Calculate budget breakdown
  const phaseBudgets = phases?.map(phase => ({
    name: phase.phase_name,
    percentage: ((phase.budget_allocated || 0) / (project.budget_total || 1)) * 100,
    budget: phase.budget_allocated || 0,
    progress: phase.progress_percentage || 0,
  })) || [];

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden sticky top-0 z-50 bg-background border-b p-4 flex justify-between items-center">
        <Button variant="outline" onClick={() => navigate(`/portal/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('clientReport.backToPortal')}
        </Button>
        <Button onClick={handlePrint} className="bg-primary">
          <Printer className="h-4 w-4 mr-2" />
          {t('clientReport.print')}
        </Button>
      </div>

      {/* Report Content - Optimized for printing */}
      <div className="report-container max-w-[210mm] mx-auto bg-white p-8 print:p-0">
        
        {/* Cover Page */}
        <section className="min-h-screen flex flex-col justify-center items-center text-center page-break">
          <div className="space-y-8">
            <h1 className="text-6xl font-bold text-primary">{t('clientReport.activityReport')}</h1>
            <div className="space-y-4">
              <h2 className="text-4xl font-semibold text-foreground">{project.name}</h2>
              <p className="text-2xl text-muted-foreground">{project.client_name}</p>
            </div>

            {/* Project Image */}
            {projectImageUrl && (
              <div className="mt-8">
                <div className="rounded-lg overflow-hidden shadow-lg max-w-2xl mx-auto">
                  <img
                    src={projectImageUrl}
                    alt={project.name}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}

            <div className="mt-16">
              <p className="text-3xl font-light text-muted-foreground">{currentYear}</p>
            </div>
          </div>
        </section>

        {/* Project Characteristics */}
        <section className="page-break py-8">
          <h2 className="text-3xl font-bold text-primary mb-6 border-b-2 border-primary pb-2">
            {t('clientReport.projectCharacteristics')}
          </h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('clientReport.description')}</h3>
              <p className="text-muted-foreground">{project.description || t('clientReport.noDescription')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('clientReport.architect')}</h3>
                <p className="text-muted-foreground">{project.manager || '-'}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('clientReport.location')}</h3>
                <p className="text-muted-foreground">{project.location || '-'}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('clientReport.type')}</h3>
              <p className="text-muted-foreground">{getProjectTypeLabel(project.type) || '-'}</p>
            </div>
          </div>
        </section>

        {/* Budget Breakdown */}
        <section className="page-break py-8">
          <h2 className="text-3xl font-bold text-primary mb-6 border-b-2 border-primary pb-2">
            {t('clientReport.budgetBreakdown')}
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-3 text-left font-semibold">{t('clientReport.phase')}</th>
                  <th className="border border-border p-3 text-right font-semibold">{t('clientReport.percentage')}</th>
                  <th className="border border-border p-3 text-right font-semibold">{t('clientReport.budget')}</th>
                </tr>
              </thead>
              <tbody>
                {phaseBudgets.map((item, index) => (
                  <tr key={index} className="hover:bg-muted/50">
                    <td className="border border-border p-3">{item.name}</td>
                    <td className="border border-border p-3 text-right">{item.percentage.toFixed(1)}%</td>
                    <td className="border border-border p-3 text-right">{formatCurrency(item.budget, currency)}</td>
                  </tr>
                ))}
                <tr className="bg-muted font-bold">
                  <td className="border border-border p-3">{t('clientReport.total')}</td>
                  <td className="border border-border p-3 text-right">100%</td>
                  <td className="border border-border p-3 text-right">{formatCurrency(project.budget_total || 0, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Progress Chart */}
        <section className="page-break py-8">
          <h2 className="text-3xl font-bold text-primary mb-6 border-b-2 border-primary pb-2">
            {t('clientReport.progressChart')}
          </h2>
          
          <div className="h-96">
            <ResponsiveContainer width="100%" height={384}>
              <BarChart data={phaseBudgets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: t('clientReport.progressPercentage'), angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                  labelStyle={{ color: 'rgb(var(--foreground))' }}
                />
                <Bar dataKey="progress" fill="rgb(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Labor Payments */}
        {financialEntries && financialEntries.length > 0 && (
          <section className="page-break py-8">
            <h2 className="text-3xl font-bold text-primary mb-6 border-b-2 border-primary pb-2">
              {t('clientReport.laborPayments')}
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-3 text-left font-semibold">{t('clientReport.date')}</th>
                    <th className="border border-border p-3 text-left font-semibold">{t('clientReport.description')}</th>
                    <th className="border border-border p-3 text-right font-semibold">{t('clientReport.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {financialEntries.map((entry, index) => (
                    <tr key={index} className="hover:bg-muted/50">
                      <td className="border border-border p-3">{formatDateSystem(entry.date)}</td>
                      <td className="border border-border p-3">{entry.description || entry.category}</td>
                      <td className="border border-border p-3 text-right">{formatCurrency(entry.amount, currency)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted font-bold">
                    <td className="border border-border p-3" colSpan={2}>{t('clientReport.total')}</td>
                    <td className="border border-border p-3 text-right">
                      {formatCurrency(
                        financialEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0),
                        currency
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Contracted Suppliers */}
        {teamMembers && teamMembers.length > 0 && (
          <section className="page-break py-8">
            <h2 className="text-3xl font-bold text-primary mb-6 border-b-2 border-primary pb-2">
              {t('clientReport.contractedSuppliers')}
            </h2>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-3 text-left font-semibold">{t('clientReport.service')}</th>
                    <th className="border border-border p-3 text-left font-semibold">{t('clientReport.name')}</th>
                    <th className="border border-border p-3 text-left font-semibold">{t('clientReport.phone')}</th>
                    <th className="border border-border p-3 text-left font-semibold">{t('clientReport.email')}</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member, index) => (
                    <tr key={index} className="hover:bg-muted/50">
                      <td className="border border-border p-3">{member.role}</td>
                      <td className="border border-border p-3">{member.user_name}</td>
                      <td className="border border-border p-3">{member.phone || '-'}</td>
                      <td className="border border-border p-3">{member.email || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Photo Gallery */}
        {photoUrls.length > 0 && (
          <section className="page-break py-8">
            <h2 className="text-3xl font-bold text-primary mb-6 border-b-2 border-primary pb-2">
              {t('clientReport.photoReport')}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {photoUrls.map((photoUrl, index) => {
                const photo = photos?.[index];
                return (
                  <div key={index} className="space-y-2">
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                      <img
                        src={photoUrl}
                        alt={photo?.caption || `Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {photo && (
                      <div className="text-sm text-muted-foreground">
                        {photo.uploaded_at && (
                          <p className="font-medium">{formatDateSystem(photo.uploaded_at)}</p>
                        )}
                        {photo.caption && <p>{photo.caption}</p>}
                        {photo.category && <p className="text-xs">{photo.category}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Footer - appears on every page when printing */}
        <div className="print:fixed print:bottom-0 print:left-0 print:right-0 print:p-8 print:text-center print:text-sm print:text-muted-foreground">
          <p>{project.name} - {currentYear}</p>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 2cm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:fixed {
            position: fixed;
          }
          
          .print\\:bottom-0 {
            bottom: 0;
          }
          
          .print\\:left-0 {
            left: 0;
          }
          
          .print\\:right-0 {
            right: 0;
          }
          
          .print\\:p-8 {
            padding: 2rem;
          }
          
          .print\\:text-center {
            text-align: center;
          }
          
          .print\\:text-sm {
            font-size: 0.875rem;
          }
          
          .print\\:text-muted-foreground {
            color: rgb(var(--muted-foreground));
          }
          
          .report-container {
            max-width: 100%;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ClientReport;
