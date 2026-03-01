import { RefreshCw, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useServiceHealth, ServiceStatus } from '@/hooks/useServiceHealth';
import { formatDistanceToNow } from 'date-fns';
import { useLocalization } from '@/contexts/LocalizationContext';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

interface StatusBadgeProps {
  status: ServiceStatus;
  getStatusText: (status: ServiceStatus) => string;
}

const StatusBadge = ({ status, getStatusText }: StatusBadgeProps) => {
  const config = {
    operational: {
      icon: CheckCircle2,
      className: 'text-green-600 dark:text-green-400',
      bgClassName: 'bg-green-100 dark:bg-green-950/30',
    },
    degraded: {
      icon: AlertCircle,
      className: 'text-yellow-600 dark:text-yellow-400',
      bgClassName: 'bg-yellow-100 dark:bg-yellow-950/30',
    },
    down: {
      icon: XCircle,
      className: 'text-red-600 dark:text-red-400',
      bgClassName: 'bg-red-100 dark:bg-red-950/30',
    },
  };

  const { icon: Icon, className, bgClassName } = config[status];
  const text = getStatusText(status);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${bgClassName}`}>
      <Icon className={`h-4 w-4 ${className}`} />
      <span className={`text-sm font-medium ${className}`}>{text}</span>
    </div>
  );
};

export default function Status() {
  const { t } = useLocalization();
  const { services, isChecking, refetch } = useServiceHealth();

  const allOperational = services.every(s => s.status === 'operational');
  const anyDown = services.some(s => s.status === 'down');

  const getStatusText = (status: ServiceStatus): string => {
    const statusMap: Record<ServiceStatus, string> = {
      operational: t('status.operational'),
      degraded: t('status.degraded'),
      down: t('status.down'),
    };
    return statusMap[status];
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <SidebarHeaderShell>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{t('status.systemStatus')}</h1>
              <p className="text-sm text-sidebar-primary-foreground/80">
                {t('status.realTimeMonitoring')}
              </p>
            </div>
          </div>
        </SidebarHeaderShell>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('status.overallStatus')}</CardTitle>
                <CardDescription>
                  {allOperational && t('status.allSystemsOperational')}
                  {!allOperational && !anyDown && t('status.someSystemsExperiencingIssues')}
                  {anyDown && t('status.serviceDisruptionDetected')}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                disabled={isChecking}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                {t('status.refresh')}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-4">
          {services.map((service) => (
            <Card key={service.name}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{service.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Last checked {formatDistanceToNow(service.lastChecked, { addSuffix: true })}
                    </p>
                  </div>
                  <StatusBadge status={service.status} getStatusText={getStatusText} />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('status.responseTime')}</p>
                    <p className="text-2xl font-bold">
                      {service.responseTime !== null ? `${service.responseTime}ms` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('status.uptime')}</p>
                    <p className="text-2xl font-bold">{service.uptime.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        service.status === 'operational'
                          ? 'bg-green-600 dark:bg-green-400'
                          : service.status === 'degraded'
                          ? 'bg-yellow-600 dark:bg-yellow-400'
                          : 'bg-red-600 dark:bg-red-400'
                      }`}
                      style={{ width: `${service.uptime}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t('status.aboutStatusPage')}</CardTitle>
            <CardDescription>
              {t('status.statusDescription')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
