import { useState, useEffect, useMemo } from "react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { SidebarHeaderShell } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserRoles } from '@/hooks/useUserRoles';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  CheckCircle2,
  Clock,
  Briefcase,
  AlertCircle,
  TrendingUp,
  MoreHorizontal
} from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useArchitectTasks } from "@/hooks/useArchitectTasks";
import { useArchitectMeetings } from "@/hooks/useArchitectMeetings";
import { TimeClock } from "@/components/Shared/TimeClock/TimeClock";
import { supabase } from "@/integrations/supabase/client";
import { 
  format, 
  isToday, 
  isThisWeek, 
  isThisMonth, 
  isPast, 
  parseISO
} from "date-fns";
import { ptBR, enUS, es, fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate, Link } from "react-router-dom";

const getDateLocale = (lang: string) => {
  switch (lang) {
    case 'en-US': return enUS;
    case 'es-ES': return es;
    case 'fr-FR': return fr;
    case 'pt-BR': return ptBR;
    default: return ptBR;
  }
};

const GlassCard = ({ className, children, ...props }: any) => (
  <Card className={cn(
    "bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl border-black/5 dark:border-white/5 shadow-sm dark:shadow-2xl rounded-[32px] overflow-hidden transition-all duration-300 hover:shadow-md dark:hover:bg-zinc-900/50 dark:hover:border-white/10",
    className
  )} {...props}>
    {children}
  </Card>
);

const StatCard = ({ title, value, icon: Icon, className }: { title: string, value: string | number, icon: any, className?: string }) => (
  <GlassCard className={cn("p-6 flex flex-col justify-between h-full relative group", className)}>
    <div className="flex justify-between items-start">
      <div className="p-3 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
        <Icon className="h-6 w-6" />
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full">
        <MoreHorizontal className="h-5 w-5" />
      </Button>
    </div>
    <div className="mt-8 space-y-1">
      <span className="text-5xl font-light tracking-tighter text-foreground block">{value}</span>
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{title}</p>
    </div>
  </GlassCard>
);

const PriorityItem = ({ label, value, color, priority }: { label: string, value: number, color: string, priority?: string }) => {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <div className={cn("h-2.5 w-2.5 rounded-full ring-2 ring-opacity-20", color)} />
        <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</span>
      </div>
      <div className="h-8 min-w-8 px-2 flex items-center justify-center rounded-lg bg-muted/50 border border-border/50">
        <span className="text-sm font-bold text-foreground">{value}</span>
      </div>
    </>
  );
  if (priority) {
    return (
      <Link
        to={`/architect/tasks?priority=${priority}`}
        className="flex items-center justify-between group cursor-pointer hover:bg-muted/50 p-2 rounded-xl transition-all"
      >
        {content}
      </Link>
    );
  }
  return (
    <div className="flex items-center justify-between group cursor-pointer hover:bg-muted/50 p-2 rounded-xl transition-all">
      {content}
    </div>
  );
};

const AgendaItem = ({ time, title, completed, type, t }: { time: string, title: string, completed?: boolean, type?: 'task' | 'meeting', t: any }) => (
  <div className="flex items-center gap-4 group cursor-pointer hover:bg-muted/50 p-3 rounded-2xl transition-all border border-transparent hover:border-border/50">
    <div className="flex flex-col items-center min-w-[3rem]">
      <span className="text-sm font-bold text-foreground">{time}</span>
    </div>
    <div className={cn("w-1 h-10 rounded-full", type === 'meeting' ? 'bg-indigo-500' : 'bg-emerald-500')} />
    <div className="flex-1 min-w-0">
      <p className={cn(
        "text-sm font-medium truncate text-foreground", 
        completed && "line-through text-muted-foreground"
      )}>
        {title}
      </p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-0.5">
        {type === 'meeting' ? t('architect.myDashboard.meetingDefaultTitle') : t('architect.myDashboard.taskDefaultTitle')}
      </p>
    </div>
    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-foreground rounded-full">
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
);

