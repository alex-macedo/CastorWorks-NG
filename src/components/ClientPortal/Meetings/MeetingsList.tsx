import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClientMeetings } from '@/hooks/clientPortal/useClientMeetings';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import { format } from 'date-fns';
import { Loader2, Calendar, MapPin, Video, Users, Clock, Plus } from 'lucide-react';
import { RequestMeetingDialog } from '@/components/ClientPortal/Dialogs/RequestMeetingDialog';
import { useProjectTeam } from '@/hooks/clientPortal/useProjectTeam';
import { supabase } from '@/integrations/supabase/client';
import type { MeetingStatus } from '@/types/clientPortal';
import { AvatarResolved } from '@/components/ui/AvatarResolved';

import { ClientPortalPageHeader } from '../Layout/ClientPortalPageHeader';

export function MeetingsList() {
  const { t } = useLocalization();
  const navigate = useNavigate();
  const { id, projectId } = useParams<{ id?: string, projectId?: string }>();
  const effectiveProjectId = id || projectId;
  const isPortal = window.location.pathname.includes('/portal/');
  
  const { upcomingMeetings, pastMeetings, isLoadingUpcoming, isLoadingPast } = useClientMeetings();
  const { getDateParts } = useDateFormat();

  // Fetch project name for title display
  const { data: project } = useQuery({
    queryKey: ['clientPortalProject', effectiveProjectId],
    queryFn: async () => {
      if (!effectiveProjectId) return null;
      const { data } = await supabase
        .from('projects')
        .select('name')
        .eq('id', effectiveProjectId)
        .single();
      return data;
    },
    enabled: !!effectiveProjectId,
  });

  const handleRequestMeeting = () => {
    setShowRequestMeeting(true);
  };

  const { teamMembers } = useProjectTeam();
  const [showRequestMeeting, setShowRequestMeeting] = useState(false);

  const getStatusVariant = (status: MeetingStatus) => {
    switch (status) {
      case 'upcoming': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const MeetingCard = ({ meeting }: { meeting: any }) => {
    const { monthLabel, dayLabel } = getDateParts(meeting.meeting_date);

    return (
      <Card className="mb-4 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Date Block */}
          <div className="bg-primary/5 p-6 md:w-40 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r shrink-0">
            <span className="text-sm font-medium text-primary uppercase">
              {monthLabel}
            </span>
            <span className="text-4xl font-bold text-foreground my-1">
              {dayLabel}
            </span>
            <span className="text-sm text-muted-foreground">
              {format(new Date(meeting.meeting_date), 'EEEE')}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">{meeting.title}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(meeting.meeting_date), 'h:mm a')}
                    {meeting.duration && ` (${meeting.duration} min)`}
                  </div>
                  {meeting.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {meeting.location}
                    </div>
                  )}
                </div>
              </div>
              <Badge variant={getStatusVariant(meeting.status)} className="self-start">
                {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
              </Badge>
            </div>

            {/* Attendees */}
            {meeting.attendees && meeting.attendees.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("clientPortal.meetings.labels.attendees")}</span>
                <div className="flex -space-x-2">
                  {meeting.attendees.map((attendee: any) => (
                      <AvatarResolved
                        key={attendee.id}
                        src={attendee.avatar_url}
                        alt={attendee.name}
                        fallback={attendee.name.charAt(0).toUpperCase()}
                        className="h-6 w-6 border-2 border-background"
                        fallbackClassName="text-xs font-medium"
                      />
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-auto pt-2">
              {meeting.meeting_link && meeting.status === 'upcoming' && (
                <Button className="gap-2" asChild>
                  <a href={meeting.meeting_link} target="_blank" rel="noopener noreferrer">
                    <Video className="h-4 w-4" />
                    {t("clientPortal.meetings.labels.joinMeeting")}
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate(isPortal ? `/portal/${effectiveProjectId}/meetings/${meeting.id}` : `/portal/${effectiveProjectId}/meetings/${meeting.id}`)}>{t("clientPortal.meetings.labels.viewDetails")}</Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const projName = (project as any)?.name || t("clientPortal.dashboard.loading");

  return (
    <>
    <div className="space-y-6">
      <ClientPortalPageHeader
        title={t("clientPortal.meetings.title", { defaultValue: "Upcoming Meetings" })}
        subtitle={t("clientPortal.meetings.subtitle", { defaultValue: "Agende e acompanhe reuniões com sua equipe" })}
        actions={
          <Button
            variant="glass-style-white"
            onClick={handleRequestMeeting}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t("clientPortal.meetings.requestMeeting")}
          </Button>
        }
      />

      <Tabs defaultValue="upcoming" variant="pill" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upcoming">{t("clientPortal.meetings.tabs.upcoming")}</TabsTrigger>
          <TabsTrigger value="past">{t("clientPortal.meetings.tabs.pastMeetings")}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {isLoadingUpcoming ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : upcomingMeetings.length > 0 ? (
            upcomingMeetings.map(meeting => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
              {t("clientPortal.meetings.noUpcoming")}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6 space-y-4">
          {isLoadingPast ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pastMeetings.length > 0 ? (
            pastMeetings.map(meeting => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
              {t("clientPortal.meetings.noPast")}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>

    <RequestMeetingDialog
      open={showRequestMeeting}
      onOpenChange={setShowRequestMeeting}
      teamMembers={teamMembers}
      onMeetingRequested={(m) => {
        console.log('Meeting requested from MeetingsList', m);
        setShowRequestMeeting(false);
      }}
    />
    </>
  );
}
