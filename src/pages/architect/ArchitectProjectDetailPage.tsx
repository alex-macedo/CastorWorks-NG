import { ArchitectProjectDetail } from '@/components/Architect/Projects/ArchitectProjectDetail';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';

export default function ArchitectProjectDetailPage() {
  useRouteTranslations(); // Load translations for this route
  return <ArchitectProjectDetail />;
}
