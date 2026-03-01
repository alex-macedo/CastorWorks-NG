import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Shared component for rendering calendar day cells with event badges
 * Used across multiple calendar implementations for consistent event display
 */

export interface CalendarEvent {
  id: string;
  title: string;
  color?: string;
  className?: string;
}

export interface CalendarDayContentProps {
  date: Date;
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  maxVisibleEvents?: number;
  onEventClick?: (event: CalendarEvent) => void;
  dayNumberClassName?: string;
}

/**
 * Renders a calendar day cell with events
 * To be used as custom day content in react-day-picker Calendar component
 */
export const CalendarDayContent = React.forwardRef<
  HTMLDivElement,
  CalendarDayContentProps
>(
  (
    {
      date,
      events,
      isCurrentMonth,
      isSelected,
      isToday,
      maxVisibleEvents = 2,
      onEventClick,
      dayNumberClassName,
    },
    ref
  ) => {
    const visibleEvents = events.slice(0, maxVisibleEvents);
    const remainingCount = events.length - maxVisibleEvents;

    return (
      <div ref={ref} className="w-full h-full p-1 space-y-0.5">
        {/* Day number */}
        <div
          className={cn(
            'text-sm font-medium',
            !isCurrentMonth && 'text-muted-foreground',
            isToday && 'text-primary font-bold',
            dayNumberClassName
          )}
        >
          {date.getDate()}
        </div>

        {/* Event badges */}
        <div className="space-y-0.5">
          {visibleEvents.map((event) => (
            <Badge
              key={event.id}
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0.5 h-auto w-full justify-start truncate font-medium border',
                event.className,
                onEventClick && 'cursor-pointer hover:opacity-80'
              )}
              onClick={(e) => {
                if (onEventClick) {
                  e.stopPropagation();
                  onEventClick(event);
                }
              }}
            >
              {event.title.length > 12
                ? `${event.title.slice(0, 12)}...`
                : event.title}
            </Badge>
          ))}

          {/* "More" indicator */}
          {remainingCount > 0 && (
            <div className="text-[10px] text-muted-foreground font-medium text-center pt-0.5">
              +{remainingCount} more
            </div>
          )}
        </div>
      </div>
    );
  }
);

CalendarDayContent.displayName = 'CalendarDayContent';

/**
 * Utility function to get event colors by type
 * Consistent color scheme across all calendar implementations
 */
export const getEventColorClass = (
  type: string
): string => {
  const colorMap: Record<string, string> = {
    milestone: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200',
    meeting: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200',
    inspection: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200',
    deadline: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200',
    task: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200',
    default: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-200',
  };

  return colorMap[type] || colorMap.default;
};
