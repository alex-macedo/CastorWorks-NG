import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useScheduleEvents } from '@/hooks/clientPortal/useScheduleEvents';
import { Loader2, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { useDateFormat } from '@/hooks/useDateFormat';

export function UpcomingSchedule() {
  const { formatShortDate, dateFormat } = useDateFormat();
  const { upcomingEvents, isLoading } = useScheduleEvents();

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (upcomingEvents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No upcoming events scheduled.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {upcomingEvents.map((event) => {
        const shortDate = formatShortDate(event.event_date);
        const [partOne = '', partTwo = ''] = shortDate.split(' ');
        const isDayFirst = dateFormat === 'DD/MM/YYYY';
        const dayLabel = isDayFirst ? partOne : partTwo;
        const monthLabel = isDayFirst ? partTwo : partOne;

        return (
          <Card key={event.id} className="overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {/* Date Column */}
              <div className="bg-primary/5 p-4 md:w-32 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r">
                <span className="text-sm font-medium text-primary uppercase">
                  {monthLabel?.toUpperCase() ?? ''}
                </span>
                <span className="text-3xl font-bold text-foreground">
                  {dayLabel || format(new Date(event.event_date), 'd')}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(event.event_date), 'yyyy')}
                </span>
              </div>

              {/* Content Column */}
              <div className="flex-1 p-4 flex flex-col justify-center">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{event.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      {!event.all_day && event.event_time && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {event.event_time}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={getEventTypeVariant(event.type)}>
                    {event.type}
                  </Badge>
                </div>
                
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function getEventTypeVariant(type: string): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case 'milestone':
      return 'default';
    case 'meeting':
      return 'secondary';
    case 'inspection':
      return 'destructive';
    case 'deadline':
      return 'outline';
    default:
      return 'secondary';
  }
}
