import { useMemo } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useTimeEntries } from '@/hooks/useTimeTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
} from 'date-fns';
import { enUS, ptBR, es, fr } from 'date-fns/locale';
import type { Language } from '@/contexts/LocalizationContext';
import { useState } from 'react';

const localeMap: Record<Language, typeof enUS> = {
  'en-US': enUS,
  'pt-BR': ptBR,
  'es-ES': es,
  'fr-FR': fr,
};

export function WeeklyTimesheetView() {
  const { t, language } = useLocalization();
  const { data: timeEntries = [] } = useTimeEntries();
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const locale = localeMap[language] || enUS;

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  // Group entries by project and day
  const timesheetData = useMemo(() => {
    // Filter entries for current week
    const weekEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.start_time);
      return entryDate >= currentWeekStart && entryDate <= weekEnd;
    });

    // Group by project
    const projectMap = new Map<string, {
      projectName: string;
      projectId: string | null;
      dailyMinutes: number[]; // 7 days Mon-Sun
    }>();

    weekEntries.forEach(entry => {
      const key = entry.project_id || '__no_project__';
      const projectName = entry.projects?.name || t('architect.timeTracking.noProject');

      if (!projectMap.has(key)) {
        projectMap.set(key, {
          projectName,
          projectId: entry.project_id,
          dailyMinutes: [0, 0, 0, 0, 0, 0, 0],
        });
      }

      const entryDate = new Date(entry.start_time);
      const dayIndex = weekDays.findIndex(d => isSameDay(d, entryDate));
      if (dayIndex >= 0) {
        projectMap.get(key)!.dailyMinutes[dayIndex] += entry.duration_minutes;
      }
    });

    return Array.from(projectMap.values());
  }, [timeEntries, currentWeekStart, weekEnd, weekDays, t]);

  // Calculate daily totals
  const dailyTotals = weekDays.map((_, dayIdx) =>
    timesheetData.reduce((sum, row) => sum + row.dailyMinutes[dayIdx], 0)
  );

  const weekTotal = dailyTotals.reduce((sum, d) => sum + d, 0);

  const formatMinutes = (min: number): string => {
    if (min === 0) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}:${String(m).padStart(2, '0')}`;
  };

  return (
    <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t('architect.timeTracking.weeklyTimesheet')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setCurrentWeekStart(prev => subWeeks(prev, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {format(currentWeekStart, 'MMM d', { locale })} – {format(weekEnd, 'MMM d, yyyy', { locale })}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setCurrentWeekStart(prev => addWeeks(prev, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="text-left p-3 font-bold text-muted-foreground min-w-[180px]">
                  {t('architect.timeTracking.project')}
                </th>
                {weekDays.map((day, idx) => (
                  <th
                    key={idx}
                    className={`text-center p-3 font-bold min-w-[70px] ${
                      isToday(day)
                        ? 'text-primary bg-primary/5'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] uppercase tracking-wider">
                        {format(day, 'EEE', { locale })}
                      </span>
                      <span className={`text-sm font-bold ${isToday(day) ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center' : ''}`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="text-center p-3 font-bold text-foreground min-w-[70px]">
                  {t('architect.timeTracking.total')}
                </th>
              </tr>
            </thead>
            <tbody>
              {timesheetData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center p-8 text-muted-foreground">
                    {t('architect.timeTracking.noEntries')}
                  </td>
                </tr>
              ) : (
                timesheetData.map((row, idx) => {
                  const rowTotal = row.dailyMinutes.reduce((s, d) => s + d, 0);
                  return (
                    <tr key={idx} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-medium">
                        <span className="text-sm font-bold">{row.projectName}</span>
                      </td>
                      {row.dailyMinutes.map((min, dayIdx) => (
                        <td
                          key={dayIdx}
                          className={`text-center p-3 font-mono text-sm ${
                            isToday(weekDays[dayIdx]) ? 'bg-primary/5' : ''
                          } ${min > 0 ? 'font-bold' : 'text-muted-foreground/30'}`}
                        >
                          {formatMinutes(min)}
                        </td>
                      ))}
                      <td className="text-center p-3 font-mono font-bold text-sm">
                        {formatMinutes(rowTotal)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {timesheetData.length > 0 && (
              <tfoot>
                <tr className="bg-muted/30 border-t-2 border-border">
                  <td className="p-3 font-bold text-sm">
                    {t('architect.timeTracking.dailyTotal')}
                  </td>
                  {dailyTotals.map((total, idx) => (
                    <td
                      key={idx}
                      className={`text-center p-3 font-mono font-bold text-sm ${
                        isToday(weekDays[idx]) ? 'bg-primary/5 text-primary' : ''
                      }`}
                    >
                      {formatMinutes(total)}
                    </td>
                  ))}
                  <td className="text-center p-3">
                    <Badge variant="default" className="font-mono font-bold text-sm px-3">
                      {formatMinutes(weekTotal)}
                    </Badge>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default WeeklyTimesheetView;

