import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Users, Calendar as CalendarIcon, TrendingUp, DollarSign, Plus, Package, Camera, FolderOpen, Settings, ListChecks, Monitor, Mail, Phone, Trash2, Video, Brain, Pencil } from "lucide-react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useToast } from "@/hooks/use-toast";
import { useProject } from "@/hooks/useProjects";
import { useProjectAccessCheck } from "@/hooks/useProjectAccessCheck";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { useProjectPhases } from "@/hooks/useProjectPhases";
import { useDailyLogs } from "@/hooks/useDailyLogs";
import { useProjectBudgetItems } from "@/hooks/useProjectBudgetItems";
import { useProjectTeamMembers } from "@/hooks/useProjectTeamMembers";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { useProjectBudgetSummary } from "@/hooks/useProjectBudgetSummary";
import { useProjectExpenseCategories } from "@/hooks/useProjectExpenseCategories";
import { useProjectMonthlyTrends } from "@/hooks/useProjectMonthlyTrends";
import { useProjectAbcAnalysis } from "@/hooks/useProjectAbcAnalysis";
import { useQueryClient } from "@tanstack/react-query";
import { useProjectPhotos } from "@/hooks/useProjectPhotos";
import { PhotoUploadZone } from "@/components/Photos/PhotoUploadZone";
import { PhotoGallery } from "@/components/Photos/PhotoGallery";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useClientPortalAuth } from "@/hooks/clientPortal/useClientPortalAuth";
import { useDateFormat } from "@/hooks/useDateFormat";
import { resolveStorageUrl } from "@/utils/storage";
import { getProjectScheduleStatus } from "@/types/projectScheduleStatus";
import { ProjectScheduleStatusBadge } from "@/components/Projects/ProjectScheduleStatusBadge";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { TasksKanban } from "@/components/Architect/Tasks/TasksKanban";
import { TaskStatusManager } from "@/components/TaskManagement/TaskStatusManager";
import { DisplaySettings } from "@/components/TaskManagement/DisplaySettings";
import { Container } from "@/components/Layout";
import { AddTeamMemberDialog } from "@/components/Projects/AddTeamMemberDialog";
import { AvatarResolved } from "@/components/ui/AvatarResolved";
import { useProjectPhaseCostSummary } from "@/hooks/useProjectCostControl";
import { ProjectCalendarWidget } from "@/components/ProjectCalendar/ProjectCalendarWidget";
import { AbcCurveChart } from "@/components/Dashboard/AbcCurveChart";
import { MonthlyTrendChart } from "@/components/Dashboard/MonthlyTrendChart";
import { ExpenseByCategoryChart } from "@/components/Dashboard/ExpenseByCategoryChart";
import { BudgetStatusChart } from "@/components/Dashboard/BudgetStatusChart";
import { TemplateApplicationDialog } from "@/components/Financial/Templates/TemplateApplicationDialog";
import { DailyLogForm } from "@/components/DailyLogs/DailyLogForm";
import { BudgetOverview } from "@/components/Financial/BudgetOverview";
import { BudgetTabContent } from "@/components/Projects/BudgetTabContent";
import { TaxManagementTab } from "@/components/Projects/TaxManagementTab";
import { RecurringExpenseManager } from "@/components/Financial/RecurringExpenseManager";
import { FinancialAdvisorPanel } from "@/components/Architect/Financial/FinancialAdvisorPanel";
import { formatCurrency, formatNumber } from "@/utils/formatters";
import { formatDate } from "@/utils/reportFormatters";
import styles from '@/styles/dashboard.module.css';
import { ClientPortalPageHeader } from "@/components/ClientPortal/Layout/ClientPortalPageHeader";
import { ProjectSelectionModal } from "@/components/ClientPortal/Dialogs/ProjectSelectionModal";
import { LogisticsTabContent } from "@/components/Projects/Logistics/LogisticsTabContent";

