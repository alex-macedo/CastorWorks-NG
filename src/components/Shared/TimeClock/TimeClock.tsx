
import { useState, useEffect } from "react";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useTimer } from "@/hooks/useTimeTracking";
import { useProjects } from "@/hooks/useProjects";
import { useArchitectTasks } from "@/hooks/useArchitectTasks";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Button } from "@/components/ui/button";
import { Pause, Play, Square, Briefcase, ListTodo, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, isValid, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeClockProps {
  onClose?: () => void;
  className?: string;
}

export const TimeClock = ({ onClose, className }: TimeClockProps) => {
  const { t } = useLocalization();
  const navigate = useNavigate();

  const { 
    isRunning, 
    isPaused,
    projectId, 
    taskId,
    startTime,
    formattedElapsed, 
    pauseTimer,
    resumeTimer,
    stopTimer, 
    discardTimer,
    updateTimerContext,
    startTimer,
    elapsedSeconds 
  } = useTimer();
  
  const { projects } = useProjects();
  const { tasks } = useArchitectTasks(projectId || undefined);
  
  const activeProjects = projects?.filter(p => p.status === 'active') || [];
  const activeProject = projects?.find(p => p.id === projectId);
  const activeTask = tasks?.find(t => t.id === taskId);
  
  const [localProjectId, setLocalProjectId] = useState<string>(projectId || '');
  const [localTaskId, setLocalTaskId] = useState<string>(taskId || '');

  useEffect(() => {
    if (projectId) setLocalProjectId(projectId);
    if (taskId) setLocalTaskId(taskId);
  }, [projectId, taskId]);

  const handleStart = () => {
    // Prevent starting when neither project nor task is selected
    if (!localProjectId && !localTaskId) {
      // Show confirmation/alert and block
      window.alert(t('architect.timeTracking.selectProjectOrTask') || 'Please select a project or task before starting the timer.');
      return;
    }

    startTimer(localProjectId || null, localTaskId || null);
  };

  const handleStop = async () => {
    await stopTimer();
    // Entry is already saved by TimeTrackingContext (completeTimeEntry)
  };

  const handleProjectChange = (id: string) => {
    const pid = id === 'none' ? '' : id;
    setLocalProjectId(pid);
    setLocalTaskId('');
    if (isRunning) {
      updateTimerContext(pid || null, null);
    }
  };

  const handleTaskChange = (id: string) => {
    const tid = id === 'none' ? '' : id;
    setLocalTaskId(tid);
    if (isRunning) {
      updateTimerContext(undefined, tid || null);
    }
  };

  const handleOpenProject = () => {
    if (projectId) {
      navigate(`/architect/projects/${projectId}`);
      if (onClose) onClose();
    }
  };

  const startTimeFormatted = startTime ? (() => {
    const date = parseISO(startTime);
    if (!isValid(date)) return "--/-- | --:--";
    return format(date, "dd/MM | HH:mm");
  })() : "--/-- | --:--";

  const progress = (elapsedSeconds % 3600) / 3600 * 100;

  return (
    <div className={cn("relative flex flex-col items-center bg-background rounded-[40px] p-6 pb-8 w-full max-w-[280px] border border-muted/60 shadow-xl", className)}>
      {/* Minimize Button */}
      {isRunning && onClose && (
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-muted-foreground/40 hover:text-foreground transition-colors"
          title={t('common.minimize') || 'Minimize'}
        >
          <Minus className="h-4 w-4" />
        </button>
      )}

      <span className="text-muted-foreground/60 text-[10px] font-bold uppercase tracking-[0.15em] mb-8">
        {isRunning 
          ? (isPaused ? t('architect.timeTracking.statusPaused') : t('architect.timeTracking.statusInProgress'))
          : t('architect.timeTracking.timeTrackerTitle')
        }
      </span>

      {/* Progress Circle & Timer - Smaller size */}
      <div className="relative w-36 h-36 mb-6">
        <CircularProgressbar
          value={isRunning ? progress : 0}
          strokeWidth={2}
          styles={buildStyles({
            pathColor: '#E11D48',
            trailColor: '#F1F5F9',
            strokeLinecap: 'round',
            pathTransitionDuration: 0.5,
          })}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[1.8rem] font-bold font-sans tracking-tight leading-none text-foreground select-none tabular-nums">
            {formattedElapsed}
          </span>
          
          {isRunning && (
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={isPaused ? resumeTimer : pauseTimer}
                className="hover:scale-110 transition-transform active:scale-95"
                aria-label={isPaused ? t('architect.timeTracking.resume') || 'Resume' : t('architect.timeTracking.pause') || 'Pause'}
                title={isPaused ? t('architect.timeTracking.resume') || 'Resume' : t('architect.timeTracking.pause') || 'Pause'}
              >
                {isPaused ? (
                  <Play className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                ) : (
                  <Pause className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                )}
              </button>
              <button
                onClick={handleStop}
                className="hover:scale-110 transition-transform active:scale-95"
                aria-label={t('architect.timeTracking.stop') || 'Stop'}
                title={t('architect.timeTracking.stop') || 'Stop'}
              >
                <Square className="h-3.5 w-3.5 text-muted-foreground/40 fill-muted-foreground/40" />
              </button>
            </div>
          )}
        </div>
      </div>

      {isRunning ? (
        <div className="flex flex-col items-center text-center space-y-0.5 mt-1 mb-8 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h3 className="text-lg font-bold text-foreground first-letter:uppercase px-2 leading-tight">
            {activeProject?.name || t('architect.timeTracking.noProject')}
          </h3>
          {activeTask?.title && (
            <p className="text-[12px] font-semibold text-foreground/70">
              {activeTask.title}
            </p>
          )}
        </div>
      ) : (
        <div className="w-full space-y-2 mb-8 mt-1">
          <Select value={localProjectId || 'none'} onValueChange={handleProjectChange}>
            <SelectTrigger className="h-9 rounded-xl bg-muted/20 border-none px-3 text-[12px] font-medium">
              <div className="flex items-center gap-2 overflow-hidden">
                <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                <SelectValue placeholder={t('architect.timeTracking.selectProject')} />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="none">{t('architect.timeTracking.noProject')}</SelectItem>
              {activeProjects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={localTaskId || 'none'} 
            onValueChange={handleTaskChange}
            disabled={!localProjectId}
          >
            <SelectTrigger className="h-9 rounded-xl bg-muted/20 border-none px-3 text-[12px] font-medium">
              <div className="flex items-center gap-2 overflow-hidden">
                <ListTodo className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                <SelectValue placeholder={t('architect.timeTracking.selectTask')} />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="none">{t('architect.timeTracking.noTask')}</SelectItem>
              {tasks?.map(task => (
                <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!isRunning ? (
        <Button 
          className="w-full bg-black text-white hover:bg-black/90 rounded-2xl h-10 text-[12px] font-bold uppercase tracking-wider mb-4"
          onClick={handleStart}
        >
          <Play className="h-3 w-3 mr-2 fill-current" />
          {t('architect.timeTracking.start')}
        </Button>
      ) : null}

      {/* Footer Info */}
      <div className="w-full pt-6 mt-auto border-t border-muted/40 flex flex-col items-center">
        <p className="text-[8px] text-muted-foreground/50 mb-1 uppercase tracking-[0.25em] font-bold">
          {t('common.start') || 'Início'}
        </p>
        <p className="text-[12px] font-bold text-foreground/80 mb-4">
          {startTimeFormatted}
        </p>
        
        {projectId && (
          <Button 
            variant="outline" 
            onClick={handleOpenProject}
            className="h-7 rounded-full px-4 text-[9px] font-bold border-muted/50 text-muted-foreground/70 bg-transparent hover:bg-muted/10"
          >
            {t('architect.dashboard.viewProject') || 'Abrir projeto'}
          </Button>
        )}
      </div>
    </div>
  );
};
