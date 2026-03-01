import { format } from 'date-fns'
import { useLocalization } from '@/contexts/LocalizationContext'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type TimelineMilestoneStatus =
  | 'planned'
  | 'on_track'
  | 'at_risk'
  | 'delayed'
  | 'not_started_overdue'
type TimelineMilestoneShape = 'circle' | 'diamond'

interface TimelineMilestoneProps {
  left: number
  adjustedLeft?: number
  top?: number
  label: string
  date: Date
  adjustedDate?: Date | null
  status: TimelineMilestoneStatus
  shape?: TimelineMilestoneShape
  onClick?: () => void
  className?: string
  dataTestId?: string
}

function getStatusClasses(status: TimelineMilestoneStatus): string {
  switch (status) {
    case 'on_track':
      return 'bg-emerald-500 ring-emerald-100'
    case 'at_risk':
      return 'bg-amber-500 ring-amber-100'
    case 'delayed':
      return 'bg-red-500 ring-red-100'
    case 'not_started_overdue':
      return 'bg-red-500 ring-red-100'
    case 'planned':
      return 'bg-slate-400 ring-slate-200'
    default:
      return 'bg-sky-500 ring-sky-100'
  }
}

function getStatusClassesForDefinitions(status: TimelineMilestoneStatus): string {
  switch (status) {
    case 'on_track':
      return 'bg-emerald-500 ring-emerald-500/20'
    case 'at_risk':
      return 'bg-amber-500 ring-amber-500/20'
    case 'delayed':
      return 'bg-red-500 ring-red-500/20'
    case 'not_started_overdue':
      return 'bg-red-500 ring-red-500/20'
    case 'planned':
      return 'bg-slate-400 ring-slate-400/20'
    default:
      return 'bg-sky-500 ring-sky-500/20'
  }
}

function getStatusLabel(t: (key: string) => string, status: TimelineMilestoneStatus): string {
  switch (status) {
    case 'on_track':
      return t('timeline.interval.onTrack')
    case 'at_risk':
      return t('timeline.status.attention')
    case 'delayed':
      return t('timeline.status.delayed')
    case 'not_started_overdue':
      return t('timeline.status.delayed')
    default:
      return t('timeline.milestones.pending')
  }
}

export function TimelineMilestone({
  left,
  adjustedLeft,
  top,
  label,
  date,
  adjustedDate,
  status,
  shape = 'circle',
  onClick,
  className,
  dataTestId,
}: TimelineMilestoneProps) {
  const { t } = useLocalization()
  const statusLabel = getStatusLabel(t, status)
  
  const hasForecast = adjustedLeft !== undefined && Math.abs(adjustedLeft - left) > 1
  const finalLeft = hasForecast ? adjustedLeft : left
  const finalTop = top ?? '50%'

  return (
    <TooltipProvider>
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {hasForecast && (
          <>
            {/* Ghost original marker */}
            <div
              className={cn(
                'absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 opacity-30 ring-1 border bg-muted',
                shape === 'circle' ? 'rounded-full' : 'rotate-45 rounded-sm'
              )}
              style={{ left, top: finalTop }}
            />
            {/* Connection line */}
            <div 
              className="absolute h-px border-t border-dashed border-muted-foreground/40 z-10"
              style={{ 
                left: Math.min(left, adjustedLeft!), 
                width: Math.abs(adjustedLeft! - left),
                top: finalTop as any
              }}
            />
          </>
        )}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type='button'
            onClick={onClick}
            className={cn(
              'absolute z-20 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 cursor-pointer ring-2',
              shape === 'circle' ? 'rounded-full' : 'rotate-45 rounded-sm',
              hasForecast ? 'bg-purple-500 ring-purple-100' : getStatusClassesForDefinitions(status),
              className
            )}
            style={{ left: finalLeft, top: finalTop }}
            aria-label={`${label} - ${statusLabel}`}
            data-testid={dataTestId}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className='font-medium text-sm'>{label}</p>
          <div className="space-y-0.5 mt-1">
            <p className='text-xs text-muted-foreground flex justify-between gap-4'>
              <span>{t('timeline.milestone.planned')}:</span>
              <span className="font-mono">{format(date, 'dd MMM yyyy')}</span>
            </p>
            {adjustedDate && hasForecast && (
              <p className='text-xs text-purple-600 font-semibold flex justify-between gap-4'>
                <span>AI Forecast:</span>
                <span className="font-mono">{format(adjustedDate, 'dd MMM yyyy')}</span>
              </p>
            )}
            {!hasForecast && <p className='text-xs text-muted-foreground'>{statusLabel}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
