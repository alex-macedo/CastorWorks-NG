import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useLocalization } from '@/contexts/LocalizationContext'
import { cn } from '@/lib/utils'

interface PhaseIntervalBadgeProps {
  interval: number
  className?: string
}

export function PhaseIntervalBadge({ interval, className }: PhaseIntervalBadgeProps) {
  const { t } = useLocalization()

  const absDays = Math.abs(interval)
  const isAhead = interval > 0
  const isBehind = interval < 0
  const isSeverelyBehind = interval <= -5

  const badgeLabel = isAhead
    ? t('timeline.interval.daysAhead', { days: absDays })
    : isBehind
      ? t('timeline.interval.daysBehind', { days: absDays })
      : t('timeline.interval.onTrack')

  const tooltipLabel = isAhead
    ? t('timeline.interval.ahead', { days: absDays })
    : isBehind
      ? t('timeline.interval.behind', { days: absDays })
      : t('timeline.interval.onTrack')

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            className={cn(
              'px-2 py-0 text-[11px] font-medium',
              isAhead &&
                'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300',
              isBehind &&
                !isSeverelyBehind &&
                'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300',
              isSeverelyBehind &&
                'border-red-200 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300',
              !isAhead &&
                !isBehind &&
                'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-300',
              className
            )}
            variant='outline'
          >
            {badgeLabel}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipLabel}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
