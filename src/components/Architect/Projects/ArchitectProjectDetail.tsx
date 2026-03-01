import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useProject } from '@/hooks/useProjects';
import { useProjectTeamMembers } from '@/hooks/useProjectTeamMembers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BriefingForm } from '../Briefing/BriefingForm';
import { TasksKanban } from '../Tasks/TasksKanban';
import { MeetingsList } from '../Meetings/MeetingsList';
import { MeetingFormDialog } from '../Meetings/MeetingFormDialog';
import { FilesList } from '../Files/FilesList';
import { SiteDiaryList } from '../SiteDiary/SiteDiaryList';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, User, Building2, MapPin, ArrowLeft, MoreVertical, Share2, Edit3, Briefcase, ExternalLink, Trash2, Archive, LayoutDashboard, UserPlus } from 'lucide-react';
import { WhatsAppQuickAction } from '../Communication/WhatsAppQuickAction';
import { formatDate } from '@/utils/reportFormatters';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArchitectTaskSettingsPanel } from '@/components/Architect/Tasks/ArchitectTaskSettingsPanel';
import { GrantAccessDialog } from './GrantAccessDialog';
import { useProjectAccessCheck } from '@/hooks/useProjectAccessCheck';
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell';
import { useUserRoles } from '@/hooks/useUserRoles';
import { getScheduleStatusTranslationKey } from '@/utils/badgeVariants';
import { getProjectScheduleStatus } from '@/types/projectScheduleStatus';

