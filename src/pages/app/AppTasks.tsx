import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppProject } from '@/contexts/AppProjectContext'
import { useArchitectTasks } from '@/hooks/useArchitectTasks'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { format, parseISO, isAfter, isBefore, addDays, differenceInDays } from 'date-fns'

export default function AppTasks() {
  const { t } = useTranslation('app')
  const { selectedProject } = useAppProject()
  const [activePhase, setActivePhase] = useState('Design')
  const [showDialog, setShowDialog] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')

  const {
    tasks = [],
    createTask,
    isLoading,
  } = useArchitectTasks(selectedProject?.id)

  const completedTasks = tasks.filter((t: any) => t.status === 'completed' || t.status === 'done' || t.task_status?.name === 'Done')
  const totalProgress = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0

  const sortedTasks = [...tasks].sort((a: any, b: any) => {
    const now = new Date()
    const aIsDone = a.status === 'completed' || a.status === 'done' || a.task_status?.name === 'Done'
    const bIsDone = b.status === 'completed' || b.status === 'done' || b.task_status?.name === 'Done'
    const aOverdue = a.due_date && isBefore(parseISO(a.due_date), now) && !aIsDone
    const bOverdue = b.due_date && isBefore(parseISO(b.due_date), now) && !bIsDone
    
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1
    
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    }
    return 0
  })

  const upcomingTasks = tasks.filter((task: any) => {
    if (!task.due_date) return false
    if (task.status === 'completed' || task.status === 'done') return false
    const dueDate = parseISO(task.due_date)
    const now = new Date()
    const nextWeek = addDays(now, 7)
    return isAfter(dueDate, now) && isBefore(dueDate, nextWeek)
  })

  const getTaskStatus = (task: any) => {
    if (task.status === 'completed' || task.status === 'done' || task.task_status?.name === 'Done') return 'Done'
    if (task.due_date && isBefore(parseISO(task.due_date), new Date())) return 'Delayed'
    return 'Active'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return (
          <div className="size-6 rounded-full border-2 border-sky-500 flex items-center justify-center">
            <div className="size-2.5 bg-sky-500 rounded-full" />
          </div>
        )
      case 'Delayed':
        return (
          <div className="size-6 rounded-full bg-orange-500/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-orange-500 !text-sm font-black">priority_high</span>
          </div>
        )
      case 'Done':
        return (
          <div className="size-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <span className="material-symbols-outlined text-black !text-base font-bold">check</span>
          </div>
        )
      default: return null
    }
  }

  const getBadgeStyles = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-sky-500/10 text-sky-500 border-sky-500/20'
      case 'Delayed': return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'Done': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      default: return 'bg-slate-800 text-slate-400'
    }
  }

  const getOverdueDays = (dueDate: string) => {
    const days = differenceInDays(new Date(), parseISO(dueDate))
    if (days === 1) return '1 Day Overdue'
    return `${days} Days Overdue`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject?.id || !newTaskName.trim()) return

    createTask.mutate({
      project_id: selectedProject.id,
      name: newTaskName.trim(),
      description: newTaskDescription.trim() || undefined,
      due_date: newTaskDueDate || undefined,
      status: 'pending',
    })

    setNewTaskName('')
    setNewTaskDescription('')
    setNewTaskDueDate('')
    setShowDialog(false)
  }

  const PHASE_TABS = ['Design', 'Permits', 'Build']

  return (
    <MobileAppLayout showProjectSelector>
      <main className="px-5 py-6 space-y-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            {selectedProject?.cover_image_url ? (
              <img 
                src={selectedProject.cover_image_url} 
                className="size-16 rounded-2xl object-cover border border-white/10" 
                alt="" 
              />
            ) : (
              <div className="size-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-400 !text-2xl">villa</span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 size-4 bg-emerald-500 rounded-full border-2 border-black" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-white truncate">
              {selectedProject?.name || 'Modern Villa Project'}
            </h2>
            <p className="text-slate-500 text-sm font-medium truncate">
              {selectedProject?.address || 'Beverly Hills, CA'} • {selectedProject?.client_name || 'Sarah Johnson'}
            </p>
          </div>
        </div>

        <section className="bg-[#1c1c1e] rounded-3xl p-6 border border-white/5 space-y-6 shadow-xl">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                Total Completion
              </p>
              <div className="flex items-baseline gap-3">
                <h3 className="text-4xl font-bold tracking-tight text-white">{totalProgress}%</h3>
                <span className={cn(
                  'text-sm font-bold uppercase tracking-widest',
                  totalProgress >= 50 ? 'text-emerald-500' : 'text-orange-500'
                )}>
                  {totalProgress >= 100 ? 'Complete' : 
                   totalProgress >= 50 ? 'On Track' : 
                   'In Progress'}
                </span>
              </div>
            </div>
            <div className="size-10 rounded-xl bg-slate-800/50 flex items-center justify-center text-sky-500 border border-white/5">
              <span className="material-symbols-outlined !text-xl">architecture</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className={cn('h-full bg-sky-500 transition-all')}
                style={{ width: `${totalProgress}%` } as React.CSSProperties}
              />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
              <span>Started {selectedProject?.start_date ? format(new Date(selectedProject.start_date), 'MMM d') : 'Aug 12'}</span>
              <span>Due {selectedProject?.end_date ? format(new Date(selectedProject.end_date), 'MMM d, yyyy') : 'Jan 30, 2024'}</span>
            </div>
          </div>
        </section>

        <div className="bg-[#1c1c1e] p-1 rounded-xl flex items-center border border-white/5">
          {PHASE_TABS.map(phase => (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={cn(
                'flex-1 py-2.5 rounded-lg text-sm font-bold transition-all',
                activePhase === phase ? 'bg-[#3a3a3c] text-white shadow-sm' : 'text-slate-500'
              )}
            >
              {phase}
            </button>
          ))}
        </div>

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">
              Active Tasks
            </h3>
            <button className="text-sky-500 text-[11px] font-black uppercase tracking-widest">
              Edit
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="bg-[#1c1c1e] rounded-3xl p-8 border border-white/5 text-center">
              <div className="size-16 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-sky-500 !text-3xl">task_alt</span>
              </div>
              <h3 className="text-lg font-bold mb-1 text-white">{t('tasks.noTasks', 'No tasks yet')}</h3>
              <p className="text-sm text-slate-500">{t('tasks.addFirst', 'Add your first task')}</p>
            </div>
          ) : (
            <div className="space-y-3 pb-24">
              {sortedTasks.map((task: any) => {
                const status = getTaskStatus(task)
                const dueDate = task.due_date ? parseISO(task.due_date) : null

                return (
                  <div key={task.id} className="bg-[#1c1c1e] rounded-3xl p-5 border border-white/5 space-y-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <div className="mt-1">{getStatusIcon(status)}</div>
                        <div>
                          <h4 className={cn(
                            'text-[17px] font-bold text-white',
                            status === 'Done' && 'text-slate-500 line-through'
                          )}>
                            {task.name}
                          </h4>
                          {task.description && (
                            <p className="text-sm text-slate-500 font-medium mt-0.5">{task.description}</p>
                          )}
                        </div>
                      </div>
                      <span className={cn(
                        'px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0',
                        getBadgeStyles(status)
                      )}>
                        {status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <div className="flex -space-x-2">
                        {task.assignee_avatar_url ? (
                          <img 
                            src={task.assignee_avatar_url} 
                            className="size-8 rounded-full border-2 border-[#1c1c1e] object-cover" 
                            alt="" 
                          />
                        ) : (
                          <div className="size-8 rounded-full bg-slate-700 border-2 border-[#1c1c1e] flex items-center justify-center text-[10px] font-bold text-white">
                            {task.assignee_name?.slice(0, 2).toUpperCase() || 'UN'}
                          </div>
                        )}
                        {task.collaborators_count > 1 && (
                          <div className="size-8 rounded-full bg-slate-700 border-2 border-[#1c1c1e] flex items-center justify-center text-[10px] font-bold text-white">
                            +{task.collaborators_count - 1}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {status === 'Delayed' && dueDate && (
                          <div className="flex items-center gap-1.5 text-orange-500">
                            <span className="material-symbols-outlined !text-[16px] font-bold">warning</span>
                            <span className="text-[11px] font-bold uppercase">{getOverdueDays(task.due_date)}</span>
                          </div>
                        )}
                        {status === 'Done' && dueDate && (
                          <div className="flex items-center gap-1.5 text-emerald-500">
                            <span className="material-symbols-outlined !text-[16px] font-bold">check_circle</span>
                            <span className="text-[11px] font-bold uppercase tracking-widest">
                               Completed {format(dueDate, 'MMM d')}
                            </span>
                          </div>
                        )}
                        {status === 'Active' && dueDate && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <span className="material-symbols-outlined !text-[16px]">calendar_today</span>
                            <span className="text-[11px] font-bold uppercase tracking-widest">{format(dueDate, 'MMM d')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {upcomingTasks.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.25em]">
              Upcoming Next Week
            </h3>
            {upcomingTasks.slice(0, 2).map((task: any) => (
              <div 
                key={task.id}
                className="bg-[#1c1c1e] rounded-3xl p-5 border-2 border-dashed border-white/5 flex items-center gap-4"
              >
                <div className="size-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500">
                  <span className="material-symbols-outlined !text-2xl">event_repeat</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-white">{task.name}</h4>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                    Scheduled for {task.due_date && format(parseISO(task.due_date), 'MMM d')}
                  </p>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      <button
        onClick={() => setShowDialog(true)}
        className="fixed bottom-[calc(4rem+2vh)] right-6 size-16 rounded-full bg-sky-500 text-black shadow-xl flex items-center justify-center active:scale-95 transition-transform z-50"
        aria-label={t('tasks.addTask', 'Add Task')}
      >
        <span className="material-symbols-outlined text-[32px] font-bold">add</span>
      </button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#1c1c1e] border-white/10 text-white max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t('tasks.newTask', 'New Task')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-name" className="text-slate-300">Task Name</Label>
              <Input
                id="task-name"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                className="bg-[#2c2c2e] border-white/5 text-white placeholder:text-slate-500 h-12 rounded-xl"
                placeholder="Enter task name..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-desc" className="text-slate-300">Description</Label>
              <Textarea
                id="task-desc"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                className="bg-[#2c2c2e] border-white/5 min-h-[80px] text-white placeholder:text-slate-500 rounded-xl"
                placeholder="Add details..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-due" className="text-slate-300">Due Date</Label>
              <input
                id="task-due"
                type="date"
                title="Due Date"
                aria-label="Due Date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-[#2c2c2e] border border-white/5 text-white text-[14px] font-medium focus:outline-none focus:border-sky-500/30"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl font-bold text-slate-300 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createTask?.isPending || !newTaskName.trim()}
                className="flex-1 h-12 bg-sky-500 text-black font-bold rounded-xl shadow-lg shadow-sky-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {createTask?.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MobileAppLayout>
  )
}
