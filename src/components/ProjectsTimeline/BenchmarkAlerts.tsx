import { AlertTriangle, AlertCircle, Info, X, Bell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLocalization } from '@/contexts/LocalizationContext'
import { cn } from '@/lib/utils'
import type { BenchmarkAlert, AlertSeverity } from '@/hooks/useBenchmarkAlerts'

interface BenchmarkAlertsProps {
  alerts: BenchmarkAlert[]
  onDismiss?: (alertId: string) => void
  onViewDetails?: (alertId: string) => void
  className?: string
  maxAlerts?: number
}

const severityConfig: Record<
  AlertSeverity,
  { icon: typeof AlertTriangle; bgClass: string; borderClass: string; badgeVariant: 'destructive' | 'warning' | 'default' }
> = {
  critical: {
    icon: AlertTriangle,
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
    badgeVariant: 'destructive',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-yellow-50',
    borderClass: 'border-yellow-200',
    badgeVariant: 'warning',
  },
  info: {
    icon: Info,
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    badgeVariant: 'default',
  },
}

const severityLabels: Record<AlertSeverity, string> = {
  critical: 'critical',
  warning: 'warning',
  info: 'info',
}

export function BenchmarkAlerts({
  alerts,
  onDismiss,
  onViewDetails,
  className,
  maxAlerts = 5,
}: BenchmarkAlertsProps) {
  const { t } = useLocalization()

  if (alerts.length === 0) {
    return null
  }

  const displayAlerts = alerts.slice(0, maxAlerts)
  const remainingCount = alerts.length - maxAlerts

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-sm">
              {t('timeline.benchmark.alerts.title')}
            </CardTitle>
          </div>
          <Badge variant="destructive" className="text-xs">
            {alerts.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {displayAlerts.map((alert) => {
          const config = severityConfig[alert.severity]
          const Icon = config.icon

          return (
            <div
              key={alert.id}
              className={cn(
                'relative rounded-md border p-3',
                config.bgClass,
                config.borderClass
              )}
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={cn(
                    'mt-0.5 h-4 w-4 flex-shrink-0',
                    alert.severity === 'critical' && 'text-red-600',
                    alert.severity === 'warning' && 'text-yellow-600',
                    alert.severity === 'info' && 'text-blue-600'
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{alert.category}</span>
                    <Badge variant={config.badgeVariant} className="text-xs">
                      {t(`timeline.benchmark.alerts.${severityLabels[alert.severity]}`)}
                    </Badge>
                    {alert.variance > 0 && (
                      <span className="text-xs font-medium text-red-600">
                        +{alert.variance.toFixed(1)}%
                      </span>
                    )}
                    {alert.variance < 0 && (
                      <span className="text-xs font-medium text-green-600">
                        {alert.variance.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{alert.message}</p>
                  {alert.suggestedAction && (
                    <p className="text-xs text-gray-500 mt-1">
                      {alert.suggestedAction}
                    </p>
                  )}
                </div>
                {onDismiss && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onDismiss(alert.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        {remainingCount > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            {t('timeline.benchmark.alerts.moreAlerts', { count: remainingCount })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