export const ArchitectProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, dateFormat } = useLocalization();
  const { data: roles } = useUserRoles();
  const { project: projectRaw, isLoading } = useProject(id);
  const { teamMembers = [] } = useProjectTeamMembers(id);
  const project = projectRaw as any;
  const [isMeetingFormOpen, setIsMeetingFormOpen] = useState(false);
  const [isTaskSettingsOpen, setIsTaskSettingsOpen] = useState(false);
  const [isGrantAccessOpen, setIsGrantAccessOpen] = useState(false);

  // Check project access - redirects if no access
  const { hasAccess, isLoading: accessLoading } = useProjectAccessCheck(id, '/architect/projects');

  if (isLoading || accessLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  if (!project || !hasAccess) {
    return (
      <div className="p-6">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="py-12 text-center text-destructive/80">
            {!hasAccess ? t('common.accessDenied') || 'Access Denied' : t('common.noResults')}
          </CardContent>
        </Card>
      </div>
    );
  }
  const scheduleStatus = getProjectScheduleStatus(project)

  const handleScheduleReview = () => {
    setIsMeetingFormOpen(true);
  };

  const handleProjectPortal = () => {
    navigate(`/portal/${id}`);
    toast.info(t('architect.projects.navigatingToPortal'));
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success(t('common.linkCopied'));
  };

  const handleEdit = () => {
    navigate(`/projects/${id}/edit`);
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      {/* Premium Project Header - Architect variant */}
      <SidebarHeaderShell variant={roles?.some(r => r.role === 'architect') ? 'architect' : 'default'}>
        <div className="flex flex-col gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Link to="/architect">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 rounded-full h-9 w-9"
                  aria-label={t('navigation.dashboard')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold tracking-tight">
                {project.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-white/90 font-medium">
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-emerald-300" />
                <span className="text-sm">{project.client_name || '-'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-emerald-300" />
                <span className="text-sm">{project.location || t('architect.projects.noLocationSet')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-emerald-300" />
                <span className="text-sm">{t('architect.projects.started')} {project.start_date ? formatDate(project.start_date, dateFormat) : '-'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/10 text-right">
              <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-300 mb-1">
                {t('architect.projects.status')}
              </p>
              <div className="flex items-center gap-2 justify-end flex-row-reverse">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="font-bold text-lg capitalize">{t(getScheduleStatusTranslationKey(scheduleStatus))}</span>
              </div>
            </div>
            <div className="bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/10 text-right">
              <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-300 mb-1">
                {t('common.budget')}
              </p>
              <span className="font-bold text-lg">
                {project.budget_total ? `$${Number(project.budget_total).toLocaleString()}` : '-'}
              </span>
            </div>
            <div className="bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/10 text-right">
              <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-300 mb-1">
                {t('architect.projects.timeline')}
              </p>
              <span className="font-bold text-lg">
                {t('architect.projects.percentComplete', { percent: 75 })}
              </span>
            </div>
            <div className="bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/10 text-right">
              <p className="text-[10px] uppercase font-bold tracking-widest text-emerald-300 mb-1">
                {t('architect.projects.activeMembers')}
              </p>
              <span className="font-bold text-lg">
                {t('architect.projects.activeMembersCount', { count: teamMembers.length })}
              </span>
            </div>
          </div>
        </div>
      </SidebarHeaderShell>

      <Tabs defaultValue="overview" variant="pill" className="space-y-8">
        <TabsList className="flex flex-nowrap h-auto gap-0.5 w-full justify-start sticky top-24 z-40 p-1 bg-muted/40 backdrop-blur-md border border-border/50 rounded-xl overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm">
            {t('architect.projects.tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="briefing" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm">
            {t('architect.projects.tabs.briefing')}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm">
            {t('architect.projects.tabs.tasks')}
          </TabsTrigger>
          <TabsTrigger value="meetings" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm">
            {t('architect.projects.tabs.meetings')}
          </TabsTrigger>
          <TabsTrigger value="diary" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm">
            {t('architect.siteDiary.title')}
          </TabsTrigger>
          <TabsTrigger value="files" className="whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm">
            {t('architect.projects.tabs.files')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
               <Card className="border-none shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
                <CardHeader className="bg-muted/30 border-b border-border/50">
                  <CardTitle className="text-xl font-bold flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      {t('architect.projects.tabs.overview')}
                    </div>
                    {/* Inline primary actions: Share + Edit */}
                    <div className="hidden md:flex items-center gap-2">
                      <Button 
                        variant="glass-style-white" 
                        size="sm" 
                        onClick={handleShare}
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        {t('architect.projects.share')}
                      </Button>
                      <WhatsAppQuickAction
                        phoneNumber={(project as any).clients?.[0]?.phone || ''}
                        projectName={project.name}
                        projectId={project.id}
                        variant="button"
                        size="sm"
                      />
                      <Button 
                        variant="glass-style-white" 
                        size="sm" 
                        onClick={handleEdit}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        {t('architect.projects.edit')}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted/80 rounded-full h-9 w-9">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => setIsGrantAccessOpen(true)}>
                             <UserPlus className="h-4 w-4 mr-2" />
                             {t('architect.projects.grantAccess')}
                           </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => toast.info(t('architect.projects.archiveProjectComingSoon'))}>
                            <Archive className="h-4 w-4 mr-2" />
                            {t('architect.projects.archiveProject')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.error(t('architect.projects.deleteProjectComingSoon'))} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('architect.projects.deleteProject')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Compact current phase + location row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-primary">
                        {t('architect.projects.currentPhase')}
                      </h4>
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        <p className="font-semibold text-sm text-primary capitalize">
                          {(project as any).current_phase || scheduleStatus || t('architect.projects.notSet')}
                        </p>
                      </div>
                    </div>
                    {project.location && (
                      <div className="space-y-1">
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-primary">
                          {t('common.location')}
                        </h4>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30 border border-border/50">
                          <MapPin className="h-4 w-4 text-primary" />
                          <p className="text-sm font-medium truncate">{project.location}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description row with inline Share/Edit for mobile */}
                  {project.description && (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2 border-t border-border/40 mt-2">
                      <div className="space-y-1 flex-1">
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-primary">
                          {t('architect.tasks.description')}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {project.description}
                        </p>
                      </div>
                      <div className="flex md:hidden items-center gap-2">
                         <Button 
                           variant="glass-style-white" 
                           size="sm" 
                           onClick={handleShare}
                         >
                          <Share2 className="h-4 w-4 mr-1" />
                          {t('architect.projects.share')}
                        </Button>
                         <Button 
                           variant="glass-style-white" 
                           size="sm" 
                           onClick={handleEdit}
                         >
                          <Edit3 className="h-4 w-4 mr-1" />
                          {t('architect.projects.edit')}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions for Project - keep compact and close to overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card 
                  className="border-none shadow-sm bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer group p-6 flex items-center gap-4"
                  onClick={handleScheduleReview}
                >
                  <div className="p-3 rounded-xl bg-primary text-white shadow-md">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{t('architect.projects.scheduleReview')}</p>
                    <p className="text-xs text-muted-foreground">{t('architect.projects.scheduleReviewDesc')}</p>
                  </div>
                  <Share2 className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Card>
                <Card 
                  className="border-none shadow-sm bg-success/5 hover:bg-success/10 transition-colors cursor-pointer group p-6 flex items-center gap-4"
                  onClick={handleProjectPortal}
                >
                  <div className="p-3 rounded-xl bg-success text-white shadow-md">
                    <Share2 className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{t('architect.projects.projectPortal')}</p>
                    <p className="text-xs text-muted-foreground">{t('architect.projects.projectPortalDesc')}</p>
                  </div>
                  <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-success transition-colors" />
                </Card>
              </div>
            </div>

            <div className="space-y-8">
               <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
                  <CardHeader className="bg-muted/30 border-b border-border/50">
                    <CardTitle className="text-lg font-bold">{t('architect.projects.projectStats')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                       <div className="flex justify-between text-sm font-medium">
                          <span className="text-muted-foreground">{t('architect.projects.tasksCompleted')}</span>
                          <span>12/16</span>
                       </div>
                       <Progress value={75} className="h-2" />
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-sm font-medium">
                          <span className="text-muted-foreground">{t('architect.projects.budgetUtilization')}</span>
                          <span>62%</span>
                       </div>
                       <Progress value={62} className="h-2" />
                    </div>
                    <div className="space-y-2">
                       <div className="flex justify-between text-sm font-medium">
                          <span className="text-muted-foreground">{t('architect.projects.timeElapsed')}</span>
                          <span>{t('architect.projects.timeElapsedValue', { elapsed: 45, total: 90 })}</span>
                       </div>
                       <Progress value={50} className="h-2" />
                    </div>
                  </CardContent>
               </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="briefing" className="mt-0">
          <BriefingForm projectId={id!} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-0 space-y-4">
          <TasksKanban 
            projectId={id} 
            onDisplaySettingsClick={() => setIsTaskSettingsOpen(true)}
          />
        </TabsContent>

        <TabsContent value="meetings" className="mt-0">
          <MeetingsList projectId={id} />
        </TabsContent>

        <TabsContent value="diary" className="mt-0">
          <SiteDiaryList projectId={id!} />
        </TabsContent>

        <TabsContent value="files" className="mt-0">
          <FilesList projectId={id!} />
        </TabsContent>
      </Tabs>

      {/* Meeting Form Dialog */}
      <MeetingFormDialog
        open={isMeetingFormOpen}
        onOpenChange={setIsMeetingFormOpen}
        projectId={id}
      />

      <ArchitectTaskSettingsPanel
        projectId={id!}
        currentDensity="default"
        open={isTaskSettingsOpen}
        onOpenChange={setIsTaskSettingsOpen}
        onDensityChange={() => {}}
      />

      {/* Grant Access Dialog */}
      <GrantAccessDialog
        open={isGrantAccessOpen}
        onOpenChange={setIsGrantAccessOpen}
        projectId={id}
      />
    </div>
  );
};