const ProjectDetail = () => {
  const { id, projectId } = useParams();
  const effectiveId = id || projectId;
  const location = useLocation();
  const isPortal = location.pathname.startsWith('/portal');
  const navigate = useNavigate();
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState(false);

  const { t, currency, dateFormat } = useLocalization();
  const { toast } = useToast();
  const [dailyLogOpen, setDailyLogOpen] = useState(false);
  const [addTeamMemberOpen, setAddTeamMemberOpen] = useState(false);
  const [applyTemplateOpen, setApplyTemplateOpen] = useState(false);
  const [projectImageUrl, setProjectImageUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isMobile, setIsMobile] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [accordionState, setAccordionState] = useState<'expanded' | 'collapsed'>('collapsed');
  const fallbackImage = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80&auto=format&fit=crop";

  const { userName } = useClientPortalAuth();
  const { formatLongDate } = useDateFormat();
  const queryClient = useQueryClient();

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { period: 'morning', emoji: '☀️', message: t('clientPortal.dashboard.greetings.morning') };
    } else if (hour >= 12 && hour < 18) {
      return { period: 'afternoon', emoji: '☀️', message: t('clientPortal.dashboard.greetings.afternoon') };
    } else if (hour >= 18 && hour < 22) {
      return { period: 'evening', emoji: '🐝', message: t('clientPortal.dashboard.greetings.evening') };
    } else {
      return { period: 'night', emoji: '🌙', message: t('clientPortal.dashboard.greetings.night') };
    }
  };

  const greeting = getTimeBasedGreeting();
  const today = new Date();

  const projectHook = useProject(effectiveId);
  const project = projectHook.project;
  const isLoading = projectHook.isLoading;

  // Check project access for non-portal views
  const { hasAccess, isLoading: accessLoading } = useProjectAccessCheck(
    isPortal ? undefined : effectiveId,
    '/projects'
  );

  const { data: roles } = useUserRoles();
  const { data: currentUser } = useCurrentUserProfile();
  const isAdmin = roles?.some(r => r.role === 'admin');
  const isProjectManager = roles?.some(r => r.role === 'project_manager');
  const canEditProject = (p: any) => {
    if (isAdmin) return true;
    if (isProjectManager && currentUser?.display_name === p?.manager) return true;
    return false;
  };

  const phasesHook = useProjectPhases(effectiveId);
  const phases = phasesHook.phases;

  const dailyLogsHook = useDailyLogs(effectiveId);
  const dailyLogs = dailyLogsHook.dailyLogs;
  const createDailyLog = dailyLogsHook.createDailyLog;

  const budgetItemsHook = useProjectBudgetItems(effectiveId);
  const budgetItems = budgetItemsHook.budgetItems;

  const teamMembersHook = useProjectTeamMembers(effectiveId);
  const teamMembers = teamMembersHook.teamMembers;

  const purchaseRequestsHook = usePurchaseRequests(effectiveId);
  const purchaseRequests = purchaseRequestsHook.purchaseRequests;

  const financialEntriesHook = useFinancialEntries(effectiveId);
  const financialEntries = financialEntriesHook.financialEntries;

  const budgetSummary = useProjectBudgetSummary(effectiveId, project?.budget_model);
  const expenseCategories = useProjectExpenseCategories(effectiveId);
  const monthlyTrends = useProjectMonthlyTrends(effectiveId);
  const abcAnalysis = useProjectAbcAnalysis(effectiveId);
  
  const phaseCostSummaryHook = useProjectPhaseCostSummary(effectiveId);
  const phaseCostSummary = phaseCostSummaryHook.data;

  const photosHook = useProjectPhotos(effectiveId!);
  const photos = photosHook.photos;

  useEffect(() => {
    if (project?.image_url) {
      resolveStorageUrl(project.image_url).then(setProjectImageUrl);
    }
  }, [project]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);


  const handleDailyLogSubmit = async (data: any) => {
    try {
      await createDailyLog.mutateAsync(data);
      setDailyLogOpen(false);
      toast({ title: t('common.success') });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteAllPhotos = async () => {
    if (!photos || photos.length === 0 || !effectiveId) {
      setShowDeleteAllDialog(false);
      return;
    }

    try {
      // Get all file paths
      const filePaths = photos
        .map((photo: any) => photo.file_path)
        .filter((path: string) => path && !path.includes('example.com') && !path.includes('placeholder'));

      // Delete from storage (if there are valid paths)
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('project-images')
          .remove(filePaths);

        if (storageError) {
          console.error('Storage delete error:', storageError);
          // Continue anyway to clean up database records
        }
      }

      // Delete all photo records from database
      const { error: dbError } = await supabase
        .from('project_photos')
        .delete()
        .eq('project_id', effectiveId);

      if (dbError) {
        throw dbError;
      }

      // Refresh the photos list
      queryClient.invalidateQueries({ queryKey: ["project-photos", effectiveId] });
      
      toast({
        title: t('common.success'),
        description: t('projectDetail.allPhotosDeleted') || 'All photos have been deleted successfully.',
      });
    } catch (error) {
      console.error('Delete all photos error:', error);
      toast({
        title: t('common.error'),
        description: t('projectDetail.deleteAllPhotosError') || 'Failed to delete photos. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setShowDeleteAllDialog(false);
    }
  };

  const getProjectTypeLabel = (type: string | null) => {
    if (!type) return '-';
    const map: Record<string, string> = {
      'Project Owned': t('projects:projectOwned'),
      'Project Customer': t('projects:projectCustomer'),
    };
    return map[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">{t('common.noData')}</p>
        <Button variant="glass-style-white" onClick={() => navigate(isPortal ? '/portal' : '/projects')}>
          {isPortal ? t('clientPortal.backToPortal') : t('projectDetail.backToProjects')}
        </Button>
        {isPortal && (
          <ProjectSelectionModal
            isOpen={true}
            onClose={() => navigate('/portal')}
          />
        )}
      </div>
    );
  }

  const scheduleStatus = getProjectScheduleStatus(project as any)

  const unitSymbol = 'm²'; 
  const unitLabel = t('projects:constructionUnitSquareMeter') || 'Square Meters';
  const clientDisplayName = project.client_name || (project as any).clients?.name || '-';

  const totalAreaValue = project.total_area != null ? Number(project.total_area) : null;

  return (
    <Container size="full" className="px-0 sm:px-0 lg:px-0 overflow-x-hidden">
      <div className="space-y-6 px-1 sm:px-2">
        <div className="space-y-6">
          {isPortal ? (
            <ClientPortalPageHeader
              title={t("clientPortal.dashboard.title", { projectName: project.name, name: project.name })}
              subtitle={
                (userName 
                  ? t('clientPortal.dashboard.greeting', { name: userName }) 
                  : t('clientPortal.dashboard.welcomeDefault')
                ) + " " + greeting.message + " " + greeting.emoji
              }
              actions={
                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center text-muted-foreground bg-primary-dark/20 text-white border-primary-light/30 backdrop-blur-sm px-4 py-1.5 rounded-full border shadow-sm">
                      <CalendarIcon className="mr-2 h-4 w-4 text-primary-light" />
                      <span className="text-sm font-bold tracking-tight">{formatLongDate(today)}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-primary-dark/20 text-white border-primary-light/30 hover:bg-primary-dark/40 backdrop-blur-sm h-10 px-6 rounded-full font-bold shadow-sm transition-all"
                    onClick={() => setIsProjectSwitcherOpen(true)}
                  >
                    <Users className="mr-2 h-4 w-4 text-primary-light" />
                    {t('clientPortal.portal.switchProject') || 'Switch Project'}
                  </Button>
                </div>
              }
            />
          ) : (
            <SidebarHeaderShell variant="auto">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl sm:text-3xl font-bold">{project.name}</h1>
                    <ProjectScheduleStatusBadge status={scheduleStatus} />
                  </div>
                  <p className="text-sm text-sidebar-primary-foreground/80">
                    {clientDisplayName !== '-' && `${clientDisplayName} · `}
                    {getProjectTypeLabel(project.type)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="glass-style-white" size="sm" onClick={() => navigate('/projects')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t('projectDetail.backToProjects')}
                  </Button>
                  {canEditProject(project) && (
                    <Button variant="glass-style-white" size="sm" onClick={() => navigate('/projects', { state: { editProjectId: effectiveId } })}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t('projects:editProject')}
                    </Button>
                  )}
                  <Button variant="glass-style-white" size="sm" onClick={() => navigate(`/portal/${effectiveId}`)}>
                    <Users className="mr-2 h-4 w-4" />
                    {t('projectDetail.clientPortal')}
                  </Button>
                </div>
              </div>
            </SidebarHeaderShell>
          )}

          <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-border/70 shadow-md">
            <img
              src={projectImageUrl || fallbackImage}
              alt={project.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = fallbackImage; }}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} variant="pill" className="w-full">
          <div className={cn(
            "sticky top-0 z-40 py-2 transition-all duration-300",
            isPortal && "mt-4 mb-6"
          )}>
            <TabsList className={cn(
              "w-full flex-nowrap h-auto gap-0.5 justify-start items-center p-1 overflow-x-auto scrollbar-hide"
            )}>
              {[
                { value: "overview", label: t('projectDetail.overview') },
                { value: "budgets", label: t('projectDetail.budgets') },
                { value: "budget-expenses", label: t('projectDetail.budgetExpenses') },
                {
                  value: "schedule",
                  label: t('projectDetail.schedule'),
                  onClick: () => navigate(isPortal ? `/portal/${effectiveId}/schedule` : `/project-phases?projectId=${effectiveId}`)
                },
                ...(!isPortal ? [{ value: "calendar", label: t('projectDetail.calendar') }] : []),
                { value: "tasks", label: t('projectDetail.tasks') },
                ...(isPortal ? [{
                  value: "definitions",
                  label: t('clientPortal.definitions.title'),
                  onClick: () => navigate(`/portal/${effectiveId}/definitions`)
                }] : []),
                { value: "forms", label: t('projectDetail.forms') },
                 { value: "daily-logs", label: t('projectDetail.dailyLogs') },
                 { value: "purchases", label: t('projectDetail.purchases') },
                 { value: "logistics", label: t('logistics:title') },
                 { value: "team", label: t('projectDetail.team') },

                { value: "photos", label: t('projectDetail.photos.tab') },
                ...(!isPortal ? [{ value: "tax", label: "Fiscal/INSS" }] : []),
                { 
                  value: "documents", 
                  label: t('projectDetail.documents'),
                  onClick: () => navigate(isPortal ? `/portal/${effectiveId}/documents` : `/projects/${effectiveId}/documents`)
                },
                { value: "financial-ai", label: t('projectDetail.financialAI'), icon: Brain },
                { value: "settings", label: t('projectDetail.settings') }
              ].map((tab) => (
                <TabsTrigger 
                  key={tab.value}
                  value={tab.value} 
                  className="whitespace-nowrap px-2 py-1.5 text-[11px] sm:text-xs transition-all duration-200"
                  onClick={tab.onClick}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="w-full">
            <TabsContent value="overview" className="space-y-6 mt-6 animate-fade-in scroll-mt-20">
              <div className={styles.grid}>
                <div className={styles['col-span-4']}>
                  <Card className="h-full">
                    <CardHeader><CardTitle>{t('projectDetail.projectInformation')}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('projects:client')}</span><span className="font-medium">{clientDisplayName}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('projects:type.label')}</span><span className="font-medium">{getProjectTypeLabel((project as any).type)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('projects:location')}</span><span className="font-medium">{(project as any).location || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('projects:startDate')}</span><span className="font-medium">{(project as any).start_date ? formatDate((project as any).start_date, dateFormat) : '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('projects:endDate')}</span><span className="font-medium">{(project as any).end_date ? formatDate((project as any).end_date, dateFormat) : '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('projects:manager')}</span><span className="font-medium">{(project as any).manager || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('projects:totalArea')}</span><span className="font-medium">{totalAreaValue ? `${formatNumber(totalAreaValue)} ${unitSymbol}` : '-'}</span></div>
                    </CardContent>
                  </Card>
                </div>
                {budgetSummary && (
                  <div className={styles['col-span-4']}>
                    <BudgetStatusChart spent={budgetSummary.spent + budgetSummary.committed} remaining={budgetSummary.remaining} percentage={budgetSummary.percentage} className="h-full" />
                  </div>
                )}
                {expenseCategories && (
                  <div className={styles['col-span-4']}>
                    <ExpenseByCategoryChart data={expenseCategories} className="h-full" />
                  </div>
                )}
                {monthlyTrends && (
                  <div className={styles['col-span-6']}>
                    <MonthlyTrendChart data={monthlyTrends} />
                  </div>
                )}
                {abcAnalysis && (
                  <div className={styles['col-span-6']}>
                    <AbcCurveChart data={abcAnalysis} />
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="budgets" className="mt-6 animate-fade-in scroll-mt-20 w-full">
              {effectiveId && project && <BudgetTabContent projectId={effectiveId} project={project} />}
            </TabsContent>

            <TabsContent value="budget-expenses" className="animate-fade-in scroll-mt-20">
              <div className="space-y-4 mt-4">
                <BudgetOverview projectId={effectiveId!} />
                <RecurringExpenseManager projectId={effectiveId!} />
              </div>
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6 mt-6 animate-fade-in scroll-mt-20">
              <ProjectCalendarWidget
                projectId={effectiveId!}
                onNavigateToFullCalendar={() => navigate(`/projects/${effectiveId}/calendar`)}
              />
            </TabsContent>

            <TabsContent value="tasks" className="space-y-6 mt-6 animate-fade-in scroll-mt-20">
              <TasksKanban projectId={effectiveId!} />
            </TabsContent>

            <TabsContent value="forms" className="space-y-6 mt-6 animate-fade-in scroll-mt-20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{t('projectDetail.forms')}</h2>
                <Button variant="glass-style-white" onClick={() => navigate('/forms/new')}><Plus className="mr-2 h-4 w-4" />{t('forms:createForm')}</Button>
              </div>
              <Card className="p-6">
                <p className="text-muted-foreground text-center py-8">
                  {t('projectDetail.formsComingSoon')}
                </p>
              </Card>
            </TabsContent>

            <TabsContent value="daily-logs" className="space-y-6 mt-6 animate-fade-in scroll-mt-20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">{t('projectDetail.recentDailyLogs')}</h2>
                <Button variant="glass-style-white" onClick={() => setDailyLogOpen(true)}><FileText className="mr-2 h-4 w-4" />{t('projectDetail.dailyLog')}</Button>
              </div>
              <div className="space-y-4">
                {dailyLogs?.map((log) => (
                  <Card key={log.id} className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold">{formatDate(log.log_date, dateFormat)}</p>
                        <p className="text-sm text-muted-foreground">{log.tasks_completed}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

             <TabsContent value="purchases" className="space-y-6 mt-6 animate-fade-in scroll-mt-20">
               <Card>
                 <CardHeader><CardTitle>{t('procurement.purchaseRequests')}</CardTitle></CardHeader>
                 <CardContent>
                   {purchaseRequests?.map((request: any) => (
                     <div key={request.id} className="p-4 border-b last:border-0">
                       <p className="font-bold">{request.requested_by}</p>
                       <p className="text-sm text-muted-foreground">{t(`procurement.statusLabels.${request.status}`)}</p>
                     </div>
                   ))}
                 </CardContent>
               </Card>
             </TabsContent>

             <TabsContent value="logistics" className="animate-fade-in scroll-mt-20">
               {effectiveId && <LogisticsTabContent projectId={effectiveId} />}
             </TabsContent>


              <TabsContent value="team" className="space-y-6 mt-6 animate-fade-in scroll-mt-20">
                {!isPortal && (
                  <div className="flex justify-end">
                    <Button variant="glass-style-white" onClick={() => setAddTeamMemberOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('projects:addTeamMember') || "Add Team Member"}
                    </Button>
                  </div>
                )}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {teamMembers?.map((member) => (
                    <Card key={member.id} className="p-6 text-center">
                      <AvatarResolved
                        src={member.avatar_url}
                        alt={member.user_name || 'Team Member'}
                        fallback={member.user_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'TM'}
                        className="h-16 w-16 mx-auto mb-4"
                        fallbackClassName="font-bold text-lg"
                      />
                      <p className="font-bold">{member.user_name}</p>
                      <p className="text-sm text-primary">{member.role}</p>
                    </Card>
                  ))}
                </div>
              </TabsContent>

            <TabsContent value="photos" className="space-y-6 mt-6 animate-fade-in scroll-mt-20">
              <PhotoUploadZone projectId={effectiveId!} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ["project-photos", effectiveId] })} />
              {photos && <PhotoGallery photos={photos} projectId={effectiveId!} canEdit={true} onPhotoDeleted={() => queryClient.invalidateQueries({ queryKey: ["project-photos", effectiveId] })} />}
              
              {/* Danger Zone */}
              {!isPortal && photos && photos.length > 0 && (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <Trash2 className="h-5 w-5" />
                      {t('projectDetail.dangerZone') || 'Danger Zone'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{t('projectDetail.deleteAllPhotosTitle') || 'Delete All Photos'}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('projectDetail.deleteAllPhotosDescription') || 'Permanently delete all photos from this project. This action cannot be undone.'}
                        </p>
                      </div>
                      <Button 
                        variant="destructive" 
                        onClick={() => setShowDeleteAllDialog(true)}
                        className="shrink-0"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('projectDetail.deleteAllPhotosButton') || 'Delete All Photos'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

              <TabsContent value="settings" className="space-y-6 mt-6 animate-fade-in scroll-mt-20">
                {!isPortal && (
                  <ProjectCalendarWidget
                    projectId={effectiveId!}
                    onNavigateToFullCalendar={() => navigate(`/projects/${effectiveId}/calendar`)}
                  />
                )}
                <TaskStatusManager projectId={effectiveId!} />
                <DisplaySettings projectId={effectiveId!} />
              </TabsContent>

            {!isPortal && (
              <TabsContent value="tax" className="space-y-6 mt-6 animate-fade-in scroll-mt-20">
                <TaxManagementTab projectId={effectiveId!} />
              </TabsContent>
            )}

            <TabsContent value="financial-ai" className="space-y-6 mt-6 animate-fade-in scroll-mt-20">
              <FinancialAdvisorPanel projectId={effectiveId!} context={isPortal ? 'clientPortal' : 'architect'} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <Sheet open={dailyLogOpen} onOpenChange={setDailyLogOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl">{t('projectDetail.dailyLogForm.title')}</SheetTitle>
          </SheetHeader>
          <DailyLogForm
            projectId={effectiveId!}
            onSubmit={handleDailyLogSubmit}
            isLoading={createDailyLog.isPending}
          />
        </SheetContent>
      </Sheet>

      <AddTeamMemberDialog
        projectId={effectiveId!}
        open={addTeamMemberOpen}
        onOpenChange={setAddTeamMemberOpen}
      />

      <TemplateApplicationDialog
        open={applyTemplateOpen}
        onOpenChange={setApplyTemplateOpen}
        projectId={effectiveId!}
        companyId={(project as any).company_id ?? ""}
        onApplied={() => {
          queryClient.invalidateQueries({ queryKey: ["project-budget-items", effectiveId] });
          toast({
            title: t('common.success'),
            description: t('templates.appliedSuccessfully'),
          });
        }}
        hasExistingItems={budgetItems && budgetItems.length > 0}
      />

      <ConfirmDialog
        open={showDeleteAllDialog}
        onOpenChange={setShowDeleteAllDialog}
        title={t('projectDetail.deleteAllPhotosConfirmTitle') || 'Delete all photos?'}
        description={t('projectDetail.deleteAllPhotosConfirmDescription') || 'This action cannot be undone and will permanently delete all photos for this project.'}
        onConfirm={handleDeleteAllPhotos}
        confirmText={t('common.delete')}
        variant="danger"
      />
      
      <ProjectSelectionModal 
        isOpen={isProjectSwitcherOpen} 
        onClose={() => setIsProjectSwitcherOpen(false)} 
      />
    </Container>
  );
};

export default ProjectDetail;
