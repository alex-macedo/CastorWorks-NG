import { useNavigate } from "react-router-dom";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Plus, Loader2, Video } from "lucide-react";
import { RequestMeetingDialog } from '@/components/ClientPortal/Dialogs/RequestMeetingDialog';
import { useProjectTeam } from '@/hooks/clientPortal/useProjectTeam';
import { useClientMeetings } from "@/hooks/clientPortal/useClientMeetings";
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useClientPortalAuth } from '@/hooks/clientPortal/useClientPortalAuth';
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface UpcomingMeetingsCardProps {
  clientId?: string | null;
}

export function UpcomingMeetingsCard({ clientId }: UpcomingMeetingsCardProps) {
  const navigate = useNavigate();
  const { projectId } = useClientPortalAuth();
  const { upcomingMeetings, isLoading } = useClientMeetings();
  const { formatShortDate } = useDateFormat();
  const { t } = useLocalization();

  // Take top 3 upcoming meetings
  const nextMeetings = upcomingMeetings?.slice(0, 3) || [];

  const [showRequestMeeting, setShowRequestMeeting] = useState(false);
  const { teamMembers } = useProjectTeam();

  const handleRequestMeeting = () => {
    setShowRequestMeeting(true);
  };

  return (
    <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm rounded-2xl hover:shadow-md transition-all duration-300 h-full overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 border-b border-border/50 bg-muted/30">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          {t("clientPortal.dashboard.upcomingMeetings.title")}
        </CardTitle>
        <Button
          onClick={handleRequestMeeting}
          variant="default"
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white rounded-full shadow-sm h-8 px-3"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("clientPortal.dashboard.upcomingMeetings.requestMeeting")}
        </Button>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : nextMeetings.length > 0 ? (
          <div className="space-y-3">
            {nextMeetings.map((meeting) => (
              <div key={meeting.id} className="flex items-start gap-3">
                <CalendarDays className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{meeting.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {`${formatShortDate(meeting.meeting_date)}, ${format(new Date(meeting.meeting_date), "h:mm a")}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("clientPortal.dashboard.upcomingMeetings.noMeetings")}</p>
        )}
      </CardContent>
      <RequestMeetingDialog
        open={showRequestMeeting}
        onOpenChange={setShowRequestMeeting}
        teamMembers={teamMembers}
        onMeetingRequested={(m) => {
          console.log('Meeting requested from UpcomingMeetingsCard', m);
          setShowRequestMeeting(false);
        }}
      />
    </Card>
  );
}
