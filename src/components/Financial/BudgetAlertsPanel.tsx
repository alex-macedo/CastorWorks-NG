import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bell, AlertTriangle, Info, X, CheckCircle } from 'lucide-react';
import { BudgetAlert } from '@/lib/ai/types';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useLocalization } from '@/contexts/LocalizationContext';

interface BudgetAlertsPanelProps {
  alerts: BudgetAlert[];
  onAcknowledge?: (alertId: string) => void;
}

export const BudgetAlertsPanel: React.FC<BudgetAlertsPanelProps> = ({
  alerts,
  onAcknowledge,
}) => {
  const { formatShortDateTime } = useDateFormat();
  const { t } = useLocalization();

  const translate = (key: string, fallback: string, variables?: Record<string, string | number>) => {
    const result = t(key, variables);
    return result === key ? fallback : result;
  };
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-destructive bg-destructive/10';
      case 'warning':
        return 'border-warning bg-warning/10';
      case 'info':
        return 'border-blue-500 bg-blue-500/10';
      default:
        return '';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getAlertTypeLabel = (alertType: string) => {
    switch (alertType) {
      case 'variance':
        return translate('budget:intelligence.alerts.types.variance', 'Budget Variance');
      case 'anomaly':
        return translate('budget:intelligence.alerts.types.anomaly', 'Cost Anomaly');
      case 'threshold':
        return translate('budget:intelligence.alerts.types.threshold', 'Threshold Alert');
      case 'prediction':
        return translate('budget:intelligence.alerts.types.prediction', 'Predictive Alert');
      default:
        return alertType;
    }
  };

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged);

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-success" />
            {translate('budget:intelligence.alerts.title', 'Budget Alerts')}
          </CardTitle>
          <CardDescription>
            {translate('budget:intelligence.alerts.noActiveDescription', 'No active budget alerts')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-success bg-success/10">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success-foreground">
              {translate(
                'budget:intelligence.alerts.allClearMessage',
                'All clear! No budget concerns detected at this time.'
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              {translate('budget:intelligence.alerts.title', 'Budget Alerts')}
            </CardTitle>
            <CardDescription>
              {acknowledgedAlerts.length > 0
                ? translate(
                    unacknowledgedAlerts.length === 1
                      ? 'budget:intelligence.alerts.summarySingleWithAcknowledged'
                      : 'budget:intelligence.alerts.summaryPluralWithAcknowledged',
                    `${unacknowledgedAlerts.length} unacknowledged alert${unacknowledgedAlerts.length === 1 ? '' : 's'} • ${acknowledgedAlerts.length} acknowledged`,
                    {
                      unacknowledged: unacknowledgedAlerts.length,
                      acknowledged: acknowledgedAlerts.length,
                    }
                  )
                : translate(
                    unacknowledgedAlerts.length === 1
                      ? 'budget:intelligence.alerts.summarySingle'
                      : 'budget:intelligence.alerts.summaryPlural',
                    `${unacknowledgedAlerts.length} unacknowledged alert${unacknowledgedAlerts.length === 1 ? '' : 's'}`,
                    {
                      unacknowledged: unacknowledgedAlerts.length,
                    }
                  )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Unacknowledged Alerts */}
          {unacknowledgedAlerts.length > 0 && (
            <div className="space-y-3">
              {unacknowledgedAlerts.map((alert) => (
                <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <AlertTitle className="mb-1">{alert.title}</AlertTitle>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{getAlertTypeLabel(alert.alertType)}</Badge>
                            <Badge variant="outline">{alert.category}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatShortDateTime(alert.triggeredAt)}
                            </span>
                          </div>
                        </div>
                        {onAcknowledge && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAcknowledge(alert.id)}
                            className="flex-shrink-0"
                          >
                            <X className="h-4 w-4 mr-1" />
                            {translate('budget:intelligence.alerts.dismiss', 'Dismiss')}
                          </Button>
                        )}
                      </div>

                      <AlertDescription className="text-sm">
                        {alert.message}
                      </AlertDescription>

                      {/* Threshold Info */}
                      {alert.thresholdValue !== undefined && alert.currentValue !== undefined && (
                        <div className="rounded bg-background/50 p-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              {translate('budget:intelligence.alerts.currentValue', 'Current:')}
                            </span>
                            <span className="font-semibold">{alert.currentValue}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              {translate('budget:intelligence.alerts.thresholdValue', 'Threshold:')}
                            </span>
                            <span className="font-semibold">{alert.thresholdValue}</span>
                          </div>
                        </div>
                      )}

                      {/* Recommended Actions */}
                      {alert.recommendedActions && alert.recommendedActions.length > 0 && (
                        <div className="mt-2">
                          <div className="text-sm font-semibold mb-1">
                            {translate('budget:intelligence.alerts.recommendedActions', 'Recommended Actions:')}
                          </div>
                          <ul className="space-y-1">
                            {alert.recommendedActions.map((action, idx) => (
                              <li key={idx} className="flex gap-2 text-sm">
                                <span className="text-primary">•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {/* Acknowledged Alerts (collapsed view) */}
          {acknowledgedAlerts.length > 0 && (
            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
                {translate(
                  acknowledgedAlerts.length === 1
                    ? 'budget:intelligence.alerts.viewAcknowledgedSingle'
                    : 'budget:intelligence.alerts.viewAcknowledgedPlural',
                  `View ${acknowledgedAlerts.length} acknowledged alert${acknowledgedAlerts.length === 1 ? '' : 's'}`,
                  { acknowledged: acknowledgedAlerts.length }
                )}
              </summary>
              <div className="mt-3 space-y-2">
                {acknowledgedAlerts.map((alert) => (
                  <div key={alert.id} className="rounded bg-muted/50 p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{alert.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {getAlertTypeLabel(alert.alertType)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatShortDateTime(alert.triggeredAt)}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
