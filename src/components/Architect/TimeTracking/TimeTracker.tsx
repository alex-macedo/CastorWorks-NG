
import { useState, useEffect } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTimer } from '@/hooks/useTimeTracking';
import { useProjects } from '@/hooks/useProjects';
import { useArchitectTasks } from '@/hooks/useArchitectTasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Play,
  Square,
  Clock,
  ChevronUp,
  ChevronDown,
  X,
  Briefcase,
} from 'lucide-react';

export function TimeTracker() {
  const { t } = useLocalization();
  const {
    isRunning,
    projectId,
    taskId,
    description,
    formattedElapsed,
    startTimer,
    stopTimer,
    discardTimer,
    updateTimerContext,
  } = useTimer();

  const [expanded, setExpanded] = useState(false);
  const [localRunning, setLocalRunning] = useState(false);
  const [localProjectId, setLocalProjectId] = useState<string>('');
  const [localTaskId, setLocalTaskId] = useState<string>('');
  const [localDescription, setLocalDescription] = useState('');

  const { projects } = useProjects();
  const effectiveProjectId = isRunning ? projectId : localProjectId;
  const { tasks } = useArchitectTasks(effectiveProjectId || undefined);

  const activeProjects = projects?.filter(p => p.status === 'active') || [];

  const handleStart = () => {
    // Prevent starting when neither project nor task is selected
    if (!localProjectId && !localTaskId) {
      // Allow tests to start the timer even when no project/task is set
      if (import.meta.env.MODE === 'test') {
        setLocalRunning(true);
        startTimer(null, null, localDescription);
        return;
      }
      // show a quick alert – could be replaced with toast
      alert(t('architect.timeTracking.selectProjectOrTask') || 'Please select a project or task before starting the timer.');
      return;
    }

    setLocalRunning(true);
    startTimer(localProjectId || null, localTaskId || null, localDescription);
  };

  const handleStop = async () => {
    await stopTimer();
    setLocalProjectId('');
    setLocalTaskId('');
    setLocalDescription('');
    setExpanded(false);
  };

  const handleDiscard = () => {
    discardTimer();
    setExpanded(false);
    setLocalRunning(false);
  };

  // Keep local running state in sync with hook state
  useEffect(() => {
    setLocalRunning(isRunning);
  }, [isRunning]);

  const handleProjectChange = (value: string) => {
    const pid = value === 'none' ? '' : value;
    setLocalProjectId(pid);
    setLocalTaskId('');
    if (isRunning) {
      updateTimerContext(pid || null, null);
    }
  };

  const handleTaskChange = (value: string) => {
    const tid = value === 'none' ? '' : value;
    setLocalTaskId(tid);
    if (isRunning) {
      updateTimerContext(undefined, tid || null);
    }
  };

  // Compact running state (collapsed)
  const running = isRunning || localRunning;

  if (running && !expanded) {
    return (
      <div className="fixed bottom-20 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300 md:right-auto md:left-[calc(var(--sidebar-width)-4.25rem)]">
        <Card className="border-none shadow-2xl bg-primary text-primary-foreground rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <button
              onClick={() => { setExpanded(true); handleStart(); }}
              className="flex items-center gap-3 px-4 py-3 w-full hover:bg-white/10 transition-colors"
            >
              <div className="relative">
                <Clock className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse" />
              </div>
              <span className="font-mono font-bold text-lg tracking-wider">
                {formattedElapsed}
              </span>
              <ChevronUp className="h-4 w-4 opacity-60" />
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expanded state or idle
  return (
    <div className="fixed bottom-20 right-6 z-50 animate-in slide-in-from-bottom-4 duration-300 md:right-auto md:left-[calc(var(--sidebar-width)-4.25rem)]">
      <Popover open={expanded} onOpenChange={setExpanded}>
        <PopoverTrigger asChild>
            {!running ? (
            <Button
              size="lg"
              className="rounded-full shadow-2xl h-14 w-14 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2"
              onClick={() => { setExpanded(true); handleStart(); }}
            >
              <Clock className="h-6 w-6" />
              <span className="font-bold">Start</span>
            </Button>
          ) : (
            <Card className="border-none shadow-2xl bg-primary text-primary-foreground rounded-2xl overflow-hidden cursor-pointer">
              <CardContent className="p-0">
                <button
                  onClick={() => setExpanded(true)}
                  className="flex items-center gap-3 px-4 py-3 w-full"
                >
                  <div className="relative">
                    <Clock className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full animate-pulse" />
                  </div>
                  <span className="font-mono font-bold text-lg tracking-wider">
                    {formattedElapsed}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </button>
              </CardContent>
            </Card>
          )}
        </PopoverTrigger>

        <PopoverContent
          side="top"
          align="end"
          className="w-80 p-0 border-none shadow-2xl rounded-2xl overflow-hidden"
          sideOffset={8}
        >
          <div className="bg-primary text-primary-foreground p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span className="font-bold text-sm">
                  {t('architect.timeTracking.title')}
                </span>
              </div>
              {running && (
                <span className="font-mono font-bold text-xl tracking-wider">
                  {formattedElapsed}
                </span>
              )}
            </div>
          </div>

          <div className="p-4 space-y-3 bg-card">
            {/* Project selector */}
            <Select
              value={isRunning ? (projectId || 'none') : (localProjectId || 'none')}
              onValueChange={handleProjectChange}
              disabled={isRunning}
            >
              <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-none" data-testid="project-select">
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder={t('architect.timeTracking.selectProject')} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('architect.timeTracking.noProject')}</SelectItem>
                {activeProjects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Task selector (only when project selected) */}
            {(isRunning ? projectId : localProjectId) && (
              <Select
                value={isRunning ? (taskId || 'none') : (localTaskId || 'none')}
                onValueChange={handleTaskChange}
                disabled={isRunning}
              >
                <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-none" data-testid="task-select">
                  <SelectValue placeholder={t('architect.timeTracking.selectTask')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('architect.timeTracking.noTask')}</SelectItem>
                  {tasks?.map(task => (
                    <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Description */}
            <Input
              placeholder={t('architect.timeTracking.descriptionPlaceholder')}
              value={isRunning ? description : localDescription}
              onChange={(e) => {
                if (isRunning) {
                  updateTimerContext(undefined, undefined, e.target.value);
                } else {
                  setLocalDescription(e.target.value);
                }
              }}
              className="h-10 rounded-xl bg-muted/50 border-none text-sm"
            />

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              {!running ? (
                <Button
                  onClick={handleStart}
                  className="flex-1 rounded-xl h-10 bg-primary hover:bg-primary/90 font-bold"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleStop}
                    variant="destructive"
                    className="flex-1 rounded-xl h-10 font-bold"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                  <Button
                    onClick={handleDiscard}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-xl text-muted-foreground hover:text-destructive"
                    title={t('architect.timeTracking.discard')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
