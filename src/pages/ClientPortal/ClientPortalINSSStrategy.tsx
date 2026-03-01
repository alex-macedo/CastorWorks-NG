import { useClientPortalPageTitle } from '@/hooks/clientPortal/useClientPortalPageTitle';
import { INSSStrategyContainer } from '@/components/ClientPortal/Tax/INSSStrategyContainer';

export default function ClientPortalINSSStrategy() {
  useClientPortalPageTitle({ page: 'inssStrategy' });
  return <INSSStrategyContainer />;
}
