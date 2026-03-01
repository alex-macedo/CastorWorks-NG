import { useCallback, useMemo, useState } from 'react'
import { format, differenceInDays } from 'date-fns'
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  MessageSquarePlus,
  OctagonAlert,
  Plus,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { useLocalization } from '@/contexts/LocalizationContext'
import { cn } from '@/lib/utils'
import type { ClientDefinition, ClientDefinitionStatus } from '@/types/timeline'

type FilterStatus = 'all' | 'pending' | 'overdue' | 'blocking' | 'completed'

interface ClientDefinitionsPanelProps {
  definitions: ClientDefinition[]
  isLoading?: boolean
  onAddDefinition?: () => void
  onSelectDefinition?: (definitionId: string) => void
  onLogFollowUp?: (definitionId: string, note: string) => void
  onUpdateStatus?: (definitionId: string, status: ClientDefinitionStatus) => void
  className?: string
}

function getStatusColor(status: ClientDefinitionStatus): string {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    case 'overdue':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-300'
    case 'blocking':
      return 'border-red-500/40 bg-red-500/10 text-red-300'
    case 'in_progress':
      return 'border-sky-500/40 bg-sky-500/10 text-sky-300'
    default:
      return 'border-slate-500/40 bg-slate-500/10 text-slate-300'
  }
}

function getStatusIcon(status: ClientDefinitionStatus) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className='h-3 w-3' />
    case 'overdue':
      return <Clock className='h-3 w-3' />
    case 'blocking':
      return <OctagonAlert className='h-3 w-3' />
    case 'in_progress':
      return <CalendarClock className='h-3 w-3' />
    default:
      return <AlertCircle className='h-3 w-3' />
  }
}

function getDaysLabel(
  definition: ClientDefinition,
  t: (key: string, options?: any) => string
): { text: string; className: string } | null {
  if (definition.status === 'completed') return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(definition.requiredByDate)
  dueDate.setHours(0, 0, 0, 0)
  const diff = differenceInDays(dueDate, today)

  if (diff < 0) {
    return {
      text: t('timeline.clientDefinitions.daysOverdue', { days: Math.abs(diff) }),
      className: 'text-red-400',
    }
  }
  if (diff === 0) {
    return {
      text: t('timeline.clientDefinitions.dueToday'),
      className: 'text-amber-400',
    }
  }
  return {
    text: t('timeline.clientDefinitions.daysRemaining', { days: diff }),
    className: 'text-slate-400',
  }
}

