import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarHeaderShell } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AvatarResolved } from '@/components/ui/AvatarResolved';
import { Progress } from '@/components/ui/progress';
import { useProjects } from '@/hooks/useProjects';
import { useArchitectTasks } from '@/hooks/useArchitectTasks';
import { useArchitectOpportunities } from '@/hooks/useArchitectOpportunities';
import { useProjectTeamMembers } from '@/hooks/useProjectTeamMembers';
import { useArchitectMeetings } from '@/hooks/useArchitectMeetings';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  LayoutDashboard,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Briefcase,
  Search,
  Filter
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ptBR, es, fr } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { Language } from '@/contexts/LocalizationContext';
import { toast } from 'sonner';
import resolveStorageUrl from '@/utils/storage';
import { TimeReportCard } from '@/components/Architect/TimeTracking/TimeReportCard';
import { BudgetHealthCard } from '@/components/Architect/Financial/BudgetHealthCard';

// Activity feed item type
interface ActivityItem {
  id: string;
  user_name: string;
  action: string;
  action_type: 'task' | 'comment' | 'project' | 'meeting';
  description: string;
  timestamp: string;
}

// Helper to get priority badge variant
const getPriorityVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
  switch (status?.toLowerCase()) {
    case 'urgent':
    case 'high':
      return 'destructive';
    case 'active':
      return 'secondary';
    default:
      return 'default';
  }
};

