/**
 * AICacheHeader - Reusable header for AI-powered panels with cache awareness
 *
 * Displays Last Updated timestamp, optional Cached badge, and Refresh button.
 * Used across all AI features that support backend caching (Financial Advisor,
 * Analytics Insights, Budget Intelligence, etc.).
 */

import { Clock, RefreshCw } from 'lucide-react'
import { useLocalization } from '@/contexts/LocalizationContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface AICacheHeaderProps {
  /** ISO date string or Date of last generation */
  lastUpdated?: string | Date | null
  /** Whether the data was served from cache */
  cached?: boolean
  /** Callback when user clicks Refresh (forces cache bypass) */
  onRefresh: () => void
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean
  /** Optional i18n key for "Last Updated" label (default: common.lastUpdated) */
  lastUpdatedKey?: string
  /** Optional className for the container */
  className?: string
}

export function AICacheHeader({
  lastUpdated,
  cached = false,
  onRefresh,
  isRefreshing,
  lastUpdatedKey = 'common.lastUpdated',
  className,
}: AICacheHeaderProps) {
  const { t } = useLocalization()

  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleString()
    : null

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {formattedDate && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span className="flex items-center gap-2">
            {t(lastUpdatedKey)}: {formattedDate}
            {cached && (
              <Badge variant="secondary" className="text-xs">
                {t('common.cached')}
              </Badge>
            )}
          </span>
        </div>
      )}
      <Button
        variant="glass-style-dark"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw
          className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')}
        />
        {t('common.refresh')}
      </Button>
    </div>
  )
}
