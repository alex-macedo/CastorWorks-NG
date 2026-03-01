import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalization } from "@/contexts/LocalizationContext";
import { Video, Calendar as CalendarIcon, Clock, Link as LinkIcon } from "lucide-react";
import { useClientMeetings } from "@/hooks/clientPortal/useClientMeetings";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/reportFormatters";
import { Button } from "@/components/ui/button";

export const ClientMeetingsTab = ({ projectId, projectName }: { projectId?: string, projectName?: string }) => {
  const { t, dateFormat } = useLocalization();
  const { upcomingMeetings, pastMeetings, isLoading } = useClientMeetings();
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6 animate-fade-in">
      {/* Upcoming Meetings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {t('clientPortal.meetings.title', { defaultValue: 'Upcoming Meetings' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingMeetings.length > 0 ? (
            <div className="space-y-4">
              {upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-primary/5 border-primary/20">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{meeting.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {formatDate(meeting.meeting_date, dateFormat)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(meeting.meeting_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {meeting.notes && <p className="text-sm mt-2">{meeting.notes}</p>}
                  </div>
                  <div className="mt-4 sm:mt-0">
                    {meeting.meeting_link ? (
                      <Button asChild size="sm">
                        <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                          <LinkIcon className="h-4 w-4" />
                          {t('clientPortal.meetings.join', { defaultValue: 'Join Meeting' })}
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="outline">{t('clientPortal.meetings.linkPending', { defaultValue: 'Link Pending' })}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {t('clientPortal.meetings.noUpcoming', { defaultValue: 'No upcoming meetings scheduled.' })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Past Meetings */}
      {pastMeetings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground">
              {t('clientPortal.meetings.past', { defaultValue: 'Recent Meetings' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pastMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-center justify-between p-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{meeting.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(meeting.meeting_date, dateFormat)}</p>
                  </div>
                  <Badge variant="secondary">{meeting.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
