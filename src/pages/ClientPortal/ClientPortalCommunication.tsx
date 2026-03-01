import { useClientPortalPageTitle } from '@/hooks/clientPortal/useClientPortalPageTitle';
import { CommunicationLog } from '@/components/ClientPortal/Communication/CommunicationLog';

export default function ClientPortalCommunication() {
  useClientPortalPageTitle({ page: 'communication' });
  return <CommunicationLog />;
}
