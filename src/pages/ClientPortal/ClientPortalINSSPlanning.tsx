import { useClientPortalPageTitle } from '@/hooks/clientPortal/useClientPortalPageTitle';
import { INSSPlanningContainer } from '@/components/ClientPortal/Tax/INSSPlanningContainer';

export default function ClientPortalINSSPlanning() {
  useClientPortalPageTitle({ page: 'inssPlanning' });
  return <INSSPlanningContainer />;
}
