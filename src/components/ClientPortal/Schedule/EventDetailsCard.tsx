import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { ScheduleEvent, EventType } from '@/types/clientPortal';
import { cn } from '@/lib/utils';
import { useDateFormat } from '@/hooks/useDateFormat';

import { useLocalization } from "@/contexts/LocalizationContext";
interface EventDetailsCardProps {
  event: ScheduleEvent | null;
  selectedDate: Date | null;
}

const getEventTypeColor = (type: EventType) => {
  switch (type) {
    case 'milestone':
      return 'bg-blue-500 text-white';
    case 'meeting':
      return 'bg-green-500 text-white';
    case 'inspection':
      return 'bg-blue-500 text-white';
    case 'deadline':
      return 'bg-yellow-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

const getEventTypeLabel = (type: EventType) => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export function EventDetailsCard({ event, selectedDate }: EventDetailsCardProps) {
  const { t } = useLocalization();
  const { formatShortDate, formatLongDate } = useDateFormat();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Details</CardTitle>
      </CardHeader>
      <CardContent>
        {event ? (
          <div className="space-y-4">
            {/* Selected event info */}
            <div className="text-sm text-muted-foreground">
              Selected: {event.title} - {formatShortDate(event.event_date)}
            </div>

            {/* Event title and type */}
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Calendar className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{event.title}</h3>
                  <Badge className={cn('mt-1', getEventTypeColor(event.type))}>
                    {getEventTypeLabel(event.type)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Date and time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {`${format(new Date(event.event_date), 'EEEE')}, ${formatLongDate(event.event_date)}`}
                  </div>
                  {event.all_day ? (
                    <div className="text-sm text-muted-foreground">All Day Event</div>
                  ) : event.event_time ? (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {event.event_time}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium mb-1">Description</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : selectedDate ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No events on {formatLongDate(selectedDate)}</p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{t("common:ui.selectDateViewDetails")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
