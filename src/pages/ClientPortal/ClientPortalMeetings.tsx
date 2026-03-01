import { useClientPortalPageTitle } from '@/hooks/clientPortal/useClientPortalPageTitle';
import { MeetingsList } from '@/components/ClientPortal/Meetings/MeetingsList';

export default function ClientPortalMeetings() {
  useClientPortalPageTitle({ page: 'meetings' });
  return <MeetingsList />;
}
