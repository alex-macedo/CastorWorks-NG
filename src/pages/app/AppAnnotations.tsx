import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppProject } from '@/contexts/AppProjectContext'
import { useAnnotations, Annotation } from '@/hooks/useAnnotations'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { supabase } from '@/integrations/supabase/client'

interface AnnotationWithAuthor extends Annotation {
  created_by_user?: { display_name: string }
  assignee?: { user_id: string; display_name: string }
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function AppAnnotations() {
  const { t } = useTranslation('app')
  const { selectedProject } = useAppProject()
  const [showResolved, setShowResolved] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationWithAuthor | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed' | 'assigned'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [teamMembers, setTeamMembers] = useState<Array<{ user_id: string; display_name?: string }>>([])

  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newAssignee, setNewAssignee] = useState<string | undefined>(undefined)
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  const {
    annotations: rawAnnotations,
    isLoading,
    createAnnotation,
    updateAnnotation,
    isCreating,
  } = useAnnotations(selectedProject?.id)

  useEffect(() => {
    if (!selectedProject?.id) return

    const fetchTeamMembers = async () => {
      try {
        const { data: members, error } = await supabase
          .from('project_team_members')
          .select('user_id')
          .eq('project_id', selectedProject.id)
          .not('user_id', 'is', null)

        if (error || !members?.length) return

        const userIds = members.map(m => m.user_id).filter(Boolean) as string[]
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('user_id, display_name')
          .in('user_id', userIds)

        const merged = (profiles || []).map(p => ({ user_id: p.user_id, display_name: p.display_name }))
        setTeamMembers(merged)
      } catch (err) {
        console.error('Failed to fetch team members:', err)
      }
    }

    fetchTeamMembers()

    const subscription = supabase
      .channel(`annotations:${selectedProject.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'floor_plan_annotations',
          filter: `project_id=eq.${selectedProject.id}`
        },
        () => {}
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [selectedProject?.id])

  const annotations = useMemo<AnnotationWithAuthor[]>(
    () => isLoading ? [] : (rawAnnotations as AnnotationWithAuthor[]) ?? [],
    [isLoading, rawAnnotations]
  )

  const activeCount = annotations.filter(a => a.status !== 'resolved' && a.status !== 'closed').length
  const openCount = annotations.filter(a => a.status === 'open').length
  const inProgressCount = annotations.filter(a => a.status === 'in_progress').length
  const resolvedCount = annotations.filter(a => a.status === 'resolved' || a.status === 'closed').length
  const assignedCount = annotations.filter(a => !!a.assignee_id).length

  const displayedAnnotations = useMemo(() => {
    let filtered = annotations

    if (activeFilter === 'open') {
      filtered = filtered.filter(a => a.status === 'open')
    } else if (activeFilter === 'in_progress') {
      filtered = filtered.filter(a => a.status === 'in_progress')
    } else if (activeFilter === 'resolved') {
      filtered = filtered.filter(a => a.status === 'resolved' || a.status === 'closed')
    } else if (activeFilter === 'assigned') {
      filtered = filtered.filter(a => !!a.assignee_id)
    } else if (!showResolved) {
      filtered = filtered.filter(a => a.status !== 'resolved' && a.status !== 'closed')
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(search) ||
        a.description?.toLowerCase().includes(search)
      )
    }

    return filtered
  }, [annotations, activeFilter, showResolved, searchTerm])

  const handleCreate = async () => {
    if (!newTitle.trim() || !selectedProject?.id) return

    let photoUrl: string | undefined
    if (newPhoto) {
      setIsUploadingPhoto(true)
      try {
        const uniqueId = crypto.randomUUID()
        const ext = newPhoto.name.split('.').pop() || 'jpg'
        const fileName = `${selectedProject.id}/annotations/${uniqueId}.${ext}`
        const { error: uploadError } = await supabase
          .storage
          .from('project-documents')
          .upload(fileName, newPhoto, { contentType: newPhoto.type || 'image/jpeg', upsert: false })

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('project-documents').getPublicUrl(fileName)
          photoUrl = urlData?.publicUrl
        }
      } catch (err) {
        console.error('Annotation photo upload error:', err)
      }
      setIsUploadingPhoto(false)
    }

    createAnnotation({
      project_id: selectedProject.id,
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      priority: newPriority,
      status: 'open',
      assignee_id: newAssignee || undefined,
      photo_url: photoUrl,
    })
    setNewTitle('')
    setNewDescription('')
    setNewPriority('medium')
    setNewAssignee(undefined)
    setNewPhoto(null)
    setShowCreate(false)
  }

  const handleStatusChange = (annotation: AnnotationWithAuthor, newStatus: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    updateAnnotation({
      id: annotation.id,
      status: newStatus,
    })
    setSelectedAnnotation(prev => prev ? { ...prev, status: newStatus } : null)
  }

  const handleAssigneeChange = (annotation: AnnotationWithAuthor, assigneeId: string | undefined) => {
    updateAnnotation({
      id: annotation.id,
      assignee_id: assigneeId,
    })
    const newAssignee = assigneeId ? teamMembers.find(m => m.user_id === assigneeId) : undefined
    setSelectedAnnotation(prev => prev ? { ...prev, assignee_id: assigneeId, assignee: newAssignee ? { user_id: assigneeId!, display_name: newAssignee.display_name || '' } : undefined } : null)
  }

  const handlePriorityChange = (annotation: AnnotationWithAuthor, priority: 'low' | 'medium' | 'high') => {
    updateAnnotation({
      id: annotation.id,
      priority,
    })
    setSelectedAnnotation(prev => prev ? { ...prev, priority } : null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-400'
      case 'resolved': return 'text-emerald-500'
      case 'in_progress': return 'text-orange-500'
      case 'closed': return 'text-slate-500'
      default: return 'text-slate-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return t('annotations.open', 'Open')
      case 'in_progress': return t('annotations.inProgress', 'In Progress')
      case 'resolved': return t('annotations.resolved', 'Resolved')
      case 'closed': return t('annotations.closed', 'Closed')
      default: return status
    }
  }

  const getNumberBgColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500']
    return colors[index % colors.length]
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return t('annotations.high', 'High')
      case 'medium': return t('annotations.medium', 'Medium')
      case 'low': return t('annotations.low', 'Low')
      default: return priority
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-orange-400'
      case 'medium': return 'text-amber-400'
      case 'low': return 'text-blue-400'
      default: return 'text-slate-400'
    }
  }

  return (
    <MobileAppLayout showProjectSelector>
      <div className="bg-[#0B1114] text-white min-h-full pb-32">
        <header className="sticky top-0 z-30 bg-[#0B1114]/95 backdrop-blur-md border-b border-white/5 pt-2">
          <div className="flex gap-2.5 px-5 pb-4 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveFilter('all')}
              className={cn(
                'h-10 px-6 rounded-2xl text-[14px] font-bold whitespace-nowrap active:scale-95 transition-transform',
                activeFilter === 'all'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-[#1C2A31] border border-white/5 text-slate-300 hover:border-white/20'
              )}
            >
              {t('annotations.all', 'All')} ({annotations.length})
            </button>
            <button
              onClick={() => setActiveFilter('open')}
              className={cn(
                'h-10 px-6 rounded-2xl text-[14px] font-bold whitespace-nowrap active:scale-95 transition-transform',
                activeFilter === 'open'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-[#1C2A31] border border-white/5 text-slate-300 hover:border-white/20'
              )}
            >
              {t('annotations.open', 'Open')} ({openCount})
            </button>
            <button
              onClick={() => setActiveFilter('in_progress')}
              className={cn(
                'h-10 px-6 rounded-2xl text-[14px] font-bold whitespace-nowrap active:scale-95 transition-transform',
                activeFilter === 'in_progress'
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-[#1C2A31] border border-white/5 text-slate-300 hover:border-white/20'
              )}
            >
              {t('annotations.inProgress', 'In Progress')} ({inProgressCount})
            </button>
            <button
              onClick={() => setActiveFilter('resolved')}
              className={cn(
                'h-10 px-6 rounded-2xl text-[14px] font-bold whitespace-nowrap active:scale-95 transition-transform',
                activeFilter === 'resolved'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-[#1C2A31] border border-white/5 text-slate-300 hover:border-white/20'
              )}
            >
              {t('annotations.resolved', 'Resolved')} ({resolvedCount})
            </button>
            <button
              onClick={() => setActiveFilter('assigned')}
              className={cn(
                'h-10 px-6 rounded-2xl text-[14px] font-bold whitespace-nowrap active:scale-95 transition-transform',
                activeFilter === 'assigned'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-[#1C2A31] border border-white/5 text-slate-300 hover:border-white/20'
              )}
            >
              {t('annotations.assigned', 'Assigned')} ({assignedCount})
            </button>
          </div>

          <div className="px-5 py-3 flex items-center gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 !text-xl">search</span>
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('annotations.search', 'Search annotations...')}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#1C2A31] border border-white/5 text-white placeholder:text-slate-600 focus:border-white/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowResolved(!showResolved)}
                className={cn('w-10 h-5 rounded-full relative transition-colors', showResolved ? 'bg-blue-500' : 'bg-slate-700')}
                title="Toggle resolved visibility"
              >
                <div className={cn('absolute top-0.5 size-4 bg-white rounded-full shadow-md transition-all', showResolved ? 'right-0.5' : 'left-0.5')} />
              </button>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{t('annotations.showResolved', 'Show Resolved')}</span>
            </div>
          </div>
        </header>

        <main className="px-5 py-6">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('annotations.projectPins', 'Project Pins')}</h3>
            <span className="text-[10px] font-bold text-slate-500">{displayedAnnotations.length} {t('common.items', 'items')}</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayedAnnotations.length === 0 ? (
            <div className="bg-[#1C2A31] rounded-3xl p-10 border border-white/5 text-center">
              <div className="size-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-slate-500 !text-3xl">push_pin_off</span>
              </div>
              <h3 className="text-lg font-bold mb-1 text-white">{t('annotations.none', 'No annotations')}</h3>
              <p className="text-sm text-slate-500">{t('annotations.tapAdd', 'Tap + to create one')}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {displayedAnnotations.map((annotation, index) => (
                <div
                  key={annotation.id}
                  onClick={() => setSelectedAnnotation(annotation)}
                  className="rounded-3xl border border-white/5 bg-[#1C2A31] hover:border-white/10 transition-all active:scale-[0.98] cursor-pointer shadow-sm group"
                >
                  <div className="flex gap-4 p-4">
                    <div className="relative shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-black/20 border border-white/5 shadow-inner">
                      {annotation.photo_url ? (
                        <img src={annotation.photo_url} alt={annotation.title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                          <span className="material-symbols-outlined !text-[32px]">push_pin</span>
                        </div>
                      )}
                      {annotation.status === 'open' && (
                        <div className={cn('absolute top-1.5 right-1.5 size-7 rounded-full flex items-center justify-center font-black text-[12px] text-white shadow-lg', getNumberBgColor(index))}>
                          {index + 1}
                        </div>
                      )}
                      {annotation.status === 'resolved' && (
                        <div className="absolute top-1.5 right-1.5 size-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                          <span className="material-symbols-outlined text-white !text-[16px] font-bold">check</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-[15px] font-bold text-white truncate group-hover:text-blue-400 transition-colors">{annotation.title}</h4>
                        <span className={cn('shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border', getStatusColor(annotation.status))}>
                          {getStatusLabel(annotation.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 mb-3">{annotation.description || t('annotations.noDescriptionProvided', 'No description provided')}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-5 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[8px] font-black text-slate-400">
                            {(annotation.created_by_user?.display_name || '?').slice(0, 1).toUpperCase()}
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">{timeAgo(annotation.created_at)}</span>
                        </div>
                        <span className={cn("text-[10px] font-black uppercase tracking-wider", getPriorityColor(annotation.priority))}>
                          {getPriorityLabel(annotation.priority)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-[calc(4rem+2vh)] right-6 z-40 size-16 rounded-full bg-blue-500 shadow-xl shadow-blue-500/20 flex items-center justify-center text-white active:scale-95 transition-transform"
          aria-label="Create annotation"
        >
          <span className="material-symbols-outlined !text-[32px] font-bold">add</span>
        </button>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="bg-[#121619] border-white/10 text-white max-w-sm max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400">add_location_alt</span>
                {t('annotations.newAnnotation', 'New Annotation')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <label htmlFor="ann-title" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('annotations.title', 'Title')}</label>
                <Input
                  id="ann-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t('annotations.titlePlaceholder', 'e.g. Revise conduit routing...')}
                  className="bg-[#1C2A31] border-white/5 h-12 rounded-xl text-white placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="ann-desc" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('annotations.description', 'Description')}</label>
                <textarea
                  id="ann-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-[#1C2A31] border border-white/5 rounded-xl p-4 text-sm min-h-[100px] text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/30"
                  placeholder={t('annotations.descriptionPlaceholder', 'Describe the issue...')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('annotations.priority', 'Priority')}</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setNewPriority(p)}
                      className={cn(
                        "flex-1 h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                        newPriority === p
                          ? p === 'high' ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                            : p === 'medium' ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                          : "bg-white/5 border-white/10 text-slate-500"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {teamMembers.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('annotations.assignee', 'Assignee')}</label>
                  <Select value={newAssignee || 'unassigned'} onValueChange={(v) => setNewAssignee(v === 'unassigned' ? undefined : v)}>
                    <SelectTrigger className="bg-[#1C2A31] border-white/5 h-12 rounded-xl text-white">
                      <SelectValue placeholder={t('annotations.selectAssignee', 'Select assignee')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">{t('annotations.unassigned', 'Unassigned')}</SelectItem>
                      {teamMembers.map(m => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.display_name || m.user_id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Photo Upload Placeholder */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('annotations.photo', 'Photo')}</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 rounded-2xl border-2 border-dashed border-white/5 bg-white/[0.02] flex flex-col items-center justify-center gap-2 text-slate-600 hover:text-slate-400 hover:border-white/10 transition-all"
                >
                  <span className="material-symbols-outlined !text-3xl">add_a_photo</span>
                  <span className="text-[11px] font-bold uppercase tracking-widest">{t('annotations.attachSitePhoto', 'Attach Site Photo')}</span>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setNewPhoto(file)
                }} title="Upload Photo" />
                {newPhoto && <p className="text-[10px] text-emerald-500 font-bold px-1">✓ {t('annotations.photoReady', 'Photo ready for upload')}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  onClick={() => setShowCreate(false)}
                  className="h-12 rounded-xl bg-white/5 border border-white/5 text-[12px] font-black uppercase tracking-widest text-slate-400"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={() => handleCreate()}
                  disabled={isCreating || isUploadingPhoto || !newTitle.trim()}
                  className="h-12 rounded-xl bg-blue-500 text-white text-[12px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isCreating || isUploadingPhoto ? t('common.saving', 'Saving...') : t('annotations.create', 'Create')}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedAnnotation} onOpenChange={() => setSelectedAnnotation(null)}>
          <DialogContent className="bg-[#121619] border-white/10 text-white max-w-sm">
            <DialogHeader>
              <DialogTitle className="sr-only">
                {selectedAnnotation?.title || 'Annotation Details'}
              </DialogTitle>
            </DialogHeader>
            {selectedAnnotation && (
              <div className="space-y-6">
                <div className="relative h-48 -mx-6 -mt-6 rounded-b-3xl overflow-hidden border-b border-white/5">
                  {selectedAnnotation.photo_url ? (
                    <img src={selectedAnnotation.photo_url} className="size-full object-cover" alt="" />
                  ) : (
                    <div className="size-full bg-slate-900 flex items-center justify-center text-slate-800">
                      <span className="material-symbols-outlined !text-6xl">push_pin</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <Select
                      value={selectedAnnotation.status}
                      onValueChange={(v) => handleStatusChange(selectedAnnotation, v as Annotation['status'])}
                    >
                      <SelectTrigger className="h-8 px-3 rounded-full bg-black/60 backdrop-blur-md border-white/10 text-white text-[10px] font-black w-auto min-w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">{t('annotations.open', 'Open')}</SelectItem>
                        <SelectItem value="in_progress">{t('annotations.inProgress', 'In Progress')}</SelectItem>
                        <SelectItem value="resolved">{t('annotations.resolved', 'Resolved')}</SelectItem>
                        <SelectItem value="closed">{t('annotations.closed', 'Closed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">{selectedAnnotation.title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">{selectedAnnotation.description || t('annotations.noAdditionalDetails', 'No additional details provided for this annotation.')}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-white/5">
                    <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{t('annotations.priority', 'Priority')}</p>
                      <Select value={selectedAnnotation.priority} onValueChange={(v) => handlePriorityChange(selectedAnnotation, v as 'low' | 'medium' | 'high')}>
                        <SelectTrigger className={cn('h-9 bg-[#1C2A31] border-white/5 text-xs font-bold', getPriorityColor(selectedAnnotation.priority))}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">{t('annotations.low', 'Low')}</SelectItem>
                          <SelectItem value="medium">{t('annotations.medium', 'Medium')}</SelectItem>
                          <SelectItem value="high">{t('annotations.high', 'High')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{t('annotations.by', 'Author')}</p>
                      <span className="text-xs font-bold text-slate-300">
                        {selectedAnnotation.created_by_user?.display_name || t('annotations.systemUser', 'System User')}
                      </span>
                    </div>
                    {teamMembers.length > 0 && (
                      <div className="col-span-2">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{t('annotations.assignee', 'Assignee')}</p>
                        <Select value={selectedAnnotation.assignee_id || 'unassigned'} onValueChange={(v) => handleAssigneeChange(selectedAnnotation, v === 'unassigned' ? undefined : v)}>
                          <SelectTrigger className="h-9 bg-[#1C2A31] border-white/5 text-white text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">{t('annotations.unassigned', 'Unassigned')}</SelectItem>
                            {teamMembers.map(m => (
                              <SelectItem key={m.user_id} value={m.user_id}>
                                {m.display_name || m.user_id.slice(0, 8)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedAnnotation(null)}
                    className="w-full h-12 rounded-xl bg-white/5 border border-white/5 text-[12px] font-black uppercase tracking-widest text-slate-400"
                  >
                    {t('common.close', 'Close')}
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileAppLayout>
  )
}