// Project card component that fetches team members per project
const ProjectCard = ({ 
  project, 
  t, 
  formatDate 
}: { 
  project: any;
  t: (key: string, params?: any) => string;
  formatDate: (date: string | Date | null | undefined) => string;
}) => {
  const { teamMembers = [] } = useProjectTeamMembers(project.id);
  const progress = (project as any).avg_progress || 0;
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadProjectImage = async () => {
      if (project.image_url) {
        const url = await resolveStorageUrl(project.image_url);
        if (mounted) setImageUrl(url);
      }
    };
    loadProjectImage();
    return () => { mounted = false; };
  }, [project.image_url]);

  // Helper to get priority label with t function passed from parent
  const getPriorityLabel = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'urgent':
      case 'high':
        return t('architect.dashboard.priorities.high');
      case 'active':
      default:
        return t('architect.dashboard.priorities.normal');
    }
  };

  return (
    <Link to={`/architect/projects/${project.id}`} className="block h-full">
      <div className="group relative flex flex-col rounded-3xl overflow-hidden bg-transparent cursor-pointer transition-all duration-300 hover:-translate-y-1 h-full shadow-sm hover:shadow-md border border-border/50" data-testid="project-card">
        {/* Image Section - Taller to allow overlap */}
        <div className="relative h-56 w-full overflow-hidden rounded-t-3xl bg-muted/20">
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={project.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
             <div className={`w-full h-full bg-gradient-to-br ${
                project.status === 'active' ? 'from-success/20 to-success/5' : 'from-primary/20 to-primary/5'
              } flex items-center justify-center`}>
                <LayoutDashboard className="h-12 w-12 text-muted-foreground/30" />
             </div>
          )}
          
          {/* Status Badge */}
          <div className="absolute top-4 right-4 z-20">
            <Badge variant={getPriorityVariant(project.status)} className="shadow-sm backdrop-blur-md bg-white/90 text-black hover:bg-white capitalize px-2 py-0.5 rounded-md border-0">
               {getPriorityLabel(project.status)}
            </Badge>
          </div>
        </div>

        {/* Content Section - Overlaps the image */}
        <div className="relative z-10 -mt-24 pt-6 pl-5 pr-5 pb-5 bg-card/95 backdrop-blur-md rounded-t-3xl flex-1 flex flex-col justify-between shadow-sm border-t border-white/10">
          <div className="text-right">
             <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors leading-tight">{project.name}</h3>
                <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(project.start_date || project.created_at)}
                </p>
                {(project as any).current_phase && (
                  <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                    <LayoutDashboard className="h-3 w-3" />
                    {t('architect.dashboard.currentPhase')}: {(project as any).current_phase}
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-medium flex-row-reverse">
                  <span className="text-muted-foreground uppercase tracking-wider">{t('architect.dashboard.progress')}</span>
                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-muted" />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border/50 flex-row-reverse">
                <div className="flex items-center gap-2 flex-row-reverse">
                  <div className="flex -space-x-2 flex-row-reverse space-x-reverse" data-testid="member-avatars">
                    {teamMembers.slice(0, 3).map((member) => (
                      <AvatarResolved
                        key={member.id}
                        src={member.avatar_url}
                        alt={member.user_name || 'User'}
                        fallback={(member.user_name || 'U').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        className="h-7 w-7 border-2 border-background ring-1 ring-border"
                        fallbackClassName="text-[10px] font-bold"
                      />
                    ))}
                    {teamMembers.length > 3 && (
                      <div className="h-7 w-7 rounded-full bg-muted border-2 border-background ring-1 ring-border flex items-center justify-center text-[10px] font-bold">
                        +{teamMembers.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground" data-testid="member-count">
                    {t('architect.dashboard.memberCount', { count: teamMembers.length })}
                  </span>
                </div>
                <div className="p-1.5 rounded-full bg-primary/5 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export const ArchitectDashboard = () => {
  const { t, language } = useLocalization();
  const { formatDate: formatDateByPreference } = useDateFormat();
  const { data: roles } = useUserRoles();
  const { projects } = useProjects();
  const { tasks } = useArchitectTasks();
  const { opportunities } = useArchitectOpportunities();
  const { meetings } = useArchitectMeetings();
  const [userName, setUserName] = useState<string>('');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const activitiesPerPage = 5;

  // Get user name
  useEffect(() => {
    const fetchUserName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to get display_name from user_profiles
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();

        if (profile?.display_name) {
          setUserName(profile.display_name);
        } else {
          // Fall back to full_name from metadata
          const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
          const fullName = typeof metadata['full_name'] === 'string' ? metadata['full_name'] : t('architect.dashboard.defaultUserName');
          setUserName(fullName);
        }
      }
    };
    fetchUserName();
  }, [t]);

  // Generate activity feed from tasks (mock data for now)
  useEffect(() => {
    if (tasks && tasks.length > 0) {
      const mockActivities: ActivityItem[] = tasks.slice(0, 12).map((task, idx) => {
        const actionTypes: Array<'task' | 'comment' | 'project' | 'meeting'> = ['task', 'comment', 'project', 'meeting'];
        const actionType = actionTypes[idx % actionTypes.length];

        let action = '';
        let description = '';

        switch (actionType) {
          case 'task':
            action = t('architect.dashboard.activities.createdTask');
            description = task.title;
            break;
          case 'comment':
            action = t('architect.dashboard.activities.commentedOn');
            description = task.title;
            break;
          case 'project':
            action = t('architect.dashboard.activities.createdTask');
            description = t('architect.dashboard.activities.createdChecklist');
            break;
          case 'meeting':
            action = t('architect.dashboard.activities.createdTask');
            description = task.title;
            break;
        }

        return {
          id: task.id,
          user_name: userName || t('architect.dashboard.defaultUserName'),
          action,
          action_type: actionType,
          description,
          timestamp: task.created_at || new Date().toISOString(),
        };
      });
      setActivities(mockActivities);
    }
  }, [tasks, userName, t]);

  // Get active projects
  const activeProjects = projects?.filter(p => p.status === 'active').slice(0, 6) || [];

  // Helper to get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { period: 'morning', emoji: '☀️', message: t('architect.dashboard.greetings.morning') };
    } else if (hour >= 12 && hour < 18) {
      return { period: 'afternoon', emoji: '☀️', message: t('architect.dashboard.greetings.afternoon') };
    } else if (hour >= 18 && hour < 22) {
      return { period: 'evening', emoji: '🐝', message: t('architect.dashboard.greetings.evening') };
    } else {
      return { period: 'night', emoji: '🌙', message: t('architect.dashboard.greetings.night') };
    }
  };

  // Get time-based greeting
  const greeting = getTimeBasedGreeting();

  // Stats calculation (kept in sync with mock data / live data)
  const dashboardStats = useMemo(
    () => [
      {
        title: t('architect.dashboard.stats.totalProjects'),
        value: projects?.length || 0,
        icon: Briefcase,
        color:
          'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
        description: t('architect.dashboard.stats.projectsDescription'),
        path: '/architect/projects',
      },
      {
        title: t('architect.dashboard.stats.activeTasks'),
        value: tasks?.filter((task) => task.status !== 'completed').length || 0,
        icon: CheckCircle2,
        color:
          'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
        description: t('architect.dashboard.stats.tasksDescription'),
        path: '/architect/tasks',
      },
      {
        title: t('architect.dashboard.stats.upcomingMeetings'),
        value: meetings?.length || 0,
        icon: Calendar,
        color:
          'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
        description: t('architect.dashboard.stats.meetingsDescription'),
        path: '/architect/meetings',
      },
      {
        title: t('architect.dashboard.stats.pendingProposals'),
        // Count all opportunities that are not in terminal "won" or "lost" stages
        // Using actual stage_id UUIDs from architect_pipeline_statuses
        value:
          opportunities?.filter(
            (opp) => opp.stage_id !== '4a4ed14e-3245-4a35-9577-fe00e339b2cb' && opp.stage_id !== '85de2128-4bd4-47e0-8e40-ea99e71f46fb'
          ).length || 0,
        icon: Activity,
        color:
          'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
        description: t('architect.dashboard.stats.proposalsDescription'),
        path: '/architect/sales-pipeline',
      },
    ],
    [projects, tasks, opportunities, meetings, t]
  );

  // Calculate pagination
  const totalPages = Math.ceil(activities.length / activitiesPerPage);
  const paginatedActivities = activities.slice(
    (activityPage - 1) * activitiesPerPage,
    activityPage * activitiesPerPage
  );

  // Helper to format relative time
  const formatRelativeTime = (dateString: string) => {
    try {
      const localeMap: Record<Language, Locale> = {
        'en-US': enUS,
        'pt-BR': ptBR,
        'es-ES': es,
        'fr-FR': fr,
      };
      const locale = localeMap[language] || enUS;
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: false,
        locale: locale
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex-1 space-y-8 animate-in fade-in duration-500" data-testid="architect-dashboard">
      {/* Premium Greeting Header - Architect variant */}
      <SidebarHeaderShell variant={roles?.some(r => r.role === 'architect') ? 'architect' : 'default'}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {t('architect.dashboard.welcome', { name: userName })} {greeting.emoji}
            </h1>
            <p className="text-white/90 font-medium text-base max-w-2xl">
              {greeting.message}. {t('architect.dashboard.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <Link to="/projects/new">
              <Button variant="glass-style-white">
                <Plus className="h-4 w-4 mr-2" />
                {t('architect.dashboard.newProject')}
              </Button>
            </Link>
            <Link to="/architect/tasks">
              <Button variant="glass-style-white">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t('architect.navigation.tasks')}
              </Button>
            </Link>
            <Link to="/architect/sales-pipeline">
              <Button
                variant="glass-style-white"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {t('architect.dashboard.salesPipelineSummary')}
              </Button>
            </Link>
            <Link to="/architect/time-tracking">
              <Button
                variant="glass-style-white"
              >
                <Clock className="h-4 w-4 mr-2" />
                {t('architect.timeTracking.pageTitle')}
              </Button>
            </Link>
          </div>
        </div>
      </SidebarHeaderShell>

      {/* Stats Quick Grid - compact layout */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 px-1">
        {dashboardStats.map((stat, idx) => (
          <Link key={idx} to={stat.path} className="block group">
            <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden h-full cursor-pointer hover:bg-muted/50">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                {/* Icon on the left */}
                <div className={`p-2 rounded-xl ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                {/* Text content on the right, right-aligned */}
                <div className="flex-1 flex flex-col items-end text-right gap-1 min-w-0">
                  <div className="w-full relative">
                    <p className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors text-right">
                      {stat.title}
                    </p>
                    <div className="absolute right-0 top-0 flex items-center text-[11px] font-medium text-success gap-1 bg-success/10 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>{t('architect.dashboard.view')}</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-end gap-1.5 w-full">
                    <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
                    <span className="text-1xl font-bold text-muted-foreground truncate">
                      {stat.description}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 px-1">
        {/* Left Column - Active Projects (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-bold tracking-tight">{t('architect.dashboard.activeProjects')}</h2>
              <p className="text-sm text-muted-foreground">{t('architect.dashboard.projectsDescription')}</p>
            </div>
            <Link to="/architect/projects">
              <Button variant="ghost" size="sm">
                {t('architect.dashboard.viewAll')}
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {activeProjects.length === 0 ? (
            <Card className="border-dashed border-2 py-12 flex flex-col items-center justify-center text-center space-y-4 rounded-3xl bg-transparent">
              <div className="p-4 rounded-full bg-muted">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1 px-4">
                <h3 className="font-semibold">{t('architect.dashboard.noActiveProjects')}</h3>
                <p className="text-sm text-muted-foreground max-w-xs">{t('architect.dashboard.noProjectsDescription')}</p>
              </div>
              <Link to="/projects/new">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('architect.dashboard.newProject')}
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeProjects.map((project) => (
                <ProjectCard key={project.id} project={project} t={t} formatDate={formatDateByPreference} />
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Stay Informed & Activity */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">{t('architect.dashboard.stayInformed')}</h2>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => toast.info(t('common.searchComingSoon'))}
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => toast.info(t('common.filtersComingSoon'))}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Budget Health Card */}
          <BudgetHealthCard compact onViewDetails={() => window.location.href = '/financial-overview'} />

          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-6">
                {paginatedActivities.map((activity, idx) => {
                  const Icon = {
                    task: CheckCircle2,
                    comment: Activity,
                    project: Briefcase,
                    meeting: Calendar
                  }[activity.action_type] || Activity;
                  
                  const color = {
                    task: 'text-green-500 bg-green-500/10',
                    comment: 'text-blue-500 bg-blue-500/10',
                    project: 'text-amber-500 bg-amber-500/10',
                    meeting: 'text-cyan-500 bg-cyan-500/10'
                  }[activity.action_type] || 'text-primary bg-primary/10';

                  return (
                    <div key={activity.id} className="relative pr-8 pb-6 last:pb-0 group text-right">
                      {/* Vertical line connector */}
                      {idx !== paginatedActivities.length - 1 && (
                        <div className="absolute right-3 top-8 bottom-0 w-px bg-border group-hover:bg-primary/30 transition-colors" />
                      )}
                      
                      {/* Icon point */}
                      <div className={`absolute right-0 top-1 p-1.5 rounded-lg ${color} z-10 shadow-sm group-hover:scale-110 transition-transform`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2 flex-row-reverse">
                          <p className="font-bold text-sm leading-none">{activity.user_name}</p>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase bg-muted/50 px-1.5 py-0.5 rounded">
                            {formatRelativeTime(activity.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-snug">
                          <span className="font-medium text-foreground/80">{activity.action}</span> {activity.description}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {activities.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{t('architect.dashboard.noRecentActivity')}</p>
                  </div>
                )}

                {/* Modern Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-6 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setActivityPage(Math.max(1, activityPage - 1))}
                      disabled={activityPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex gap-1.5">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setActivityPage(page)}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            activityPage === page ? 'w-6 bg-primary' : 'w-2 bg-muted hover:bg-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setActivityPage(Math.min(totalPages, activityPage + 1))}
                      disabled={activityPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Time Tracking Overview */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <TimeReportCard />
          </div>
        </div>
      </div>
    </div>
  );
};
