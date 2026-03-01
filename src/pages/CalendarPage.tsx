import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useCalendarStore } from "@/stores/calendar";
import { CalendarEvent } from "@/types/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, CalendarIcon, Plus, ExternalLink, User } from "lucide-react";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { useUserRoles } from "@/hooks/useUserRoles";

export default function CalendarPage() {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const { data: roles } = useUserRoles();
  const {
    events,
    setEvents,
    currentWeekStart,
    goToNextWeek,
    goToPreviousWeek,
    goToToday,
    getWeekDays,
    getCurrentWeekEvents,
  } = useCalendarStore();

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showMyEventsOnly, setShowMyEventsOnly] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const handleEventClick = (event: CalendarEvent) => {
    if (event.source === "task") {
      // Navigate to task management and highlight the task
      navigate(`/task-management?task=${event.sourceId}`);
    } else if (event.source === "project") {
      // Navigate to project details
      navigate(`/projects?project=${event.sourceId}`);
    }
    // Add more sources as needed (e.g., meetings)
  };

  useEffect(() => {
    const fetchCalendarData = async () => {
      try {
        setLoading(true);

        // Fetch tasks from office_tasks
        let tasksQuery = supabase
          .from("office_tasks")
          .select("id, title, created_at, assigned_user_id");

        // Filter by current user if enabled
        if (showMyEventsOnly && currentUserId) {
          tasksQuery = tasksQuery.eq("assigned_user_id", currentUserId);
        }

        const { data: tasks, error: tasksError } = await tasksQuery;

        if (tasksError) throw tasksError;

        // Fetch projects
        let projectsQuery = supabase
          .from("projects")
          .select("id, name, start_date, end_date, manager_id");

        // Filter by current user if enabled (manager only for simplicity)
        if (showMyEventsOnly && currentUserId) {
          projectsQuery = projectsQuery.eq("manager_id", currentUserId);
        }

        const { data: projects, error: projectsError } = await projectsQuery;

        if (projectsError) throw projectsError;

        const calendarEvents: CalendarEvent[] = [];

        // Convert tasks to calendar events
        if (tasks) {
          tasks.forEach((task) => {
            const taskDate = new Date(task.created_at);
            calendarEvents.push({
              id: `task-${task.id}`,
              title: task.title,
              startTime: "09:00",
              endTime: "10:00",
              date: format(taskDate, "yyyy-MM-dd"),
              participants: task.assigned_user_id ? [task.assigned_user_id] : [],
              source: "task",
              sourceId: task.id,
              color: "#3b82f6", // Blue for tasks
            });
          });
        }

        // Convert projects to calendar events (using start_date)
        if (projects) {
          projects.forEach((project) => {
            if (project.start_date) {
              const projectDate = new Date(project.start_date);
              calendarEvents.push({
                id: `project-${project.id}`,
                title: `Project: ${project.name}`,
                startTime: "00:00",
                endTime: "23:59",
                date: format(projectDate, "yyyy-MM-dd"),
                participants: project.manager_id ? [project.manager_id] : [],
                source: "project",
                sourceId: project.id,
                color: "#10b981", // Green for projects
              });
            }
          });
        }

        setEvents(calendarEvents);
      } catch (error) {
        console.error("Error fetching calendar data:", error);
        toast.error("Failed to load calendar data");
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();

    // Set up real-time subscriptions
    const tasksChannel = supabase
      .channel('calendar-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'office_tasks'
        },
        () => {
          // Refetch data when tasks change
          fetchCalendarData();
        }
      )
      .subscribe();

    const projectsChannel = supabase
      .channel('calendar-projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        () => {
          // Refetch data when projects change
          fetchCalendarData();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(projectsChannel);
    };
  }, [setEvents, showMyEventsOnly, currentUserId]);

  const weekDays = getWeekDays();
  const weekEvents = getCurrentWeekEvents();

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] w-full flex items-center justify-center">
        <div className="text-muted-foreground animate-pulse">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 animate-in fade-in duration-500">
      {/* Premium Header - Architect variant */}
      <SidebarHeaderShell variant={roles?.some(r => r.role === 'architect') ? 'architect' : 'default'}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {t('pages.calendar.title')}
            </h1>
            <p className="text-white/90 font-medium text-base max-w-2xl">
              {t('pages.calendar.description')}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <Button
              variant="glass-style-white"
            >
              <Plus className="h-5 w-5 mr-2" />
              {t('pages.calendar.addEventButton')}
            </Button>

            <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-full p-1 border border-white/20 shadow-inner">
              <Button variant="ghost" className="text-white hover:bg-white/10 rounded-full h-8 px-4 text-xs font-bold" onClick={goToToday}>
                {t('pages.calendar.todayButton')}
              </Button>
              <div className="w-px h-4 bg-white/20 mx-1" />
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-8 w-8" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-8 w-8" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 ml-2 bg-white/10 rounded-full px-4 h-10 border border-white/20 shadow-inner">
              <Switch
                id="my-events-only"
                checked={showMyEventsOnly}
                onCheckedChange={setShowMyEventsOnly}
                className="data-[state=checked]:bg-emerald-400"
              />
              <Label htmlFor="my-events-only" className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-white whitespace-nowrap">
                <User className="h-3.5 w-3.5" />
                {t('pages.calendar.myEventsOnlyLabel')}
              </Label>
            </div>
          </div>
        </div>
      </SidebarHeaderShell>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] px-1">
        {/* Current Week Display */}
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50 p-6">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 rounded-xl bg-primary text-white shadow-md">
                <CalendarIcon className="h-5 w-5" />
              </div>
              {t('pages.calendar.weekHeading', { date: format(currentWeekStart, "MMMM d, yyyy") })}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid grid-cols-7 gap-4">
              {weekDays.map((day, index) => {
                const dayEvents = weekEvents.filter(
                  (event) => event.date === format(day, "yyyy-MM-dd")
                );

                const isToday =
                  format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

                return (
                  <div
                    key={index}
                    className={`p-4 rounded-2xl border-none shadow-sm transition-all duration-300 ${
                      isToday ? "bg-primary text-white shadow-lg scale-105 z-10" : "bg-white dark:bg-muted hover:bg-muted/50"
                    }`}
                  >
                    <div className="text-center mb-4">
                      <div className={`text-[10px] uppercase font-black tracking-widest ${isToday ? "text-white/80" : "text-muted-foreground"}`}>
                        {format(day, "EEE")}
                      </div>
                      <div className="text-2xl font-black">
                        {format(day, "d")}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={`text-[10px] p-2 rounded-xl cursor-pointer hover:brightness-95 transition-all font-bold uppercase tracking-tight border-none ${
                            isToday ? "bg-white/20 text-white" : ""
                          }`}
                          style={isToday ? {} : { backgroundColor: `${event.color}15`, color: event.color }}
                          onClick={() => handleEventClick(event)}
                        >
                          <div className="truncate mb-1">{event.title}</div>
                          <div className="opacity-70 flex items-center justify-between">
                            {event.startTime}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </div>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className={`text-[10px] font-black text-center uppercase tracking-widest pt-1 ${isToday ? "text-white/60" : "text-muted-foreground/60"}`}>
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Event List */}
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-3xl overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/30 border-b border-border/50 p-6">
            <CardTitle className="text-xl font-bold tracking-tight">
              {t('pages.calendar.upcomingEventsTitle', { count: weekEvents.length })}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 flex-1 overflow-y-auto">
            <div className="space-y-4">
              {weekEvents.length === 0 ? (
                <div className="text-center py-20 space-y-4 flex flex-col items-center justify-center">
                  <div className="p-4 rounded-2xl bg-muted/30">
                    <CalendarIcon className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest max-w-[200px]">
                    {t('pages.calendar.noEventsThisWeek')}
                  </p>
                </div>
              ) : (
                weekEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-5 rounded-2xl bg-white dark:bg-muted shadow-sm hover:shadow-md hover:bg-primary/5 transition-all duration-300 group cursor-pointer border-none"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base group-hover:text-primary transition-colors">{event.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">
                          {format(new Date(event.date), "EEEE, MMMM d")} •{" "}
                          {event.startTime} - {event.endTime}
                        </p>
                        {event.participants.length > 0 && (
                          <div className="flex -space-x-2 mt-3">
                             {[...Array(Math.min(event.participants.length, 3))].map((_, i) => (
                               <div key={i} className="h-6 w-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-[10px] font-black text-primary">
                                  {String.fromCharCode(65 + i)}
                               </div>
                             ))}
                             {event.participants.length > 3 && (
                               <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-black text-muted-foreground">
                                  +{event.participants.length - 3}
                               </div>
                             )}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-black uppercase tracking-widest border-none px-2 rounded-lg"
                        style={{ backgroundColor: `${event.color}15`, color: event.color }}
                      >
                        {event.source}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
