import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isSameDay, format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import { enUS, ptBR, es, fr } from 'date-fns/locale';
import type { Locale } from 'date-fns';
import type { ScheduleEvent, EventType } from '@/types/clientPortal';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { Language } from '@/contexts/LocalizationContext';
import { getEventColorClass } from '@/components/ui/calendar-with-events';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthCalendarProps {
  events: ScheduleEvent[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  activeFilters: EventType[];
}

export function MonthCalendar({ events, selectedDate, onSelectDate, activeFilters }: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { formatMonthYear, formatLongDate } = useDateFormat();
  const { t, language } = useLocalization();

  // Get locale for date formatting
  const getLocale = (): Locale => {
    const localeMap: Record<Language, Locale> = {
      'en-US': enUS,
      'pt-BR': ptBR,
      'es-ES': es,
      'fr-FR': fr,
    };
    return localeMap[language] || enUS;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.event_date);
      const matchesDate = isSameDay(eventDate, date);
      const matchesFilter = activeFilters.length === 0 || activeFilters.includes(event.type);
      return matchesDate && matchesFilter;
    });
  };

  const locale = getLocale();

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  // Get localized weekday names
  const weekdayNames = useMemo(() => {
    const baseDate = startOfWeek(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      return new Intl.DateTimeFormat(language, { weekday: 'short' }).format(date);
    });
  }, [language]);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("common:commonUI.projectSchedule") }</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMonth}
              className="h-8 w-8"
              aria-label={t("common:ariaLabels.previousMonth")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium min-w-[140px] text-center">
              {formatMonthYear(currentMonth)}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8"
              aria-label={t("common:ariaLabels.nextMonth")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {/* Localized day headers */}
          {weekdayNames.map((day) => (
            <div
              key={day}
              className="bg-muted text-center text-xs font-semibold text-muted-foreground py-3"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={index}
                onClick={() => onSelectDate(day)}
                className={cn(
                  'min-h-[100px] p-2 bg-background hover:bg-primary/10 transition-colors text-left relative group',
                  !isCurrentMonth && 'bg-muted/30 text-muted-foreground',
                  isSelected && 'bg-primary/10 ring-2 ring-primary ring-inset',
                  isToday && !isSelected && 'ring-1 ring-primary/50 ring-inset'
                )}
                aria-label={`${formatLongDate(day)}${dayEvents.length > 0 ? ` - ${dayEvents.length} event${dayEvents.length > 1 ? 's' : ''}` : ''}`}
              >
                <div className={cn(
                  'text-sm font-medium mb-1',
                  isToday && 'text-primary font-bold'
                )}>
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((event) => (
                    <Badge
                      key={event.id}
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 h-auto w-full justify-start truncate font-medium border',
                        getEventColorClass(event.type)
                      )}
                    >
                      {event.title.length > 12 ? `${event.title.slice(0, 12)}...` : event.title}
                    </Badge>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-muted-foreground font-medium text-center pt-0.5">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
