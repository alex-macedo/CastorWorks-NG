import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Alert as AlertType } from '@/utils/alertGenerators';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';

interface AlertsPanelProps {
  alerts: AlertType[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

  const getIcon = (type: AlertType['type']) => {
    switch (type) {
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'info': return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = (type: AlertType['type']) => {
    return type === 'error' ? 'destructive' : 'default';
  };

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  };

  if (visibleAlerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('overallStatus.alertsAndNotifications')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('overallStatus.noAlerts')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('overallStatus.alertsAndNotifications')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visibleAlerts.map((alert) => (
          <Alert key={alert.id} variant={getVariant(alert.type)} className="relative pr-12">
            {getIcon(alert.type)}
            <AlertDescription className="flex flex-col gap-2">
              <div>
                <p className="font-medium">{alert.title}</p>
                <p className="text-sm">{alert.message}</p>
              </div>
              {alert.action && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(alert.action!.href)}
                >
                  {alert.action.label}
                </Button>
              )}
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6"
              onClick={() => handleDismiss(alert.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}
