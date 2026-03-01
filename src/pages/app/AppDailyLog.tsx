import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppProject } from '@/contexts/AppProjectContext'
import { useCurrentUserProfile } from '@/hooks/useCurrentUserProfile'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'
import { useDailyLogs } from '@/hooks/useDailyLogs'
import { useProjectTasks } from '@/hooks/useProjectTasks'
import { useWeather } from '@/hooks/useWeather'
import { supabase } from '@/integrations/supabase/client'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

type Task = {
  id: string
  project_id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  created_at: string
  updated_at: string
}

export default function AppDailyLog() {
  const { t } = useTranslation('app')
  const { selectedProject } = useAppProject()
  const { data: currentUser } = useCurrentUserProfile()
  const navigate = useNavigate()
  const [showDialog, setShowDialog] = useState(false)
  const [showCalendarPicker, setShowCalendarPicker] = useState(false)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [showTasksPanel, setShowTasksPanel] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([])
  const [galleryLogDate, setGalleryLogDate] = useState<string>('')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingLog, setEditingLog] = useState<{ id: string; log_date: string; weather: string; tasks_completed: string; workers_count: number; issues: string } | null>(null)
  const [filterDate, setFilterDate] = useState<string | null>(null)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [weather, setWeather] = useState('sunny')
  const [tasksCompleted, setTasksCompleted] = useState('')
  const [workersCount, setWorkersCount] = useState('')
  const [issues, setIssues] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  
  // Task form state
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskStatus, setTaskStatus] = useState('todo')

  const {
    dailyLogs = [],
    createDailyLog,
    updateDailyLog,
    deleteDailyLog,
    isLoading,
  } = useDailyLogs(selectedProject?.id)

  const {
    tasks = [],
    isLoading: isLoadingTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
  } = useProjectTasks(selectedProject?.id)

  // Get project location for weather data (fallback to default)
  const projectLocation = selectedProject?.location || 'Sao Paulo, Brazil'
  const { weatherData } = useWeather(projectLocation)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject?.id || !tasksCompleted.trim()) return

    setIsUploading(true)
    
    // Upload photos to Supabase storage first
    const uploadedPhotoUrls: string[] = []
    
    for (const photo of photos) {
      try {
        // Convert base64 to blob
        const response = await fetch(photo)
        const blob = await response.blob()
        
        // Generate unique filename using crypto UUID
        // Path format: {projectId}/daily-logs/{date}/{uuid}.jpg (projectId first for RLS policy)
        const uniqueId = crypto.randomUUID()
        const fileName = `${selectedProject.id}/daily-logs/${date}/${uniqueId}.jpg`
        
        // Upload to Supabase storage (use project-documents bucket)
        const { error: uploadError } = await supabase
          .storage
          .from('project-documents')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            upsert: false
          })
        
        if (uploadError) {
          console.error('Photo upload error:', uploadError)
          continue
        }
        
        // Get public URL
        const { data: urlData } = supabase
          .storage
          .from('project-documents')
          .getPublicUrl(fileName)
        
        if (urlData?.publicUrl) {
          uploadedPhotoUrls.push(urlData.publicUrl)
        }
      } catch (err) {
        console.error('Photo processing error:', err)
      }
    }

    if (editingLog) {
      // Update existing log
      // Get existing photos from the log being edited
      const existingLog = dailyLogs.find(l => l.id === editingLog.id)
      const existingPhotos = Array.isArray(existingLog?.photos) ? existingLog.photos as string[] : []
      
      updateDailyLog.mutate({
        id: editingLog.id,
        log_date: date,
        weather: weather || '',
        tasks_completed: tasksCompleted.trim(),
        workers_count: parseInt(workersCount) || 0,
        issues: issues || '',
        photos: [...existingPhotos, ...uploadedPhotoUrls],
      })
    } else {
      // Create new log
      createDailyLog.mutate({
        project_id: selectedProject.id,
        log_date: date,
        weather: weather || '',
        tasks_completed: tasksCompleted.trim(),
        workers_count: parseInt(workersCount) || 0,
        issues: issues || '',
        equipment_used: '',
        materials_delivered: '',
        safety_incidents: '',
        photos: uploadedPhotoUrls,
      })
    }

    setIsUploading(false)
    resetLogForm()
    setShowDialog(false)
  }

  const getWeatherIcon = (weatherStr?: string) => {
    if (!weatherStr) return 'wb_sunny'
    const w = weatherStr.toLowerCase()
    if (w.includes('rain') || w.includes('chuva')) return 'rainy'
    if (w.includes('cloud') || w.includes('nublado')) return 'cloud'
    if (w.includes('storm') || w.includes('tempest')) return 'thunderstorm'
    return 'wb_sunny'
  }

  const sortedLogs = [...dailyLogs]
    .filter(log => !filterDate || log.log_date === filterDate)
    .sort((a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime())

  const todayStr = new Date().toISOString().split('T')[0]

  // Get unique dates for calendar picker (from both logs and tasks)
  const logDates = [...new Set(dailyLogs.map(log => log.log_date))].sort().reverse()
  const taskDates = [...new Set(tasks.filter(t => t.due_date).map(t => t.due_date as string))]
  const allDates = [...new Set([...logDates, ...taskDates])].sort().reverse()

  // Filter tasks by date if filter is active
  const filteredTasks = filterDate
    ? tasks.filter(t => t.due_date === filterDate)
    : tasks

  // Task stats (use filtered tasks)
  const completedTasks = filteredTasks.filter(t => t.status === 'completed').length
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress').length
  const todoTasks = filteredTasks.filter(t => t.status === 'todo').length

  const openGallery = (photos: unknown[], logDate: string) => {
    const photoUrls = photos.map(p => 
      typeof p === 'string' ? p : (p as { url?: string })?.url || ''
    ).filter(Boolean)
    setGalleryPhotos(photoUrls)
    setGalleryLogDate(logDate)
    setShowGallery(true)
  }

  const handleShare = async () => {
    const shareText = filterDate
      ? `${selectedProject?.name || 'Project'} - Daily Log for ${format(new Date(filterDate), 'MMM dd, yyyy')}`
      : `${selectedProject?.name || 'Project'} - Daily Logs (${dailyLogs.length} entries)`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Daily Log',
          text: shareText,
          url: window.location.href,
        })
      } catch {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${shareText}\n${window.location.href}`)
    }
  }

  const resetTaskForm = () => {
    setTaskTitle('')
    setTaskDescription('')
    setTaskPriority('medium')
    setTaskDueDate('')
    setTaskStatus('todo')
    setEditingTask(null)
  }

  const openEditLog = (log: typeof dailyLogs[0]) => {
    setEditingLog({
      id: log.id,
      log_date: log.log_date,
      weather: log.weather || '',
      tasks_completed: log.tasks_completed || '',
      workers_count: log.workers_count || 0,
      issues: log.issues || '',
    })
    setDate(log.log_date)
    setWeather(log.weather || 'sunny')
    setTasksCompleted(log.tasks_completed || '')
    setWorkersCount(String(log.workers_count || ''))
    setIssues(log.issues || '')
    setShowDialog(true)
  }

  const resetLogForm = () => {
    setDate(new Date().toISOString().split('T')[0])
    setWeather('sunny')
    setTasksCompleted('')
    setWorkersCount('')
    setIssues('')
    setPhotos([])
    setEditingLog(null)
  }

  const openAddTask = () => {
    resetTaskForm()
    setShowTaskDialog(true)
  }

  const openEditTask = (task: Task) => {
    setEditingTask(task)
    setTaskTitle(task.title)
    setTaskDescription(task.description || '')
    setTaskPriority(task.priority)
    setTaskDueDate(task.due_date || '')
    setTaskStatus(task.status)
    setShowTaskDialog(true)
  }

  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProject?.id || !taskTitle.trim()) return

    if (editingTask) {
      updateTask.mutate({
        id: editingTask.id,
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        priority: taskPriority,
        due_date: taskDueDate || null,
        status: taskStatus,
      })
    } else {
      createTask.mutate({
        project_id: selectedProject.id,
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        priority: taskPriority,
        due_date: taskDueDate || null,
        status: taskStatus,
      })
    }

    resetTaskForm()
    setShowTaskDialog(false)
  }

  const handleDeleteTask = (taskId: string) => {
    deleteTask.mutate(taskId)
  }

  const handleToggleTask = (task: Task) => {
    toggleTaskStatus.mutate({ id: task.id, currentStatus: task.status })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-400/10'
      case 'medium': return 'text-amber-400 bg-amber-400/10'
      case 'low': return 'text-emerald-400 bg-emerald-400/10'
      default: return 'text-slate-400 bg-slate-400/10'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'check_circle'
      case 'in_progress': return 'pending'
      default: return 'radio_button_unchecked'
    }
  }

  const WEATHER_OPTIONS = [
    { value: 'sunny', icon: 'wb_sunny', label: 'Sunny' },
    { value: 'cloudy', icon: 'cloud', label: 'Cloudy' },
    { value: 'rainy', icon: 'rainy', label: 'Rainy' },
    { value: 'stormy', icon: 'thunderstorm', label: 'Stormy' },
  ]

  return (
    <MobileAppLayout showProjectSelector>
      <div className="bg-black text-white min-h-screen pb-32">
        {/* Weather Stats Row */}
        <div className="flex gap-3 py-4 px-4">
          {[
            { icon: getWeatherIcon(weatherData?.current?.condition), label: 'Weather', val: weatherData?.current?.condition || 'Sunny' },
            { icon: 'thermostat', label: 'Temp', val: weatherData?.current?.temp !== undefined ? `${weatherData.current.temp}°C` : '—' },
            { icon: 'humidity_percentage', label: 'Humidity', val: weatherData?.current?.humidity !== undefined ? `${weatherData.current.humidity}%` : '—' },
          ].map(stat => (
            <div 
              key={stat.label} 
              onClick={() => navigate('/app/weather')}
              className="flex-1 flex flex-col gap-2 rounded-2xl p-4 bg-[#121619] border border-white/5 cursor-pointer hover:bg-white/5 active:scale-95 transition-all overflow-hidden"
            >
              <div className="flex items-center gap-2 text-amber-400/80">
                <span className="material-symbols-outlined text-sm">{stat.icon}</span>
                <p className="text-[10px] font-bold uppercase tracking-tighter">{stat.label}</p>
              </div>
              <p className="text-lg font-bold truncate">{stat.val}</p>
            </div>
          ))}
        </div>

        {/* Tasks Section */}
        <div className="px-4 mb-4">
          <button
            onClick={() => setShowTasksPanel(!showTasksPanel)}
            className="w-full bg-[#121619] border border-white/5 rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-cyan-400/20 flex items-center justify-center text-cyan-400">
                <span className="material-symbols-outlined">task_alt</span>
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold">Tasks</h4>
                <p className="text-xs text-slate-500">
                  {completedTasks}/{tasks.length} completed
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {todoTasks > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 text-[10px] font-bold">
                    {todoTasks}
                  </span>
                )}
                {inProgressTasks > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 text-[10px] font-bold">
                    {inProgressTasks}
                  </span>
                )}
                {completedTasks > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-400 text-[10px] font-bold">
                    {completedTasks}
                  </span>
                )}
              </div>
              <span className={cn(
                "material-symbols-outlined text-slate-500 transition-transform",
                showTasksPanel && "rotate-180"
              )}>expand_more</span>
            </div>
          </button>

          {/* Tasks Panel */}
          {showTasksPanel && (
            <div className="mt-3 space-y-2">
              {/* Filter indicator */}
              {filterDate && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-amber-400/10 border border-amber-400/20">
                  <span className="text-xs text-amber-400">
                    Filtering by: {format(new Date(filterDate), 'MMM dd, yyyy')}
                  </span>
                  <button
                    onClick={() => setFilterDate(null)}
                    className="text-amber-400 text-xs font-medium"
                  >
                    {t('common.clearFilter', 'Clear')}
                  </button>
                </div>
              )}

              {/* Add Task Button */}
              <button
                onClick={openAddTask}
                className="w-full p-3 rounded-xl border-2 border-dashed border-white/10 text-slate-500 flex items-center justify-center gap-2 hover:border-amber-400/30 hover:text-amber-400 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span className="text-sm font-medium">Add Task</span>
              </button>

              {/* Task List */}
              {isLoadingTasks ? (
                <div className="flex items-center justify-center py-6">
                  <div className="size-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <span className="material-symbols-outlined text-2xl mb-1">checklist</span>
                  <p className="text-sm">{filterDate ? 'No tasks for this date' : 'No tasks yet'}</p>
                </div>
              ) : (
                filteredTasks.map(task => (
                  <div
                    key={task.id}
                    className="bg-[#121619] border border-white/5 rounded-xl p-3"
                  >
                    <div className="flex items-start gap-3">
                      {/* Toggle Button */}
                      <button
                        onClick={() => handleToggleTask(task as Task)}
                        className={cn(
                          "mt-0.5 transition-colors",
                          task.status === 'completed' ? "text-emerald-400" : "text-slate-500"
                        )}
                      >
                        <span className="material-symbols-outlined text-xl">
                          {getStatusIcon(task.status)}
                        </span>
                      </button>

                      {/* Task Content */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium",
                          task.status === 'completed' && "line-through text-slate-500"
                        )}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            getPriorityColor(task.priority)
                          )}>
                            {task.priority}
                          </span>
                          {task.due_date && (
                            <span className="text-[10px] text-slate-500">
                              {format(new Date(task.due_date), 'MMM dd')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                      <button
                        onClick={() => openEditTask(task as Task)}
                        className="flex-1 h-9 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-lg text-amber-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">open_in_new</span>
                        {t('common.open', 'Open')}
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="h-9 px-3 bg-red-400/10 hover:bg-red-400/20 border border-red-400/30 rounded-lg text-red-400 text-xs font-bold flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="mt-4 px-4 relative">
          <div className="absolute left-[23px] top-0 bottom-0 w-[1px] bg-slate-800" />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sortedLogs.length === 0 ? (
            <div className="text-center py-12 ml-8">
              <div className="size-16 rounded-2xl bg-amber-400/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-amber-400 !text-3xl">description</span>
              </div>
              <h3 className="text-lg font-bold mb-1">No logs yet</h3>
              <p className="text-sm text-slate-500">Add your first daily log</p>
            </div>
          ) : (
            sortedLogs.map((log, index) => {
              const isToday = log.log_date === todayStr
              const logDate = new Date(log.log_date)

              return (
                <div key={log.id} className="relative pl-8 pb-10">
                  {/* Timeline dot */}
                  <div className={cn(
                    'absolute left-0 top-1 size-4 rounded-full border-4 border-black z-10',
                    isToday ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-slate-600'
                  )} />

                  <div className="space-y-3">
                    {/* Time & Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">
                        {format(logDate, 'MMM dd, yyyy')}
                      </span>
                      {log.issues ? (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold uppercase">
                          Has Issues
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                          On Track
                        </span>
                      )}
                    </div>

                    {/* Log Card - Clickable */}
                    <div 
                      className="bg-[#121619] rounded-2xl border border-white/5 overflow-hidden shadow-2xl cursor-pointer hover:border-amber-400/20 transition-colors"
                      onClick={() => openEditLog(log)}
                    >
                      {/* Photo Header - Show first photo if available */}
                      {log.photos && Array.isArray(log.photos) && log.photos.length > 0 && (
                        <div className="relative h-36 overflow-hidden">
                          <img 
                            src={typeof log.photos[0] === 'string' ? log.photos[0] : (log.photos[0] as { url?: string })?.url || ''} 
                            alt="Photos"
                            className="w-full h-full object-cover"
                          />
                          {log.photos.length > 1 && (
                            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs font-bold text-white flex items-center gap-1">
                              <span className="material-symbols-outlined !text-sm">photo_library</span>
                              +{log.photos.length - 1}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Weather Header */}
                      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-400">
                          {getWeatherIcon(log.weather)}
                        </span>
                        <span className="text-sm font-medium text-slate-300">
                          {log.weather || 'Weather not recorded'}
                        </span>
                        {log.workers_count != null && log.workers_count > 0 && (
                          <span className="ml-auto text-xs text-slate-500">
                            <span className="material-symbols-outlined !text-sm align-middle mr-1">group</span>
                            {log.workers_count} workers
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="text-[15px] font-bold">Work Completed</h3>
                        <p className="text-sm text-slate-400 mt-2 leading-relaxed">{log.tasks_completed}</p>

                        {log.issues && (
                          <div className="mt-4 pt-4 border-t border-white/5">
                            <h4 className="text-[13px] font-bold text-red-400 flex items-center gap-2">
                              <span className="material-symbols-outlined !text-lg">warning</span>
                              Issues
                            </h4>
                            <p className="text-sm text-slate-400 mt-1">{log.issues}</p>
                          </div>
                        )}

                        {/* Footer with Actions - All on same line */}
                        <div className="mt-5 pt-4 border-t border-white/5">
                          <div className="flex items-center gap-2">
                            {/* User Avatar - Same as MobileTopNav */}
                            <div className="flex -space-x-2 mr-auto">
                              <div className="size-7 rounded-full overflow-hidden border-2 border-amber-400/30 flex items-center justify-center">
                                {currentUser?.avatar_url ? (
                                  <img src={currentUser.avatar_url} alt="" className="size-full object-cover" />
                                ) : (
                                  <div className="size-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-bold text-[10px]">
                                    {(currentUser?.display_name || 'U').slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Action Buttons */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); openEditLog(log) }}
                              className="h-8 px-3 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-lg text-amber-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                              Edit
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); openGallery((Array.isArray(log.photos) ? log.photos : []) as unknown[], log.log_date) }}
                              className="h-8 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">photo_library</span>
                              Gallery
                            </button>
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (confirm('Are you sure you want to delete this log entry?')) {
                                  deleteDailyLog.mutate(log.id)
                                }
                              }}
                              className="h-8 w-8 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 flex items-center justify-center transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Floating Action Buttons */}
        <div className="fixed bottom-[calc(4rem+8vh)] right-[max(1rem,3vw)] flex flex-col gap-3 items-center">
          {/* Calendar Button */}
          <button
            onClick={() => setShowCalendarPicker(true)}
            className={cn(
              "size-12 rounded-full border shadow-lg flex items-center justify-center active:scale-95 transition-transform",
              filterDate
                ? "bg-amber-400/20 border-amber-400/50 text-amber-400"
                : "bg-[#1C2A31] border-white/10 text-slate-300"
            )}
            aria-label="Calendar"
          >
            <span className="material-symbols-outlined text-xl">calendar_month</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="size-12 rounded-full bg-[#1C2A31] border border-white/10 text-slate-300 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
            aria-label={t('common.share', 'Share')}
          >
            <span className="material-symbols-outlined text-xl">share</span>
          </button>

          {/* Add Button (Primary) */}
          <button
            onClick={() => setShowDialog(true)}
            className="size-14 rounded-full bg-amber-400 text-black shadow-lg shadow-amber-400/30 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Add Log"
          >
            <span className="material-symbols-outlined text-3xl font-bold">add</span>
          </button>
        </div>
      </div>

      {/* Add/Edit Log Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open)
        if (!open) resetLogForm()
      }}>
        <DialogContent className="bg-[#121A1E] border-white/10 text-white max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingLog ? 'Edit Daily Log' : 'New Daily Log'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-slate-300">Date</Label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                title="Date"
                className="w-full h-12 px-4 rounded-xl bg-[#1C2A31] border border-white/5 text-white text-[14px] font-medium focus:outline-none focus:border-amber-400/30"
              />
            </div>

            {/* Weather */}
            <div className="space-y-2">
              <Label className="text-slate-300">Weather</Label>
              <div className="grid grid-cols-4 gap-2">
                {WEATHER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWeather(opt.value)}
                    className={cn(
                      'h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all',
                      weather === opt.value
                        ? 'bg-amber-400/20 border-amber-400/50 border text-amber-400'
                        : 'bg-[#1C2A31] border border-white/5 text-slate-400'
                    )}
                  >
                    <span className="material-symbols-outlined !text-xl">{opt.icon}</span>
                    <span className="text-[9px] font-bold uppercase">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Workers */}
            <div className="space-y-2">
              <Label htmlFor="workers" className="text-slate-300">Workers on Site</Label>
              <input
                id="workers"
                type="number"
                value={workersCount}
                onChange={(e) => setWorkersCount(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-[#1C2A31] border border-white/5 text-white placeholder:text-slate-500 text-[14px] font-medium focus:outline-none focus:border-amber-400/30"
                placeholder="0"
              />
            </div>

            {/* Tasks */}
            <div className="space-y-2">
              <Label htmlFor="tasks" className="text-slate-300">Work Completed</Label>
              <Textarea
                id="tasks"
                value={tasksCompleted}
                onChange={(e) => setTasksCompleted(e.target.value)}
                className="bg-[#1C2A31] border-white/5 min-h-[100px] text-white placeholder:text-slate-500"
                placeholder="Describe work completed today..."
                required
              />
            </div>

            {/* Issues */}
            <div className="space-y-2">
              <Label htmlFor="issues" className="text-slate-300">Issues</Label>
              <Textarea
                id="issues"
                value={issues}
                onChange={(e) => setIssues(e.target.value)}
                className="bg-[#1C2A31] border-white/5 min-h-[80px] text-white placeholder:text-slate-500"
                placeholder="Any issues or blockers..."
              />
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <Label className="text-slate-300">Photos</Label>
              
              {/* Photo Preview Grid */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-white/10">
                      <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 size-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined !text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Camera/Upload Buttons */}
              <div className="flex gap-2">
                <label className="flex-1 h-12 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-xl text-amber-400 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <span className="material-symbols-outlined">photo_camera</span>
                  Take Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setPhotos(prev => [...prev, event.target!.result as string])
                          }
                        }
                        reader.readAsDataURL(file)
                      }
                      e.target.value = ''
                    }}
                  />
                </label>
                <label className="flex-1 h-12 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <span className="material-symbols-outlined">photo_library</span>
                  Gallery
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      files.forEach(file => {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setPhotos(prev => [...prev, event.target!.result as string])
                          }
                        }
                        reader.readAsDataURL(file)
                      })
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
              <p className="text-[10px] text-slate-500 text-center">Photos help document daily progress</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDialog(false)
                  resetLogForm()
                }}
                className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl font-bold text-slate-300 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createDailyLog.isPending || isUploading || !tasksCompleted.trim()}
                className="flex-1 h-12 bg-amber-400 text-black font-bold rounded-xl shadow-lg shadow-amber-400/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isUploading ? 'Uploading Photos...' : createDailyLog.isPending ? 'Saving...' : (editingLog ? 'Update' : 'Save')}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Calendar Picker Dialog */}
      <Dialog open={showCalendarPicker} onOpenChange={setShowCalendarPicker}>
        <DialogContent className="bg-[#121A1E] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Filter by Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {/* Show All option */}
            <button
              onClick={() => {
                setFilterDate(null)
                setShowCalendarPicker(false)
              }}
              className={cn(
                "w-full p-3 rounded-xl border flex items-center gap-3 transition-all",
                !filterDate
                  ? "bg-amber-400/20 border-amber-400/50 text-amber-400"
                  : "bg-[#1C2A31] border-white/5 text-slate-300"
              )}
            >
              <span className="material-symbols-outlined">list</span>
              <span className="font-medium">Show All</span>
              <span className="ml-auto text-xs text-slate-500">{dailyLogs.length} logs</span>
            </button>

            {/* Date options */}
            {logDates.map(logDate => {
              const isSelected = filterDate === logDate
              const logCount = dailyLogs.filter(l => l.log_date === logDate).length
              return (
                <button
                  key={logDate}
                  onClick={() => {
                    setFilterDate(logDate)
                    setShowCalendarPicker(false)
                  }}
                  className={cn(
                    "w-full p-3 rounded-xl border flex items-center gap-3 transition-all",
                    isSelected
                      ? "bg-amber-400/20 border-amber-400/50 text-amber-400"
                      : "bg-[#1C2A31] border-white/5 text-slate-300"
                  )}
                >
                  <span className="material-symbols-outlined">calendar_today</span>
                  <span className="font-medium">{format(new Date(logDate), 'EEEE, MMM dd')}</span>
                  {logCount > 1 && (
                    <span className="ml-auto text-xs text-slate-500">{logCount} logs</span>
                  )}
                </button>
              )
            })}

            {logDates.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <span className="material-symbols-outlined text-3xl mb-2">event_busy</span>
                <p>No logs yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={(open) => {
        setShowTaskDialog(open)
        if (!open) resetTaskForm()
      }}>
        <DialogContent className="bg-[#121A1E] border-white/10 text-white max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingTask ? 'Edit Task' : 'Add Task'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTaskSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="taskTitle" className="text-slate-300">Title</Label>
              <Input
                id="taskTitle"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="bg-[#1C2A31] border-white/5 text-white placeholder:text-slate-500"
                placeholder="Enter task title..."
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="taskDesc" className="text-slate-300">Description</Label>
              <Textarea
                id="taskDesc"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="bg-[#1C2A31] border-white/5 min-h-[80px] text-white placeholder:text-slate-500"
                placeholder="Add details..."
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-slate-300">Status</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'todo', label: 'To Do', icon: 'radio_button_unchecked' },
                  { value: 'in_progress', label: 'In Progress', icon: 'pending' },
                  { value: 'completed', label: 'Done', icon: 'check_circle' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTaskStatus(opt.value)}
                    className={cn(
                      'p-2 rounded-xl flex flex-col items-center gap-1 transition-all text-xs font-medium',
                      taskStatus === opt.value
                        ? 'bg-amber-400/20 border-amber-400/50 border text-amber-400'
                        : 'bg-[#1C2A31] border border-white/5 text-slate-400'
                    )}
                  >
                    <span className="material-symbols-outlined text-lg">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-slate-300">Priority</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'low', label: 'Low', color: 'emerald' },
                  { value: 'medium', label: 'Medium', color: 'amber' },
                  { value: 'high', label: 'High', color: 'red' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTaskPriority(opt.value)}
                    className={cn(
                      'p-2 rounded-xl flex items-center justify-center gap-2 transition-all text-xs font-medium',
                      taskPriority === opt.value
                        ? `bg-${opt.color}-400/20 border-${opt.color}-400/50 border text-${opt.color}-400`
                        : 'bg-[#1C2A31] border border-white/5 text-slate-400',
                      taskPriority === opt.value && opt.value === 'low' && 'bg-emerald-400/20 border-emerald-400/50 text-emerald-400',
                      taskPriority === opt.value && opt.value === 'medium' && 'bg-amber-400/20 border-amber-400/50 text-amber-400',
                      taskPriority === opt.value && opt.value === 'high' && 'bg-red-400/20 border-red-400/50 text-red-400'
                    )}
                  >
                    <span className="material-symbols-outlined text-sm">flag</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="taskDue" className="text-slate-300">Due Date</Label>
              <input
                id="taskDue"
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                title="Due Date"
                className="w-full h-12 px-4 rounded-xl bg-[#1C2A31] border border-white/5 text-white text-[14px] font-medium focus:outline-none focus:border-amber-400/30"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowTaskDialog(false)
                  resetTaskForm()
                }}
                className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl font-bold text-slate-300 active:scale-95 transition-all"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={createTask.isPending || updateTask.isPending || !taskTitle.trim()}
                className="flex-1 h-12 bg-amber-400 text-black font-bold rounded-xl shadow-lg shadow-amber-400/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {(createTask.isPending || updateTask.isPending) 
                  ? t('common.saving', 'Saving...') 
                  : editingTask 
                    ? t('common.update', 'Update')
                    : t('common.save', 'Save')}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Photo Gallery Dialog */}
      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="bg-[#121619] border border-white/10 text-white max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/5">
            <DialogTitle className="text-white text-lg font-bold flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-400">photo_library</span>
              Photo Gallery
            </DialogTitle>
            {galleryLogDate && (
              <p className="text-sm text-slate-400 mt-1">
                {format(new Date(galleryLogDate), 'MMMM dd, yyyy')}
              </p>
            )}
          </DialogHeader>
          <div className="p-4">
            {galleryPhotos.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2">photo_camera</span>
                <p>No photos available</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {galleryPhotos.map((photo, index) => (
                  <div 
                    key={index} 
                    className="aspect-square rounded-xl overflow-hidden border border-white/5"
                  >
                    <img 
                      src={photo} 
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-6 pb-6">
            <button
              onClick={() => setShowGallery(false)}
              className="w-full h-12 bg-white/5 border border-white/10 rounded-xl font-bold text-slate-300 active:scale-95 transition-all"
            >
              {t('common.close', 'Close')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </MobileAppLayout>
  )
}
