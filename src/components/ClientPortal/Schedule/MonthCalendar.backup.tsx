import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth } from 'date-fns';
import type { ScheduleEvent, EventType } from '@/types/clientPortal';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useDateFormat } from '@/hooks/useDateFormat';

import { useLocalization } from "@/contexts/LocalizationContext";
interface MonthCalendarProps {
  events: ScheduleEvent[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  activeFilters: EventType[];
}

const getEventColor = (type: EventType) => {
  switch (type) {
    case 'milestone':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200';
    case 'meeting':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200';
    case 'inspection':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200';
    case 'deadline':
      return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200';
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200';
  }
};

export function MonthCalendar({ events, selectedDate, onSelectDate, activeFilters }: MonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { formatMonthYear, formatLongDate } = useDateFormat();

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

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("commonUI.projectSchedule") }</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMonth}
              className="h-8 w-8"
              aria-label={t("ariaLabels.previousMonth")}
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
              aria-label={t("ariaLabels.nextMonth")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
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
                aria-pressed={isSelected}
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
                        getEventColor(event.type)
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
