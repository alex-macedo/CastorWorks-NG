/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useArchitectMeetings } from '@/hooks/useArchitectMeetings';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Users, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MeetingFormDialog } from './MeetingFormDialog';
import { formatDistanceToNow } from 'date-fns';

interface MeetingsListProps {
  projectId?: string;
}

export const MeetingsList = ({ projectId }: MeetingsListProps) => {
  const { t } = useLocalization();
  const { formatDate, formatDateTime } = useDateFormat();
  const { meetings, isLoading } = useArchitectMeetings(projectId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);

  const upcomingMeetings = meetings?.filter(
    m => new Date(m.meeting_date) >= new Date()
  ) || [];
  const pastMeetings = meetings?.filter(
    m => new Date(m.meeting_date) < new Date()
  ) || [];

  const handleEdit = (meeting: any) => {
    setSelectedMeeting(meeting);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setSelectedMeeting(null);
    setIsFormOpen(true);
  };

  if (isLoading) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('architect.meetings.title')}</h2>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          {t('architect.meetings.new')}
        </Button>
      </div>

      {upcomingMeetings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{t('architect.meetings.upcomingMeetings')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingMeetings.map((meeting) => (
              <Card key={meeting.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEdit(meeting)}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDateTime(meeting.meeting_date)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {meeting.projects && (
                    <div className="text-sm text-muted-foreground">
                      📁 {meeting.projects.name}
                    </div>
                  )}
                  {meeting.participants && Array.isArray(meeting.participants) && meeting.participants.length > 0 && (
                    <div className="text-sm flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      {meeting.participants.length} {t('architect.meetings.participants')}
                    </div>
                  )}
                  {meeting.agenda && (
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {meeting.agenda}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pastMeetings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">{t('architect.meetings.pastMeetings')}</h3>
          <div className="space-y-3">
            {pastMeetings.map((meeting) => (
              <Card key={meeting.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleEdit(meeting)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="font-medium flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(meeting.meeting_date)}
                      </div>
                      {meeting.projects && (
                        <div className="text-sm text-muted-foreground">
                          {meeting.projects.name}
                        </div>
                      )}
                      {meeting.decisions && (
                        <div className="text-sm">
                          <FileText className="h-3 w-3 inline mr-1" />
                          <span className="text-muted-foreground">{t('architect.meetings.decisions')}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(meeting.meeting_date), { addSuffix: true })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {meetings && meetings.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {t('architect.meetings.noMeetings')}
          </CardContent>
        </Card>
      )}

      <MeetingFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        meeting={selectedMeeting}
        projectId={projectId}
      />
    </div>
  );
};