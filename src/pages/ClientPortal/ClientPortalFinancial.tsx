import { useClientPortalPageTitle } from '@/hooks/clientPortal/useClientPortalPageTitle';
import { FinancialSummary } from '@/components/ClientPortal/Financial/FinancialSummary';

export default function ClientPortalFinancial() {
  useClientPortalPageTitle({ page: 'financial' });
  return <FinancialSummary />;
}
