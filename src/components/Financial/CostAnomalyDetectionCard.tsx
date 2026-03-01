import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info, Lightbulb } from 'lucide-react';
import { CostAnomaly } from '@/lib/ai/types';
import { formatCurrency } from '@/utils/formatters';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';

interface CostAnomalyDetectionCardProps {
  anomalies: CostAnomaly[];
}

export const CostAnomalyDetectionCard: React.FC<CostAnomalyDetectionCardProps> = ({
  anomalies,
}) => {
  const { currency, t } = useLocalization();
  const { formatDate } = useDateFormat();

  const translate = (key: string, fallback: string, variables?: Record<string, string | number>) => {
    const result = t(key, variables);
    return result === key ? fallback : result;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Info className="h-4 w-4" />;
      case 'low':
        return <Info className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high':
        return translate('budget:intelligence.anomalies.severityHigh', 'High');
      case 'medium':
        return translate('budget:intelligence.anomalies.severityMedium', 'Medium');
      case 'low':
        return translate('budget:intelligence.anomalies.severityLow', 'Low');
      default:
        return severity;
    }
  };

  if (anomalies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-success" />
            {translate('budget:intelligence.anomalies.title', 'Cost Anomaly Detection')}
          </CardTitle>
          <CardDescription>
            {translate(
              'budget:intelligence.anomalies.emptyDescription',
              'No anomalies detected in spending patterns'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-success bg-success/10">
            <Info className="h-4 w-4 text-success" />
            <AlertDescription className="text-success-foreground">
              {translate(
                'budget:intelligence.anomalies.emptyMessage',
                'All spending appears normal. No unusual cost patterns detected.'
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const highSeverityCount = anomalies.filter(a => a.severity === 'high').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {translate('budget:intelligence.anomalies.title', 'Cost Anomaly Detection')}
            </CardTitle>
            <CardDescription>
              {highSeverityCount > 0
                ? translate(
                    anomalies.length === 1
                      ? 'budget:intelligence.anomalies.summarySingleWithHigh'
                      : 'budget:intelligence.anomalies.summaryPluralWithHigh',
                    `${anomalies.length} anomalies detected (${highSeverityCount} high severity)`,
                    {
                      total: anomalies.length,
                      high: highSeverityCount,
                    }
                  )
                : translate(
                    anomalies.length === 1
                      ? 'budget:intelligence.anomalies.summarySingle'
                      : 'budget:intelligence.anomalies.summaryPlural',
                    `${anomalies.length} anomalies detected`,
                    { total: anomalies.length }
                  )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {anomalies.map((anomaly) => (
            <div key={anomaly.id} className="rounded-lg border p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{anomaly.category}</h4>
                    <Badge variant={getSeverityColor(anomaly.severity)}>
                      {getSeverityIcon(anomaly.severity)}
                      <span className="ml-1">
                        {translate('budget:intelligence.anomalies.severityLabel', '{label} severity', {
                          label: getSeverityLabel(anomaly.severity),
                        })}
                      </span>
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(anomaly.transactionDate)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">
                    {translate('budget:intelligence.anomalies.amountLabel', 'Amount')}
                  </div>
                  <div className="text-lg font-bold text-destructive">
                    {formatCurrency(anomaly.amount, currency)}
                  </div>
                </div>
              </div>

              {/* Description */}
              <Alert className={
                anomaly.severity === 'high'
                  ? 'border-destructive bg-destructive/10'
                  : 'border-warning bg-warning/10'
              }>
                <AlertDescription>{anomaly.description}</AlertDescription>
              </Alert>

              {/* Expected Range */}
              <div className="rounded bg-muted p-3">
                <div className="text-sm text-muted-foreground mb-1">
                  {translate('budget:intelligence.anomalies.expectedRange', 'Expected Range')}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {formatCurrency(anomaly.expectedRange.min, currency)} -
                    {' '}{formatCurrency(anomaly.expectedRange.max, currency)}
                  </span>
                  <Badge variant="outline">
                    {anomaly.deviationPercentage > 0 ? '+' : ''}
                    {translate(
                      'budget:intelligence.anomalies.deviation',
                      '{value}% deviation',
                      { value: anomaly.deviationPercentage.toFixed(1) }
                    )}
                  </Badge>
                </div>
              </div>

              {/* Possible Causes */}
              {anomaly.possibleCauses.length > 0 && (
                <div>
                  <div className="text-sm font-semibold mb-2">
                    {translate('budget:intelligence.anomalies.possibleCauses', 'Possible Causes')}
                  </div>
                  <ul className="space-y-1">
                    {anomaly.possibleCauses.map((cause, index) => (
                      <li key={index} className="flex gap-2 text-sm text-muted-foreground">
                        <span>•</span>
                        <span>{cause}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendation */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <div className="flex gap-2">
                  <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold mb-1">
                      {translate('budget:intelligence.anomalies.recommendation', 'Recommendation')}
                    </div>
                    <p className="text-sm text-muted-foreground">{anomaly.recommendation}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
