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
import { useStakeholders, Stakeholder } from '@/hooks/useStakeholders'

type FilterType = 'all' | 'client' | 'contractor' | 'consultant' | 'team'

export default function AppContacts() {
  const { t } = useTranslation('app')
  const navigate = useNavigate()
  const { selectedProject } = useAppProject()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [selectedContact, setSelectedContact] = useState<Stakeholder | null>(null)

  const { stakeholders, isLoading, updateLastContact } = useStakeholders(selectedProject?.id)

  const filteredContacts = useMemo(() => {
    let filtered = stakeholders

    if (activeFilter !== 'all') {
      filtered = filtered.filter(c => c.stakeholder_type === activeFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.role.toLowerCase().includes(query) ||
        (c.company || '').toLowerCase().includes(query)
      )
    }

    return filtered
  }, [stakeholders, activeFilter, searchQuery])

  const getTypeIcon = (type: Stakeholder['stakeholder_type']) => {
    switch (type) {
      case 'client': return 'person'
      case 'contractor': return 'construction'
      case 'supplier': return 'local_shipping'
      case 'consultant': return 'psychology'
      case 'team': return 'groups'
      default: return 'person'
    }
  }

  const getTypeStyle = (type: Stakeholder['stakeholder_type']) => {
    switch (type) {
      case 'client': return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
      case 'contractor': return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
      case 'supplier': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
      case 'consultant': return 'text-purple-400 bg-purple-400/10 border-purple-400/20'
      case 'team': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
    }
  }

  const getTypeLabel = (type: Stakeholder['stakeholder_type']) => {
    switch (type) {
      case 'client': return t('contacts.client', 'Client')
      case 'contractor': return t('contacts.contractor', 'Contractor')
      case 'supplier': return t('contacts.supplier', 'Supplier')
      case 'consultant': return t('contacts.consultant', 'Consultant')
      case 'team': return t('contacts.team', 'Team')
      default: return type
    }
  }

  const formatLastContact = (dateStr: string | null) => {
    if (!dateStr) return t('contacts.noRecentContact', 'No recent contact')
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return t('contacts.today', 'Today')
    if (diffDays === 1) return t('contacts.yesterday', 'Yesterday')
    if (diffDays < 7) return `${diffDays} ${t('contacts.daysAgo', 'days ago')}`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const handleCall = (phone: string) => {
    const link = document.createElement('a')
    link.href = `tel:${phone}`
    link.click()
  }

  const handleEmail = (email: string) => {
    const link = document.createElement('a')
    link.href = `mailto:${email}`
    link.click()
  }

  const handleMessage = (phone: string) => {
    const link = document.createElement('a')
    link.href = `sms:${phone}`
    link.click()
  }

  if (isLoading) {
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
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-slate-400"
            >
              <span className="material-symbols-outlined !text-2xl">chevron_left</span>
            </button>

            <h1 className="text-lg font-bold">{t('contacts.stakeholdersTitle', 'Stakeholders')}</h1>

            <button className="size-10 rounded-full bg-amber-400 text-black flex items-center justify-center active:scale-95 transition-transform">
              <span className="material-symbols-outlined !text-xl">person_add</span>
            </button>
          </div>

          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 bg-[#121619] rounded-xl px-4 py-3 border border-white/5 focus-within:border-amber-400/30 transition-all">
              <span className="material-symbols-outlined text-slate-500 !text-xl">search</span>
              <input
                className="bg-transparent border-none focus:outline-none text-sm w-full text-white placeholder:text-slate-600 font-medium"
                placeholder={t('contacts.searchPlaceholder', 'Search contacts...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-500">
                  <span className="material-symbols-outlined !text-lg">close</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide">
            {(['all', 'client', 'contractor', 'consultant', 'team'] as FilterType[]).map(filter => (
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
                {filter === 'all' ? t('contacts.all', 'All') : getTypeLabel(filter)}
              </button>
            ))}
          </div>
        </header>

        <main className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: t('contacts.total', 'Total'), value: stakeholders.length, color: 'text-white' },
              { label: t('contacts.clients', 'Clients'), value: stakeholders.filter(c => c.stakeholder_type === 'client').length, color: 'text-amber-400' },
              { label: t('contacts.contractors', 'Contractors'), value: stakeholders.filter(c => c.stakeholder_type === 'contractor').length, color: 'text-blue-400' },
              { label: t('contacts.consultants', 'Consultants'), value: stakeholders.filter(c => c.stakeholder_type === 'consultant').length, color: 'text-purple-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-[#121619] rounded-xl p-3 border border-white/5 text-center">
                <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {filteredContacts.length} {t('contacts.contacts', 'Contacts')}
              </p>
            </div>

            {filteredContacts.length === 0 ? (
              <div className="bg-[#1a2632] rounded-2xl p-8 border border-white/5 text-center">
                <div className="size-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-slate-500 !text-3xl">person_off</span>
                </div>
                <h3 className="text-lg font-bold mb-1">{t('contacts.noContacts', 'No contacts found')}</h3>
                <p className="text-sm text-slate-500">{t('contacts.tryDifferent', 'Try a different search')}</p>
              </div>
            ) : (
              filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className="w-full bg-[#1a2632] rounded-2xl p-4 border border-white/5 text-left active:scale-[0.98] transition-all cursor-pointer"
                >
                  <div className="flex gap-3">
                    <div className="relative">
                      <div className={cn(
                        "size-12 rounded-xl flex items-center justify-center border text-sm font-bold",
                        getTypeStyle(contact.stakeholder_type)
                      )}>
                        {contact.name.slice(0, 2).toUpperCase()}
                      </div>
                      {contact.is_lead && (
                        <div className="absolute -top-1 -right-1 size-5 bg-amber-400 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-black !text-[12px]">star</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-white text-sm truncate">{contact.name}</h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border",
                          getTypeStyle(contact.stakeholder_type)
                        )}>
                          {getTypeLabel(contact.stakeholder_type)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{contact.role}{contact.company ? ` • ${contact.company}` : ''}</p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        {t('contacts.lastContact', 'Last contact')}: {formatLastContact(contact.last_contact_date)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {contact.phone && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCall(contact.phone!); updateLastContact.mutate(contact.id) }}
                          className="size-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 active:scale-90 transition-transform"
                        >
                          <span className="material-symbols-outlined !text-lg">call</span>
                        </button>
                      )}
                      {contact.phone && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMessage(contact.phone!) }}
                          className="size-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 active:scale-90 transition-transform"
                        >
                          <span className="material-symbols-outlined !text-lg">chat</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        </main>

        <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
          <DialogContent className="bg-[#121619] border-white/10 text-white max-w-md">
            {selectedContact && (
              <>
                <DialogHeader className="pb-4 border-b border-white/5">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "size-16 rounded-2xl flex items-center justify-center border text-lg font-bold",
                      getTypeStyle(selectedContact.stakeholder_type)
                    )}>
                      {selectedContact.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <DialogTitle className="text-xl font-bold">{selectedContact.name}</DialogTitle>
                        {selectedContact.is_lead && (
                          <span className="material-symbols-outlined text-amber-400 !text-lg">star</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400">{selectedContact.role}</p>
                      {selectedContact.company && <p className="text-xs text-slate-500">{selectedContact.company}</p>}
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-3">
                    {selectedContact.phone && (
                      <button
                        onClick={() => { handleCall(selectedContact.phone!); updateLastContact.mutate(selectedContact.id) }}
                        className="w-full flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10 active:scale-[0.98] transition-all"
                      >
                        <span className="material-symbols-outlined text-emerald-400">call</span>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">{selectedContact.phone}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{t('contacts.phoneLabel', 'Phone')}</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-600">chevron_right</span>
                      </button>
                    )}

                    <button
                      onClick={() => { handleEmail(selectedContact.email); updateLastContact.mutate(selectedContact.id) }}
                      className="w-full flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10 active:scale-[0.98] transition-all"
                    >
                      <span className="material-symbols-outlined text-blue-400">mail</span>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium truncate">{selectedContact.email}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{t('contacts.email', 'Email')}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-600">chevron_right</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {selectedContact.phone && (
                      <button
                        onClick={() => { handleCall(selectedContact.phone!); updateLastContact.mutate(selectedContact.id) }}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-emerald-400 !text-2xl">call</span>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">{t('contacts.call', 'Call')}</span>
                      </button>
                    )}
                    {selectedContact.phone && (
                      <button
                        onClick={() => handleMessage(selectedContact.phone!)}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-blue-400 !text-2xl">sms</span>
                        <span className="text-[10px] font-bold text-blue-400 uppercase">{t('contacts.text', 'Text')}</span>
                      </button>
                    )}
                    <button
                      onClick={() => { handleEmail(selectedContact.email); updateLastContact.mutate(selectedContact.id) }}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-purple-400 !text-2xl">mail</span>
                      <span className="text-[10px] font-bold text-purple-400 uppercase">{t('contacts.email', 'Email')}</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{t('contacts.lastContact', 'Last Contact')}</p>
                    <p className="text-sm text-slate-300">{formatLastContact(selectedContact.last_contact_date)}</p>
                  </div>

                  {selectedContact.notes && (
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{t('contacts.notes', 'Notes')}</p>
                      <p className="text-sm text-slate-300">{selectedContact.notes}</p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/5">
                  <button
                    onClick={() => setSelectedContact(null)}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl font-bold text-slate-300"
                  >
                    {t('common.close', 'Close')}
                  </button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileAppLayout>
  )
}
