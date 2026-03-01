import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useScheduleEvents } from '@/hooks/clientPortal/useScheduleEvents';
import { format, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Clock } from 'lucide-react';
import { useDateFormat } from '@/hooks/useDateFormat';

export function ScheduleCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { events, isLoading } = useScheduleEvents();
  const { formatLongDate } = useDateFormat();

  // Get events for the selected date
  const selectedDateEvents = events.filter(event => 
    date && isSameDay(new Date(event.event_date), date)
  );

  // Create modifiers for dates with events
  const eventDays = events.map(event => new Date(event.event_date));

  return (
    <div className="grid md:grid-cols-[300px_1fr] gap-6">
      <Card>
        <CardContent className="p-4">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border"
            modifiers={{
              hasEvent: eventDays,
            }}
            modifiersStyles={{
              hasEvent: {
                fontWeight: 'bold',
                textDecoration: 'underline',
                color: 'var(--primary)',
              }
            }}
          />
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader>
          <CardTitle>
            {date ? `${format(date, 'EEEE')}, ${formatLongDate(date)}` : 'Select a date'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedDateEvents.length > 0 ? (
            <div className="space-y-4">
              {selectedDateEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="flex flex-col p-4 border rounded-lg bg-card hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{event.title}</h3>
                    <Badge variant="secondary">{event.type}</Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2">
                    {!event.all_day && event.event_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.event_time}
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </div>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No events scheduled for this day.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
