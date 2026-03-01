import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppProject } from '@/contexts/AppProjectContext'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useProjectEmails, ProjectEmail } from '@/hooks/useProjectEmails'
import { useStakeholders } from '@/hooks/useStakeholders'

const REPORT_TEMPLATES = [
  { id: 'weekly', icon: 'calendar_month', label: 'Weekly Update', desc: 'Progress & photos' },
  { id: 'monthly', icon: 'summarize', label: 'Monthly Report', desc: 'Full analysis' },
  { id: 'milestone', icon: 'flag', label: 'Milestone Alert', desc: 'Achievement notice' },
  { id: 'custom', icon: 'edit_note', label: 'Custom Email', desc: 'Free-form message' },
]

type FilterType = 'all' | 'draft' | 'scheduled' | 'sent'

// Map DB status + scheduled_for to a display status
function getDisplayStatus(email: ProjectEmail): FilterType {
  if (email.status === 'sent') return 'sent'
  if (email.scheduled_for && new Date(email.scheduled_for) > new Date()) return 'scheduled'
  return 'draft'
}

export default function AppEmailReview() {
  const { t } = useTranslation('app')
  const navigate = useNavigate()
  const { selectedProject } = useAppProject()
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [showCompose, setShowCompose] = useState(false)
  const [showPreview, setShowPreview] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>('weekly')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  // Track which stakeholders are selected as recipients (by id)
  const [selectedStakeholderIds, setSelectedStakeholderIds] = useState<Set<string>>(new Set())

  const { emails, isLoading: emailsLoading, sendEmail } = useProjectEmails(selectedProject?.id)
  const { stakeholders, isLoading: stakeholdersLoading } = useStakeholders(selectedProject?.id)

  const filteredEmails = useMemo(() => {
    if (activeFilter === 'all') return emails
    return emails.filter(e => getDisplayStatus(e) === activeFilter)
  }, [emails, activeFilter])

  const selectedRecipients = useMemo(
    () => stakeholders.filter(s => selectedStakeholderIds.has(s.id)),
    [stakeholders, selectedStakeholderIds]
  )

  // Build a map of email → name for displaying recipients in the list
  const emailToName = useMemo(() => {
    const map = new Map<string, string>()
    stakeholders.forEach(s => map.set(s.email, s.name))
    return map
  }, [stakeholders])

  const resolveRecipientNames = (emails: string[]) =>
    emails.map(e => emailToName.get(e) || e)

  const toggleStakeholder = (id: string) => {
    setSelectedStakeholderIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const handleSend = async () => {
    if (selectedRecipients.length === 0) return

    const recipientEmails = selectedRecipients.map(s => s.email)
    const subject = emailSubject || `${selectedProject?.name || 'Project'} Update`

    sendEmail.mutate(
      { recipients: recipientEmails, subject, body: emailBody },
      {
        onSuccess: () => {
          setShowCompose(false)
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
          setEmailSubject('')
          setEmailBody('')
          setSelectedStakeholderIds(new Set())
        },
      }
    )
  }

  const getStatusIcon = (status: FilterType) => {
    switch (status) {
      case 'sent': return 'check_circle'
      case 'scheduled': return 'schedule'
      case 'draft': return 'edit'
      default: return 'mail'
    }
  }

  const getStatusStyle = (status: FilterType) => {
    switch (status) {
      case 'sent': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
      case 'scheduled': return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
      case 'draft': return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return t('email.today', 'Today')
    if (diffDays === 1) return t('email.yesterday', 'Yesterday')
    if (diffDays < 7) return `${diffDays}d ${t('email.ago', 'ago')}`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const previewEmail = emails.find(e => e.id === showPreview)

  if (emailsLoading) {
    return (
      <MobileAppLayout showProjectSelector>
        <div className="bg-black min-h-screen text-white flex items-center justify-center">
          <div className="text-center">
            <div className="size-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">{t('common.loading', 'Loading...')}</p>
          </div>
        </div>
      </MobileAppLayout>
    )
  }

  return (
    <MobileAppLayout showProjectSelector>
      <div className="bg-black min-h-screen text-white pb-32">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-slate-400"
            >
              <span className="material-symbols-outlined !text-2xl">chevron_left</span>
            </button>

            <h1 className="text-lg font-bold">{t('email.title', 'Review Email')}</h1>

            <button
              onClick={() => setShowCompose(true)}
              className="size-10 rounded-full bg-amber-400 text-black flex items-center justify-center active:scale-95 transition-transform"
            >
              <span className="material-symbols-outlined !text-xl">add</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide">
            {(['all', 'draft', 'scheduled', 'sent'] as FilterType[]).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                  activeFilter === filter
                    ? "bg-amber-400 text-black"
                    : "bg-white/5 text-slate-400 border border-white/10"
                )}
              >
                {filter === 'all' ? t('email.all', 'All') : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed top-20 left-4 right-4 z-50 animate-in slide-in-from-top duration-300">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-400">check_circle</span>
              <p className="text-emerald-400 font-bold text-sm">{t('email.sentSuccess', 'Email sent successfully!')}</p>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="px-4 py-4 space-y-4">
          {/* Automated Dispatch Card */}
          <section className="bg-gradient-to-br from-[#121619] to-[#0A0D0F] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
                <span className="material-symbols-outlined !text-2xl">schedule_send</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-amber-400 !text-[14px]">auto_awesome</span>
                  <span className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em]">
                    {t('email.automatedDispatch', 'Automated Dispatch')}
                  </span>
                </div>
                <h3 className="text-base font-bold mb-2">{t('email.weeklyReport', 'Weekly Progress Report')}</h3>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {stakeholders.slice(0, 3).map((s) => (
                      <div key={s.id} className="size-6 rounded-full bg-slate-700 border-2 border-black flex items-center justify-center text-[9px] font-bold">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                    ))}
                    {stakeholders.length > 3 && (
                      <div className="size-6 rounded-full bg-slate-600 border-2 border-black flex items-center justify-center text-[9px] font-bold">
                        +{stakeholders.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold">
                    {stakeholders.length} {t('email.stakeholders', 'stakeholders')}
                  </span>
                </div>
              </div>
              <button className="text-amber-400">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </section>

          {/* Email List */}
          <section className="space-y-3">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              {t('email.recentEmails', 'Recent Emails')}
            </p>

            {filteredEmails.length === 0 ? (
              <div className="bg-[#1a2632] rounded-2xl p-8 border border-white/5 text-center">
                <div className="size-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-slate-500 !text-3xl">mail</span>
                </div>
                <h3 className="text-lg font-bold mb-1">{t('email.noEmails', 'No emails')}</h3>
                <p className="text-sm text-slate-500">{t('email.startComposing', 'Start composing a report')}</p>
              </div>
            ) : (
              filteredEmails.map(email => {
                const displayStatus = getDisplayStatus(email)
                return (
                  <button
                    key={email.id}
                    onClick={() => setShowPreview(email.id)}
                    className="w-full bg-[#1a2632] rounded-2xl p-4 border border-white/5 text-left active:scale-[0.98] transition-all"
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        "size-11 rounded-xl flex items-center justify-center shrink-0 border",
                        getStatusStyle(displayStatus)
                      )}>
                        <span className="material-symbols-outlined !text-xl">
                          {getStatusIcon(displayStatus)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-bold text-white text-sm truncate">{email.subject}</h3>
                          <span className="text-[10px] text-slate-500 font-medium shrink-0">
                            {email.sent_at ? formatDate(email.sent_at) : email.scheduled_for ? t('email.scheduled', 'Scheduled') : t('email.draft', 'Draft')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-2">{resolveRecipientNames(email.recipients).join(', ')}</p>
                        <p className="text-sm text-slate-400 line-clamp-1">{email.body}</p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </section>
        </main>

        {/* Compose Dialog */}
        <Dialog open={showCompose} onOpenChange={setShowCompose}>
          <DialogContent className="bg-[#121619] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">mail</span>
                {t('email.compose', 'Compose Email')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* Report Type Selection */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {t('email.reportType', 'Report Type')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {REPORT_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={cn(
                        "p-3 rounded-xl border transition-all text-left",
                        selectedTemplate === template.id
                          ? "bg-amber-400/10 border-amber-400/30"
                          : "bg-white/5 border-white/10"
                      )}
                    >
                      <span className={cn(
                        "material-symbols-outlined !text-xl mb-1",
                        selectedTemplate === template.id ? "text-amber-400" : "text-slate-500"
                      )}>{template.icon}</span>
                      <p className="text-xs font-bold">{template.label}</p>
                      <p className="text-[10px] text-slate-500">{template.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipients from stakeholders */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {t('email.recipients', 'Recipients')}
                </p>
                {stakeholdersLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="size-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : stakeholders.length === 0 ? (
                  <p className="text-sm text-slate-500 py-2">{t('email.noStakeholders', 'No stakeholders available')}</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {stakeholders.map(stakeholder => {
                      const isSelected = selectedStakeholderIds.has(stakeholder.id)
                      return (
                        <button
                          key={stakeholder.id}
                          onClick={() => toggleStakeholder(stakeholder.id)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl border transition-all",
                            isSelected
                              ? "bg-amber-400/10 border-amber-400/30"
                              : "bg-white/5 border-white/10"
                          )}
                        >
                          <div className={cn(
                            "size-8 rounded-full flex items-center justify-center text-xs font-bold",
                            isSelected ? "bg-amber-400 text-black" : "bg-slate-700 text-white"
                          )}>
                            {stakeholder.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-bold">{stakeholder.name}</p>
                            <p className="text-[10px] text-slate-500">{stakeholder.role}</p>
                          </div>
                          <span className={cn(
                            "material-symbols-outlined !text-xl",
                            isSelected ? "text-amber-400" : "text-slate-600"
                          )}>
                            {isSelected ? "check_circle" : "radio_button_unchecked"}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {t('email.subject', 'Subject')}
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder={`${selectedProject?.name || 'Project'} Update`}
                  className="w-full bg-[#0A0D0F] border border-white/10 rounded-xl p-3 text-sm placeholder:text-slate-600 focus:ring-1 focus:ring-amber-400 outline-none"
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {t('email.message', 'Message')}
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder={t('email.messagePlaceholder', 'Add additional notes for this report...')}
                  className="w-full bg-[#0A0D0F] border border-white/10 rounded-xl p-3 text-sm placeholder:text-slate-600 focus:ring-1 focus:ring-amber-400 outline-none min-h-[100px] resize-none"
                />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowCompose(false)}
                  className="h-12 bg-white/5 border border-white/10 rounded-xl font-bold text-slate-300 active:scale-95 transition-all"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleSend}
                  disabled={sendEmail.isPending || selectedRecipients.length === 0}
                  className="h-12 bg-amber-400 text-black font-bold rounded-xl shadow-lg shadow-amber-400/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendEmail.isPending ? (
                    <>
                      <div className="size-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      {t('email.sending', 'Sending...')}
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined !text-lg">send</span>
                      {t('email.send', 'Send')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
          <DialogContent className="bg-[#121619] border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {previewEmail?.subject}
              </DialogTitle>
            </DialogHeader>

            {previewEmail && (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase border",
                    getStatusStyle(getDisplayStatus(previewEmail))
                  )}>
                    {getDisplayStatus(previewEmail)}
                  </div>
                  <span className="text-sm text-slate-500">
                    {previewEmail.sent_at
                      ? `${t('email.sent', 'Sent')} ${formatDate(previewEmail.sent_at)}`
                      : previewEmail.scheduled_for
                        ? `${t('email.scheduledFor', 'Scheduled for')} ${new Date(previewEmail.scheduled_for).toLocaleDateString()}`
                        : t('email.draft', 'Draft')
                    }
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('email.recipients', 'Recipients')}</p>
                  <p className="text-sm text-slate-300">{resolveRecipientNames(previewEmail.recipients).join(', ')}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('email.message', 'Message')}</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{previewEmail.body}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button
                    onClick={() => setShowPreview(null)}
                    className="h-12 bg-white/5 border border-white/10 rounded-xl font-bold text-slate-300"
                  >
                    {t('common.close', 'Close')}
                  </button>
                  {getDisplayStatus(previewEmail) !== 'sent' && (
                    <button className="h-12 bg-amber-400 text-black font-bold rounded-xl">
                      {t('email.edit', 'Edit')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileAppLayout>
  )
}
