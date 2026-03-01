import { format } from 'date-fns'
import { AlertTriangle, MessageSquarePlus, Pin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLocalization } from '@/contexts/LocalizationContext'
import { cn } from '@/lib/utils'
import type { MilestoneData } from '@/types/timeline'

interface DeadlinesPanelProps {
  milestones: MilestoneData[]
  selectedMilestoneId: string | null
  phaseNameById?: Record<string, string>
  projectNameByMilestoneId?: Record<string, string>
  isLoading?: boolean
  titleKey?: string
  onSelectMilestone: (milestoneId: string) => void
  onAddComment?: (milestoneId: string, comment: string) => Promise<void> | void
  onDocumentDelay?: (milestoneId: string, milestoneName: string) => void
  delayCountByMilestone?: Record<string, number>
  className?: string
}

function getMilestoneStatusClass(status: MilestoneData['status']): string {
  switch (status) {
    case 'completed':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    case 'delayed':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-300'
    default:
      return 'border-slate-500/40 bg-slate-500/10 text-slate-300'
  }
}

export function DeadlinesPanel({
  milestones,
  selectedMilestoneId,
  phaseNameById,
  projectNameByMilestoneId,
  isLoading,
  titleKey = 'timeline.sidebar.upcomingDefinitions',
  onSelectMilestone,
  onAddComment,
  onDocumentDelay,
  delayCountByMilestone,
  className,
}: DeadlinesPanelProps) {
  const { t } = useLocalization()

  const selectedMilestone =
    milestones.find((milestone) => milestone.id === selectedMilestoneId) ?? milestones[0]

  const sortedMilestones = [...milestones].sort(
    (a, b) => a.targetDate.getTime() - b.targetDate.getTime()
  )

  return (
    <Card
      className={cn(
        'h-full min-h-0 border-border bg-card text-card-foreground dark:border-slate-700/70 dark:bg-slate-900/95 dark:text-slate-100',
        className
      )}
      data-testid='deadlines-panel'
    >
      <CardHeader className='pb-2'>
        <CardTitle className='flex items-center gap-2 text-base'>
          <Pin className='h-4 w-4 text-rose-400' />
          {t(titleKey)}
        </CardTitle>
      </CardHeader>

      <CardContent className='flex h-[calc(100%-4.5rem)] min-h-0 flex-col gap-3'>
        {isLoading ? (
          <div className='text-sm text-muted-foreground dark:text-slate-400'>
            {t('timeline.loadingProjects')}
          </div>
        ) : sortedMilestones.length === 0 ? (
          <div className='text-sm text-muted-foreground dark:text-slate-400'>
            {t('timeline.deadlines.noDeadlines')}
          </div>
        ) : (
          <>
            <ScrollArea className='flex-1'>
              <div className='space-y-2 pr-2'>
                {sortedMilestones.map((milestone) => {
                  const delayCount = delayCountByMilestone?.[milestone.id] ?? 0

                  return (
                    <button
                      key={milestone.id}
                      type='button'
                      onClick={() => onSelectMilestone(milestone.id)}
                      data-testid={`deadline-row-${milestone.id}`}
                      className={cn(
                        'w-full rounded-lg border p-3 text-left transition-colors',
                        'border-border bg-muted/30 hover:bg-muted/60 dark:border-slate-700/70 dark:bg-slate-900/80 dark:hover:bg-slate-800/80',
                        milestone.id === selectedMilestone?.id && 'border-sky-500/40 bg-sky-500/10 dark:bg-sky-950/20'
                      )}
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div>
                          <p className='line-clamp-2 text-sm font-medium'>
                            {milestone.name}
                          </p>
                          {projectNameByMilestoneId?.[milestone.id] && (
                            <p className='mt-1 text-xs text-muted-foreground dark:text-slate-400'>
                              {projectNameByMilestoneId[milestone.id]}
                            </p>
                          )}
                          {milestone.phaseId && phaseNameById?.[milestone.phaseId] && (
                            <p className='mt-1 text-xs text-muted-foreground dark:text-slate-400'>
                              {phaseNameById[milestone.phaseId]}
                            </p>
                          )}
                        </div>
                        <div className='flex items-center gap-1.5'>
                          {delayCount > 0 && (
                            <Badge
                              className='border border-amber-500/40 bg-amber-500/10 text-[11px] text-amber-300'
                              data-testid={`delay-count-${milestone.id}`}
                            >
                              <AlertTriangle className='mr-0.5 h-3 w-3' />
                              {delayCount}
                            </Badge>
                          )}
                          <Badge className={cn('border text-[11px]', getMilestoneStatusClass(milestone.status))}>
                            {t(`timeline.milestones.${milestone.status}`)}
                          </Badge>
                        </div>
                      </div>

                      <div className='mt-3 flex items-center justify-between gap-2'>
                        <div className='text-xs text-muted-foreground dark:text-slate-400'>
                          <span className='text-amber-300'>•</span>{' '}
                          {t('timeline.deadlines.deadline')} {format(milestone.targetDate, 'dd/MM/yyyy')}
                        </div>

                        <div className='flex items-center gap-1'>
                          {milestone.status === 'delayed' && onDocumentDelay && (
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              data-testid={`document-delay-${milestone.id}`}
                              className='h-7 w-7 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300'
                              onClick={(event) => {
                                event.stopPropagation()
                                onDocumentDelay(milestone.id, milestone.name)
                              }}
                              title={t('timeline.delays.addDelay')}
                            >
                              <AlertTriangle className='h-4 w-4' />
                            </Button>
                          )}
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            data-testid={`deadline-comment-${milestone.id}`}
                            className='h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-slate-100'
                            onClick={(event) => {
                              event.stopPropagation()
                              if (!onAddComment) return
                              const input = window.prompt(t('timeline.deadlines.addComment'))
                              const comment = input?.trim()
                              if (comment) onAddComment(milestone.id, comment)
                            }}
                          >
                            <MessageSquarePlus className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>

            {selectedMilestone && (
              <div className='space-y-3 rounded-lg border border-border bg-muted/40 p-3 dark:border-slate-700/70 dark:bg-slate-800/50'>
                <div>
                  <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-400'>
                    {t('timeline.deadlines.definition')}
                  </p>
                  <p className='mt-1 text-sm'>
                    {selectedMilestone.definition || t('timeline.milestones.addDefinition')}
                  </p>
                </div>
                <div>
                  <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-400'>
                    {t('timeline.deadlines.justification')}
                  </p>
                  <p className='mt-1 text-sm'>
                    {selectedMilestone.justification || t('timeline.milestones.addJustification')}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
