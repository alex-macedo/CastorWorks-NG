import { TasksKanban } from '@/components/Architect/Tasks/TasksKanban';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';

export default function ArchitectTasksPage() {
  useRouteTranslations(); // Load translations for this route

  return (
    <div className="flex-1">
      <TasksKanban />
    </div>
  );
}
