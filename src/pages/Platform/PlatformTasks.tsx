import { useState } from 'react'
import { KanbanSquare, Plus, Pencil, Trash2 } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { SidebarHeaderShell } from '@/components/Layout/SidebarHeaderShell'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { usePlatformTasks } from '@/hooks/usePlatformTasks'
import { TaskSheet } from '@/components/Platform/Tasks/TaskSheet'
import { DeleteTaskDialog } from '@/components/Platform/Tasks/DeleteTaskDialog'
import { TaskStatusBadge, TaskPriorityBadge } from '@/components/Platform/Tasks/TaskStatusBadge'
import type { PlatformTask, TaskStatus } from '@/types/platform.types'

type TabFilter = 'all' | TaskStatus

export default function PlatformTasks() {
  const { t } = useLocalization()
  const { data: tasks, isLoading } = usePlatformTasks()
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTask, setEditTask] = useState<PlatformTask | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<PlatformTask | null>(null)

  const filtered = activeTab === 'all' ? tasks : tasks?.filter(t => t.status === activeTab)

  const openCreate = () => { setEditTask(undefined); setSheetOpen(true) }
  const openEdit = (task: PlatformTask) => { setEditTask(task); setSheetOpen(true) }

  const TABS: TabFilter[] = ['all', 'todo', 'in_progress', 'done']

  return (
    <div className="p-6 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <KanbanSquare className="h-8 w-8 shrink-0" />
            <div>
              <h1 className="text-2xl font-bold">{t('navigation:platformTasks')}</h1>
              <p className="text-muted-foreground mt-1">{t('navigation:platformTasksSubtitle')}</p>
            </div>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('platform:tasks.newTask')}
          </Button>
        </div>
      </SidebarHeaderShell>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
        <TabsList>
          {TABS.map(tab => (
            <TabsTrigger key={tab} value={tab}>
              {tab === 'all' ? t('platform:tasks.tabs.all') :
               tab === 'todo' ? t('platform:tasks.tabs.todo') :
               tab === 'in_progress' ? t('platform:tasks.tabs.inProgress') :
               t('platform:tasks.tabs.done')}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}

      {!isLoading && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('platform:tasks.taskTitle')}</TableHead>
                <TableHead>{t('platform:tasks.priority')}</TableHead>
                <TableHead>{t('platform:tasks.status')}</TableHead>
                <TableHead>{t('platform:tasks.dueDate')}</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered?.map(task => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  <TableCell><TaskPriorityBadge priority={task.priority} /></TableCell>
                  <TableCell><TaskStatusBadge status={task.status} /></TableCell>
                  <TableCell className="text-muted-foreground">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(task)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(task)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {t('common.noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <TaskSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        task={editTask}
      />
      <DeleteTaskDialog
        task={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
