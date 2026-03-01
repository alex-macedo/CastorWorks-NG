import { useClientPortalPageTitle } from '@/hooks/clientPortal/useClientPortalPageTitle';
import { PaymentsDashboard } from '@/components/ClientPortal/Payments/PaymentsDashboard';

export default function ClientPortalPayments() {
  useClientPortalPageTitle({ page: 'payments' });
  return <PaymentsDashboard />;
}
