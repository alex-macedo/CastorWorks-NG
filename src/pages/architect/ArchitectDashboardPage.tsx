import { ArchitectDashboard } from '@/components/Architect/Dashboard/ArchitectDashboard';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';

export default function ArchitectDashboardPage() {
  useRouteTranslations(); // Load translations for this route
  return <ArchitectDashboard />;
}
