import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { useTimer } from '@/hooks/useTimeTracking';
import { TimeClockModal } from './TimeClockModal';

export const RunningTimeIndicator = () => {
  const { isRunning, formattedElapsed } = useTimer();
  const [open, setOpen] = useState(false);

  if (!isRunning) return null;

  return (
    <>
      <div className="hidden sm:flex items-center mr-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => setOpen(true)}
        >
          <Clock className="h-4 w-4" />
          <span className="font-mono font-bold tabular-nums text-sm">{formattedElapsed}</span>
        </Button>
      </div>
      <TimeClockModal open={open} onOpenChange={setOpen} />
    </>
  );
};
