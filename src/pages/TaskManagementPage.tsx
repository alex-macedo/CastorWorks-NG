import { useEffect, useState } from "react";
import { TaskBoard } from "@/components/TaskManagement/TaskBoard";
import { useTasksStore } from "@/stores/taskManagement";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLocalization } from "@/contexts/LocalizationContext";
import { User } from "lucide-react";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserRoles } from "@/hooks/useUserRoles";

export default function TaskManagementPage() {
  const { t } = useLocalization();
  const { data: roles } = useUserRoles();
  const setTasks = useTasksStore((state) => state.setTasks);
  const [defaultPhaseId, setDefaultPhaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    // Fetch tasks and phases from Supabase
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch or create default phase
        const { data: phases, error: phasesError } = await supabase
          .from("office_phases")
          .select("id")
          .order("created_at", { ascending: true })
          .limit(1);

        if (phasesError) throw phasesError;

        // If no phase exists, create a default one
        if (!phases || phases.length === 0) {
          const { data: newPhase, error: createError } = await supabase
            .from("office_phases")
            .insert({
              phase_number: 1,
              phase_name: "Default Phase",
              description: "Default phase for task management",
              status: "active",
            })
            .select("id")
            .single();

          if (createError) throw createError;
          if (newPhase) {
            setDefaultPhaseId(newPhase.id);
          }
        } else {
          setDefaultPhaseId(phases[0].id);
        }

        // Fetch tasks
        let tasksQuery = supabase
          .from("office_tasks")
          .select("*");

        // Filter by current user if enabled
        if (showMyTasksOnly && currentUserId) {
          tasksQuery = tasksQuery.eq("assigned_user_id", currentUserId);
        }

        const { data: tasks, error: tasksError } = await tasksQuery
          .order("created_at", { ascending: false });

        if (tasksError) throw tasksError;

        if (tasks) {
          setTasks(tasks);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error(t("taskManagement.toastFailedToLoadTasks"));
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up real-time subscription for tasks
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'office_tasks'
        },
        () => {
          // Refetch tasks when changes occur
          fetchData();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(tasksChannel);
    };
  }, [setTasks, showMyTasksOnly, currentUserId, t]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] w-full flex items-center justify-center">
        <div className="text-muted-foreground">{t("taskManagement.loadingTasks")}</div>
      </div>
    );
  }

  if (!defaultPhaseId) {
    return (
      <div className="h-[calc(100vh-8rem)] w-full flex items-center justify-center">
        <div className="text-destructive">{t("taskManagement.phaseLoadFailure")}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell variant="auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("taskManagement.title")}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">{t("taskManagement.description")}</p>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/architect/time-tracking">
              <Button variant="glass-style-white">
                <Clock className="h-4 w-4 mr-2" />
                {t('architect.timeTracking.tab')}
              </Button>
            </Link>
          
            <div className="flex items-center space-x-2">
              <Switch
                id="my-tasks-only"
                checked={showMyTasksOnly}
                onCheckedChange={setShowMyTasksOnly}
              />
              <Label htmlFor="my-tasks-only" className="flex items-center gap-1.5 cursor-pointer">
                <User className="h-4 w-4" />
                {t("taskManagement.myTasksOnly")}
              </Label>
            </div>
          </div>
        </div>
      </SidebarHeaderShell>
      <div className="h-[calc(100%-5rem)]">
        <TaskBoard phaseId={defaultPhaseId} />
      </div>
    </div>
  );
}
