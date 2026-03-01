import { useMemo } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTimeEntries, computeTotalHours, computeTotalBillable } from '@/hooks/useTimeTracking';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, TrendingUp, DollarSign } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface TimeReportCardProps {
  projectId?: string;
  compact?: boolean;
  variant?: 'default' | 'compact' | 'header';
}

export function TimeReportCard({ projectId, compact = false, variant = 'default' }: TimeReportCardProps) {
  const { t } = useLocalization();
  const { data: timeEntries = [] } = useTimeEntries(projectId);

  // Normalize variant
  const actualVariant = compact ? 'compact' : variant;

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const weekEntries = timeEntries.filter(e =>
      isWithinInterval(new Date(e.start_time), { start: weekStart, end: weekEnd })
    );
    const monthEntries = timeEntries.filter(e =>
      isWithinInterval(new Date(e.start_time), { start: monthStart, end: monthEnd })
    );

    return {
      weekHours: computeTotalHours(weekEntries),
      monthHours: computeTotalHours(monthEntries),
      monthBillable: computeTotalBillable(monthEntries),
    };
  }, [timeEntries]);

  if (actualVariant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-cyan-500" />
        <span className="font-mono font-bold">{stats.weekHours.toFixed(1)}h</span>
        <span className="text-muted-foreground text-xs">
          {t('architect.timeTracking.thisWeek')}
        </span>
      </div>
    );
  }

  if (actualVariant === 'header') {
    return (
      <div className="flex items-center gap-6 md:gap-8 bg-background/50 backdrop-blur-sm p-2 px-4 rounded-xl border border-border/40">
        {/* Week */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-cyan-500/10">
            <Clock className="h-4 w-4 text-cyan-500" />
          </div>
          <div>
            <p className="text-lg font-bold font-mono leading-none tracking-tight">
              {Number.isInteger(stats.weekHours) ? `${stats.weekHours}` : stats.weekHours.toFixed(1)}h
            </p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              {t('architect.timeTracking.hoursThisWeek')}
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-border/60" />

        {/* Month */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-indigo-500/10">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <div>
            <p className="text-lg font-bold font-mono leading-none tracking-tight">
              {stats.monthHours.toFixed(1)}h
            </p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              {t('architect.timeTracking.hoursThisMonth')}
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-border/60 hidden sm:block" />

        {/* Billable */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="p-2 rounded-full bg-emerald-500/10">
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-lg font-bold font-mono leading-none tracking-tight">
              {stats.monthBillable > 0
                ? stats.monthBillable.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                : '—'
              }
            </p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              {t('architect.timeTracking.billableAmount')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-cyan-500/10">
            <Clock className="h-5 w-5 text-cyan-600" />
          </div>
          <h3 className="font-bold text-sm">
            {t('architect.timeTracking.timeOverview')}
          </h3>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight">
              {Number.isInteger(stats.weekHours) ? `${stats.weekHours}` : stats.weekHours.toFixed(1)}h
            </p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {t('architect.timeTracking.hoursThisWeek')}
            </p>
          </div>

          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight">
              {stats.monthHours.toFixed(1)}h
            </p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {t('architect.timeTracking.hoursThisMonth')}
            </p>
          </div>

          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold font-mono tracking-tight">
              {stats.monthBillable > 0
                ? stats.monthBillable.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                : '—'
              }
            </p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {t('architect.timeTracking.billableAmount')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TimeReportCard;
