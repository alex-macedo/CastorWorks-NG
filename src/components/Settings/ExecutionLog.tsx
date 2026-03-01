import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Terminal, CheckCircle2, AlertCircle, Loader2, Database, Package, Users, FileText, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocalization } from '@/contexts/LocalizationContext';

export interface ExecutionLogEntry {
  id: string;
  type: 'info' | 'success' | 'error' | 'progress' | 'phase';
  message: string;
  timestamp: Date;
  phase?: string;
  icon?: React.ReactNode;
}

interface ExecutionLogProps {
  logs: ExecutionLogEntry[];
  isActive: boolean;
}

const getLogIcon = (entry: ExecutionLogEntry) => {
  if (entry.icon) return entry.icon;

  switch (entry.type) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'progress':
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    case 'phase':
      return <Database className="h-4 w-4 text-primary" />;
    default:
      return <Terminal className="h-4 w-4 text-muted-foreground" />;
  }
};

const getPhaseIcon = (phase: string) => {
  if (phase.includes('Base Configuration')) return <Package className="h-4 w-4" />;
  if (phase.includes('User Setup')) return <Users className="h-4 w-4" />;
  if (phase.includes('Projects')) return <Database className="h-4 w-4" />;
  if (phase.includes('Operations')) return <Calendar className="h-4 w-4" />;
  if (phase.includes('Procurement')) return <TrendingUp className="h-4 w-4" />;
  if (phase.includes('Roadmap')) return <FileText className="h-4 w-4" />;
  return <Database className="h-4 w-4" />;
};

export function ExecutionLog({ logs, isActive }: ExecutionLogProps) {
  const { t } = useLocalization();
  const scrollAreaRef = useRef<React.ElementRef<typeof ScrollArea>>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Find the viewport element (Radix ScrollArea wraps content in a viewport)
  const getViewport = useCallback((): HTMLElement | null => {
    if (!scrollAreaRef.current) return null;
    // Radix ScrollArea creates a viewport element with data-radix-scroll-area-viewport attribute
    return scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
  }, []);

  // Check if user is near the bottom of the scroll area
  const checkIfNearBottom = useCallback((): boolean => {
    const viewport = getViewport();
    if (!viewport) return true;
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    // Consider "near bottom" if within 100px of the bottom
    const threshold = 100;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, [getViewport]);

  // Handle scroll events to detect manual scrolling
  const handleScroll = useCallback(() => {
    const nearBottom = checkIfNearBottom();
    // Only auto-scroll if user is near bottom or process is active
    setShouldAutoScroll(nearBottom || isActive);
  }, [isActive, checkIfNearBottom]);

  // Auto-scroll to bottom when new logs are added (only if should auto-scroll)
  useEffect(() => {
    if (shouldAutoScroll && endRef.current) {
      const viewport = getViewport();
      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        // Fallback: use scrollIntoView if viewport not found
        endRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [logs, shouldAutoScroll, getViewport]);

  // Reset auto-scroll preference when process starts
  useEffect(() => {
    if (isActive) {
      setShouldAutoScroll(true);
    }
  }, [isActive]);

  // Attach scroll listener to viewport when it becomes available
  useEffect(() => {
    // Use a small delay to ensure viewport is rendered
    const timeoutId = setTimeout(() => {
      const viewport = getViewport();
      if (viewport) {
        viewport.addEventListener('scroll', handleScroll);
        return () => {
          viewport.removeEventListener('scroll', handleScroll);
        };
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      const viewport = getViewport();
      if (viewport) {
        viewport.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll, getViewport]);

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <CardTitle className="text-lg">{t("pages.demoData.executionLogTitle")}</CardTitle>
            <CardDescription>{t("pages.demoData.executionLogDescription")}</CardDescription>
          </div>
          {isActive && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("pages.demoData.executionLogRunning")}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full w-full px-6 pb-4" ref={scrollAreaRef}>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <Terminal className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">
                  {t("pages.demoData.executionLogEmpty")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("pages.demoData.executionLogEmptyDescription")}
                </p>
              </div>
            ) : (
              <div className="space-y-2 font-mono text-sm">
                {logs.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-start gap-3 p-2 rounded-md transition-colors",
                      entry.type === 'phase' && "bg-primary/5 border border-primary/20 mt-3",
                      entry.type === 'error' && "bg-destructive/5 border border-destructive/20",
                      entry.type === 'success' && "bg-success/5",
                      entry.type === 'progress' && "bg-primary/5",
                      index === logs.length - 1 && isActive && "animate-pulse"
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {entry.phase ? getPhaseIcon(entry.phase) : getLogIcon(entry)}
                    </div>
                    <div className="flex-1 min-w-0">
                      {entry.phase && (
                        <div className="font-semibold text-primary mb-1">
                          {entry.phase}
                        </div>
                      )}
                      <div
                        className={cn(
                          "text-xs break-words",
                          entry.type === 'success' && "text-success",
                          entry.type === 'error' && "text-destructive",
                          entry.type === 'progress' && "text-primary",
                          entry.type === 'phase' && "text-primary font-medium",
                          entry.type === 'info' && "text-muted-foreground"
                        )}
                      >
                        {entry.message}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-xs text-muted-foreground">
                      {entry.timestamp.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                      })}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
