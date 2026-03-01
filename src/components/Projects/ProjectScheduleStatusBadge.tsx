import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useSystemPreferences } from '@/hooks/useSystemPreferences'
import { cn } from '@/lib/utils'
import { getProjectScheduleStatus, type ProjectScheduleStatus } from '@/types/projectScheduleStatus'
import { getScheduleStatusTranslationKey, getStatusBadgeVariant } from '@/utils/badgeVariants'
import { useTranslation } from 'react-i18next'

interface ProjectScheduleStatusBadgeProps {
  project?: { schedule_status?: string | null; scheduleStatus?: string | null; status?: string | null }
  status?: ProjectScheduleStatus
  className?: string
  statusBadgeClassName?: string
  timezoneBadgeClassName?: string
  statusBadgeVariant?: React.ComponentProps<typeof Badge>['variant']
  showTimezoneBadge?: boolean
}

export function ProjectScheduleStatusBadge({
  project,
  status,
  className,
  statusBadgeClassName,
  timezoneBadgeClassName,
  statusBadgeVariant,
  showTimezoneBadge = true,
}: ProjectScheduleStatusBadgeProps) {
  const { t } = useTranslation()
  const { data: systemPreferences } = useSystemPreferences()

  const scheduleStatus = status ?? getProjectScheduleStatus(project || {})
  const timezone = systemPreferences?.system_time_zone || 'America/New_York'

  return (
    <div className={cn('inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={statusBadgeVariant || getStatusBadgeVariant(scheduleStatus)}
            className={cn('whitespace-nowrap', statusBadgeClassName)}
          >
            {t(getScheduleStatusTranslationKey(scheduleStatus))}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {t('common:scheduleStatus.timezoneTooltip', { timezone })}
        </TooltipContent>
      </Tooltip>

      {showTimezoneBadge && (
        <Badge
          variant='outline'
          className={cn('whitespace-nowrap text-[10px] font-medium', timezoneBadgeClassName)}
        >
          {t('common:scheduleStatus.timezoneChip', { timezone })}
        </Badge>
      )}
    </div>
  )
}