export default function MyDashboard() {
  const { t, language } = useLocalization();
  const navigate = useNavigate();
  const { data: roles } = useUserRoles();
  const [userName, setUserName] = useState<string>("");
  const { projects } = useProjects();
  const { tasks } = useArchitectTasks();
  const { meetings } = useArchitectMeetings();
  
  const now = new Date();
  const locale = getDateLocale(language);
  const formattedToday = format(now, "EEEE, dd 'de' MMMM", { locale });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();
        setUserName(profile?.display_name || user.user_metadata?.full_name?.split(' ')[0] || "");
      }
    };
    fetchUser();
  }, []);

  const activeProjectsCount = useMemo(() => 
    projects?.filter(p => p.status === 'active').length || 0
  , [projects]);

  const prioritiesStats = useMemo(() => {
    const activeTasks = tasks?.filter(t => t.status !== 'completed') || [];
    const urgent = activeTasks.filter(t => t.priority === 'urgent').length;
    const high = activeTasks.filter(t => t.priority === 'high').length;
    const medium = activeTasks.filter(t => t.priority === 'medium').length;

    return [
      { label: t('architect.myDashboard.urgent'), value: urgent, color: 'bg-rose-500 text-rose-500 ring-rose-500', priority: 'urgent' as const },
      { label: t('architect.myDashboard.high'), value: high, color: 'bg-amber-500 text-amber-500 ring-amber-500', priority: 'high' as const },
      { label: t('architect.myDashboard.medium'), value: medium, color: 'bg-sky-500 text-sky-500 ring-sky-500', priority: 'medium' as const }
    ];
  }, [tasks, t]);

  const taskSummary = useMemo(() => {
    const activeTasks = tasks?.filter(t => t.status !== 'completed') || [];
    return [
      { label: t('architect.myDashboard.forToday'), value: activeTasks.filter(t => t.due_date && isToday(parseISO(t.due_date))).length },
      { label: t('architect.myDashboard.overdue'), value: activeTasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date))).length }
    ];
  }, [tasks, t]);

  const agendaItems = useMemo(() => {
    const todayMeetings = meetings
      ?.filter(m => m.meeting_date && isToday(parseISO(m.meeting_date)))
      .map(m => ({
        time: m.start_time || "16:00",
        title: m.title || t('architect.myDashboard.meetingDefaultTitle'),
        completed: false,
        type: 'meeting' as const,
        sortTime: m.start_time || "16:00"
      })) || [];

    const todayTasks = tasks
      ?.filter(t => t.due_date && isToday(parseISO(t.due_date)))
      .map(t => ({
        time: t.due_date ? format(parseISO(t.due_date), "HH:mm") : t('architect.myDashboard.allDay'),
        title: t.title || t('architect.myDashboard.taskDefaultTitle'),
        completed: t.status === 'completed',
        type: 'task' as const,
        sortTime: t.due_date ? format(parseISO(t.due_date), "HH:mm") : "23:59"
      })) || [];

    return [...todayMeetings, ...todayTasks].sort((a, b) => a.sortTime.localeCompare(b.sortTime));
  }, [meetings, tasks, t]);

  return (
    <div className="flex-1 pb-8 animate-in fade-in duration-700 bg-background text-foreground h-full">
      {/* Dynamic Sidebar Header Shell with all functional buttons */}
      <SidebarHeaderShell variant={roles?.some(r => r.role === 'architect') ? 'architect' : 'default'}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {t('navigation.myDashboard')}
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center overflow-x-auto pb-2 md:pb-0 scrollbar-none w-full md:w-auto">
             <Link to="/architect/time-tracking">
               <Button variant="glass-style-white">
                 <Clock className="h-4 w-4 mr-2" />
                 {t('architect.timeTracking.tab')}
               </Button>
             </Link>
             <Link to="/architect/tasks">
               <Button variant="glass-style-white">
                 <CheckCircle2 className="h-4 w-4 mr-2" />
                 {t('architect.navigation.tasks')}
               </Button>
             </Link>
          </div>
        </div>
      </SidebarHeaderShell>

      <div className="px-6 md:px-10 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 pb-20">
          
          {/* Column 1: Main Stats (3 cols wide) */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <StatCard 
              value={activeProjectsCount} 
              title={t('architect.myDashboard.servicesInProgress')} 
              icon={Briefcase}
              className="min-h-[200px]"
            />
            <GlassCard className="p-6 flex-1 min-h-[240px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">{t('architect.myDashboard.priorities')}</h3>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                {prioritiesStats.map((item, idx) => (
                  <PriorityItem key={idx} {...item} />
                ))}
              </div>
            </GlassCard>
            
            {/* Mini Summary Grid */}
            <div className="grid grid-cols-2 gap-4">
              <GlassCard className="p-5 flex flex-col items-center justify-center text-center gap-2">
                <span className="text-3xl font-bold text-foreground">{taskSummary[0].value}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground leading-tight">{t('architect.myDashboard.tasks')}<br/>{t('architect.myDashboard.forToday')}</span>
              </GlassCard>
              <GlassCard className="p-5 flex flex-col items-center justify-center text-center gap-2">
                 <span className="text-3xl font-bold text-foreground">{taskSummary[1].value}</span>
                 <span className="text-[10px] uppercase font-bold text-muted-foreground leading-tight">{t('architect.myDashboard.tasks')}<br/>{t('architect.myDashboard.overdue')}</span>
              </GlassCard>
            </div>
          </div>

          {/* Column 2: Agenda (5 cols wide) */}
          <div className="lg:col-span-6 flex flex-col h-full gap-6">
            <GlassCard className="flex-1 p-8 flex flex-col min-h-[500px]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 rounded-2xl">
                    <Calendar className="h-6 w-6 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-foreground tracking-tight">{t('architect.myDashboard.agenda')}</h3>
                    <p className="text-sm text-muted-foreground">{t('architect.myDashboard.appointments')} {formattedToday}</p>
                  </div>
                </div>
                <Button variant="ghost" className="text-xs uppercase font-bold tracking-widest text-muted-foreground hover:text-foreground" onClick={() => navigate('/calendar')}>
                  {t('architect.myDashboard.viewCalendar')}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-2 -mr-2 scrollbar-thin scrollbar-thumb-muted/10 scrollbar-track-transparent">
                {agendaItems.length > 0 ? (
                  agendaItems.map((item, idx) => (
                    <AgendaItem 
                      key={idx} 
                      {...item}
                      t={t}
                    />
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                    <div className="p-6 rounded-full bg-muted/20">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">{t('architect.myDashboard.emptyAgenda')}</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Column 3: Timer Only (4 cols wide) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Position TimeClock here */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-purple-500/10 blur-3xl opacity-50 rounded-full pointer-events-none" />
              <TimeClock className="w-full !bg-white/60 dark:!bg-zinc-900/40 !backdrop-blur-xl !border-black/5 dark:!border-white/5 !shadow-xl rounded-[32px] text-foreground" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
