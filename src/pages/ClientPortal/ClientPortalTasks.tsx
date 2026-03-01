import { useClientPortalPageTitle } from '@/hooks/clientPortal/useClientPortalPageTitle';
import { TasksTable } from '@/components/ClientPortal/Tasks/TasksTable';

export default function ClientPortalTasks() {
  useClientPortalPageTitle({ page: 'tasks' });
  return <TasksTable />;
}
