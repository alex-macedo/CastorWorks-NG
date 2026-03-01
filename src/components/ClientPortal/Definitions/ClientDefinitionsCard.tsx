import { useMemo } from 'react'
import { format, differenceInDays } from 'date-fns'
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  OctagonAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ClientPortalPageHeader } from '@/components/ClientPortal/Layout/ClientPortalPageHeader'
import { useClientDefinitions } from '@/hooks/useClientDefinitions'
import { useLocalization } from '@/contexts/LocalizationContext'
import { cn } from '@/lib/utils'
import type { ClientDefinition, ClientDefinitionStatus } from '@/types/timeline'

interface ClientDefinitionsCardProps {
  projectId: string | undefined
  readOnly?: boolean
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
  t: (key: string, defaultValueOrVariables?: string | Record<string, string | number>, variables?: Record<string, string | number>) => string
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

export function ClientDefinitionsCard({
  projectId,
  readOnly = true,
}: ClientDefinitionsCardProps) {
  const { t } = useLocalization()
  const { data: definitions = [], isLoading } = useClientDefinitions(projectId)

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const isPastDue = (d: ClientDefinition) => {
    if (d.status === 'completed') return false
    const due = new Date(d.requiredByDate)
    due.setHours(0, 0, 0, 0)
    return due < today
  }

  const sortedDefinitions = [...definitions].sort((a, b) => {
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

  const counts = useMemo(() => {
    const todayNorm = new Date()
    todayNorm.setHours(0, 0, 0, 0)
    const pastDue = (d: ClientDefinition) => {
      if (d.status === 'completed') return false
      const due = new Date(d.requiredByDate)
      due.setHours(0, 0, 0, 0)
      return due < todayNorm
    }
    return {
      overdue: definitions.filter(pastDue).length,
      blocking: definitions.filter((d) => d.status === 'blocking').length,
      completed: definitions.filter((d) => d.status === 'completed').length,
    }
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [definitions])

  return (
    <div className='space-y-6'>
      <ClientPortalPageHeader
        title={t('clientPortal.definitions.title')}
        subtitle={t('clientPortal.definitions.subtitle')}
      />

      <Card className='border-border bg-card text-card-foreground'>
        <CardHeader className='pb-2'>
          <CardTitle className='flex items-center gap-2 text-base'>
            <ClipboardList className='h-4 w-4 text-blue-400' />
            {t('timeline.clientDefinitions.title')}
          </CardTitle>

          {definitions.length > 0 && (
            <div className='mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]'>
              <span className='text-muted-foreground dark:text-slate-400'>
                {t('timeline.clientDefinitions.totalDefinitions', {
                  count: definitions.length,
                })}
              </span>
              {counts.overdue > 0 && (
                <Badge className='border border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-300'>
                  {t('timeline.clientDefinitions.overdueCount', { count: counts.overdue })}
                </Badge>
              )}
              {counts.blocking > 0 && (
                <Badge className='border border-red-500/40 bg-red-500/10 text-[10px] text-red-300'>
                  {t('timeline.clientDefinitions.blockingCount', { count: counts.blocking })}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className='text-sm text-muted-foreground'>
              {t('timeline.loadingProjects')}
            </p>
          ) : sortedDefinitions.length === 0 ? (
            <div className='flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground'>
              <ClipboardList className='h-8 w-8 opacity-40' />
              {t('clientPortal.definitions.noDefinitions')}
            </div>
          ) : (
            <ScrollArea className='max-h-[480px]'>
              <div className='space-y-3 pr-2'>
                {sortedDefinitions.map((definition) => {
                  const daysLabel = getDaysLabel(definition, t)
                  return (
                    <div
                      key={definition.id}
                      data-testid={`definition-row-${definition.id}`}
                      className={cn(
                        'rounded-lg border p-3',
                        'border-border bg-muted/30 dark:border-slate-700/70 dark:bg-slate-900/80',
                        definition.status === 'blocking' &&
                          'border-red-500/30 dark:border-red-700/40',
                        (definition.status === 'overdue' || isPastDue(definition)) &&
                          'border-amber-500/30 dark:border-amber-700/40'
                      )}
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-w-0 flex-1'>
                          <p className='line-clamp-2 text-sm font-medium'>
                            {definition.definitionItem}
                          </p>
                          {definition.description && (
                            <p className='mt-0.5 line-clamp-2 text-xs text-muted-foreground'>
                              {definition.description}
                            </p>
                          )}
                          {definition.assignedClientContact && (
                            <p className='mt-0.5 text-xs text-muted-foreground'>
                              {definition.assignedClientContact}
                            </p>
                          )}
                        </div>
                        <Badge
                          className={cn(
                            'shrink-0 border text-[10px]',
                            getStatusColor(definition.status)
                          )}
                        >
                          {getStatusIcon(definition.status)}
                          <span className='ml-1'>
                            {t(
                              `timeline.clientDefinitions.statuses.${definition.status}`
                            )}
                          </span>
                        </Badge>
                      </div>
                      <div className='mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
                        <span>
                          {t('timeline.clientDefinitions.requiredBy')}:{' '}
                          {format(
                            new Date(definition.requiredByDate),
                            'dd/MM/yyyy'
                          )}
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
                            {t('timeline.clientDefinitions.impactScore')}:{' '}
                            {definition.impactScore}
                          </span>
                        )}
                        {daysLabel && (
                          <span className={daysLabel.className}>
                            {daysLabel.text}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