export function ClientDefinitionsPanel({
  definitions,
  isLoading,
  onAddDefinition,
  onSelectDefinition,
  onLogFollowUp,
  onUpdateStatus,
  className,
}: ClientDefinitionsPanelProps) {
  const { t } = useLocalization()
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')
  const [followUpId, setFollowUpId] = useState<string | null>(null)
  const [followUpNote, setFollowUpNote] = useState('')

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const isPastDue = useCallback(
    (d: ClientDefinition) => {
      if (d.status === 'completed') return false
      const due = new Date(d.requiredByDate)
      due.setHours(0, 0, 0, 0)
      return due < today
    },
    [today]
  )

  const filteredDefinitions = definitions.filter((d) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'pending') return d.status === 'pending' || d.status === 'in_progress'
    if (activeFilter === 'overdue') return isPastDue(d)
    return d.status === activeFilter
  })

  const sortedDefinitions = [...filteredDefinitions].sort((a, b) => {
    // Blocking first, then past-due/overdue, then by status, then by date
    const statusWeight: Record<ClientDefinitionStatus, number> = {
      blocking: 0,
      overdue: 1,
      in_progress: 2,
      pending: 3,
      completed: 4,
    }
    const aPastDue = isPastDue(a)
    const bPastDue = isPastDue(b)
    if (aPastDue && !bPastDue) return -1
    if (!aPastDue && bPastDue) return 1
    const weightDiff = statusWeight[a.status] - statusWeight[b.status]
    if (weightDiff !== 0) return weightDiff

    return new Date(a.requiredByDate).getTime() - new Date(b.requiredByDate).getTime()
  })

  const counts = useMemo(
    () => ({
      overdue: definitions.filter((d) => d.status === 'overdue').length,
      pastDue: definitions.filter((d) => isPastDue(d)).length,
      blocking: definitions.filter((d) => d.status === 'blocking').length,
      completed: definitions.filter((d) => d.status === 'completed').length,
    }),
    [definitions, isPastDue]
  )

  const handleFollowUpSubmit = (definitionId: string) => {
    if (!followUpNote.trim() || !onLogFollowUp) return
    onLogFollowUp(definitionId, followUpNote.trim())
    setFollowUpNote('')
    setFollowUpId(null)
  }

  const filters: { key: FilterStatus; label: string; count?: number }[] = [
    { key: 'all', label: t('timeline.clientDefinitions.filterAll') },
    { key: 'pending', label: t('timeline.clientDefinitions.filterPending') },
    { key: 'overdue', label: t('timeline.clientDefinitions.filterOverdue'), count: counts.pastDue },
    { key: 'blocking', label: t('timeline.clientDefinitions.filterBlocking'), count: counts.blocking },
    { key: 'completed', label: t('timeline.clientDefinitions.filterCompleted') },
  ]

  return (
    <Card
      className={cn(
        'flex h-full min-h-0 flex-col border-border bg-card text-card-foreground dark:border-slate-700/70 dark:bg-slate-900/95 dark:text-slate-100',
        className
      )}
      data-testid='client-definitions-panel'
    >
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2 text-base'>
            <ClipboardList className='h-4 w-4 text-blue-400' />
            {t('timeline.clientDefinitions.title')}
          </CardTitle>

          {onAddDefinition && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-7 gap-1 text-xs text-blue-400 hover:bg-blue-500/10 hover:text-blue-300'
              onClick={onAddDefinition}
              data-testid='add-definition-button'
            >
              <Plus className='h-3.5 w-3.5' />
              {t('timeline.clientDefinitions.addDefinition')}
            </Button>
          )}
        </div>

        {/* Summary badges */}
        {definitions.length > 0 && (
          <div className='mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]'>
            <span className='text-muted-foreground dark:text-slate-400'>
              {t('timeline.clientDefinitions.totalDefinitions', { count: definitions.length })}
            </span>
            {counts.pastDue > 0 && (
              <Badge className='border border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-300'>
                {t('timeline.clientDefinitions.overdueCount', { count: counts.pastDue })}
              </Badge>
            )}
            {counts.blocking > 0 && (
              <Badge className='border border-red-500/40 bg-red-500/10 text-[10px] text-red-300'>
                {t('timeline.clientDefinitions.blockingCount', { count: counts.blocking })}
              </Badge>
            )}
          </div>
        )}

        {/* Filter chips */}
        {definitions.length > 0 && (
          <div className='mt-2 flex flex-wrap gap-1'>
            {filters.map((filter) => (
              <button
                type='button'
                key={filter.key}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                  activeFilter === filter.key
                    ? 'border-blue-500/40 bg-blue-500/20 text-blue-300'
                    : 'border-slate-600/40 bg-transparent text-slate-400 hover:border-slate-500/60 hover:text-slate-300'
                )}
                onClick={() => setActiveFilter(filter.key)}
              >
                {filter.label}
                {filter.count != null && filter.count > 0 && (
                  <span className='ml-1 text-[10px] opacity-70'>({filter.count})</span>
                )}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className='flex-1 min-h-0 overflow-hidden p-3 pt-0'>
        {isLoading ? (
          <div className='text-sm text-muted-foreground dark:text-slate-400'>
            {t('timeline.loadingProjects')}
          </div>
        ) : sortedDefinitions.length === 0 ? (
          <div className='flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground dark:text-slate-400'>
            <ClipboardList className='h-8 w-8 opacity-40' />
            {t('timeline.clientDefinitions.noDefinitions')}
          </div>
        ) : (
          <ScrollArea className='flex-1'>
            <div className='space-y-2 pr-2'>
              {sortedDefinitions.map((definition) => {
                const daysLabel = getDaysLabel(definition, t)
                const isFollowUpOpen = followUpId === definition.id

                return (
                  <div
                    key={definition.id}
                    data-testid={`definition-row-${definition.id}`}
                    className={cn(
                      'rounded-lg border p-3 transition-colors',
                      'border-border bg-muted/30 dark:border-slate-700/70 dark:bg-slate-900/80',
                      definition.status === 'blocking' && 'border-red-500/30 dark:border-red-700/40',
                      (definition.status === 'overdue' || isPastDue(definition)) &&
                        'border-amber-500/30 dark:border-amber-700/40'
                    )}
                  >
                    {/* Header: title + status badge */}
                    <div className='flex items-start justify-between gap-2'>
                      <button
                        type='button'
                        className='flex-1 text-left'
                        onClick={() => onSelectDefinition?.(definition.id)}
                      >
                        <p className='line-clamp-2 text-sm font-medium'>{definition.definitionItem}</p>
                        {definition.assignedClientContact && (
                          <p className='mt-0.5 text-xs text-muted-foreground dark:text-slate-400'>
                            {definition.assignedClientContact}
                          </p>
                        )}
                      </button>

                      <Badge className={cn('shrink-0 border text-[10px]', getStatusColor(definition.status))}>
                        {getStatusIcon(definition.status)}
                        <span className='ml-1'>
                          {t(`timeline.clientDefinitions.statuses.${definition.status}`)}
                        </span>
                      </Badge>
                    </div>

                    {/* Metadata row: date, impact score, days label */}
                    <div className='mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground dark:text-slate-400'>
                      <span>
                        {t('timeline.clientDefinitions.requiredBy')}: {format(new Date(definition.requiredByDate), 'dd/MM/yyyy')}
                      </span>

                      {definition.impactScore > 0 && (
                        <span
                          className={cn(
                            'font-medium',
                            definition.impactScore >= 80
                              ? 'text-red-400'
                              : definition.impactScore >= 50
                                ? 'text-amber-400'
                                : 'text-slate-400'
                          )}
                        >
                          {t('timeline.clientDefinitions.impactScore')}: {definition.impactScore}
                        </span>
                      )}

                      {daysLabel && <span className={daysLabel.className}>{daysLabel.text}</span>}
                    </div>

                    {/* Action buttons */}
                    <div className='mt-2 flex items-center gap-1'>
                      {/* Quick status update to complete */}
                      {definition.status !== 'completed' && onUpdateStatus && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-6 gap-1 px-2 text-[11px] text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300'
                          onClick={() => onUpdateStatus(definition.id, 'completed')}
                          data-testid={`complete-definition-${definition.id}`}
                        >
                          <CheckCircle2 className='h-3 w-3' />
                        </Button>
                      )}

                      {/* Follow-up */}
                      {onLogFollowUp && (
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100'
                          onClick={() => setFollowUpId(isFollowUpOpen ? null : definition.id)}
                          data-testid={`follow-up-${definition.id}`}
                        >
                          <MessageSquarePlus className='h-3 w-3' />
                          <span>{t('timeline.clientDefinitions.followUp')}</span>
                        </Button>
                      )}

                      {/* Follow-up count */}
                      {definition.followUpHistory.length > 0 && (
                        <span className='ml-auto text-[10px] text-slate-500'>
                          {t('timeline.clientDefinitions.followUpCount', {
                            count: definition.followUpHistory.length,
                          })}
                        </span>
                      )}
                    </div>

                    {/* Inline follow-up form */}
                    {isFollowUpOpen && (
                      <div className='mt-2 flex gap-2'>
                        <Textarea
                          value={followUpNote}
                          onChange={(e) => setFollowUpNote(e.target.value)}
                          placeholder={t('timeline.clientDefinitions.followUpPlaceholder')}
                          className='min-h-[60px] flex-1 resize-none bg-slate-800/50 text-xs'
                          data-testid={`follow-up-input-${definition.id}`}
                        />
                        <Button
                          type='button'
                          size='sm'
                          className='h-auto self-end bg-blue-600 px-3 text-xs hover:bg-blue-700'
                          disabled={!followUpNote.trim()}
                          onClick={() => handleFollowUpSubmit(definition.id)}
                          data-testid={`follow-up-submit-${definition.id}`}
                        >
                          {t('timeline.clientDefinitions.followUp')}
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
