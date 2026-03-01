import { DashboardOverview } from '@/components/ClientPortal/Dashboard/DashboardOverview';
import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function ClientPortalDashboard() {
  useEffect(() => {
    logger.info('[ClientPortalDashboard] Page mounted');
  }, []);

  return <DashboardOverview />;
}
