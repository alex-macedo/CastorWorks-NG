import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  QrCode, 
  Truck, 
  Package, 
  MapPin, 
  ChevronRight,
  AlertTriangle,
  TrendingDown,
  Route
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MobileHeader } from '@/components/supervisor/MobileHeader';
import { MobileBottomNav } from '@/components/supervisor/MobileBottomNav';
import { PullToRefresh } from '@/components/supervisor/PullToRefresh';
import { SyncStatusBar } from '@/components/supervisor/SyncStatusBar';
import { cn } from '@/lib/utils';

export default function SupervisorLogistics() {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const { vibrate } = useHapticFeedback();
  const [refreshing, setRefreshing] = useState(false);

  // Fetch critical stock alerts
  const { data: criticalStock, isLoading: stockLoading } = useQuery({
    queryKey: ['supervisorCriticalStock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_inventory')
        .select('*, projects(name)')
        .lte('current_stock', 'min_stock_level')
        .order('current_stock', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data;
    }
  });

  // Fetch today's deliveries
  const { data: todayDeliveries, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['supervisorTodayDeliveries'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('project_deliveries')
        .select('*, suppliers(name), projects(name)')
        .eq('scheduled_date', today)
        .order('estimated_arrival', { ascending: true })
        .limit(3);
      if (error) throw error;
      return data;
    }
  });

  const actions = [
    {
      id: 'scanner',
      title: t('supervisor.logistics.qrScanner') || 'Material Scanner',
      description: t('supervisor.logistics.scanToUpdateStock') || 'Scan QR code to update inventory',
      icon: QrCode,
      color: 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20',
      path: '/supervisor/logistics/scanner',
      badge: null
    },
    {
      id: 'deliveries',
      title: t('supervisor.logistics.dailyDeliveries') || 'Daily Deliveries',
      description: t('supervisor.logistics.trackOnMap') || 'Track incoming deliveries on map',
      icon: Truck,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
      path: '/supervisor/logistics/deliveries',
      badge: todayDeliveries?.length || null
    },
    {
      id: 'inventory',
      title: t('supervisor.logistics.inventoryLookup') || 'Inventory Lookup',
      description: t('supervisor.logistics.checkStockLevels') || 'Browse and search project stock',
      icon: Package,
      color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hover:bg-green-500/20',
      path: '/supervisor/logistics/inventory',
      badge: null
    }
  ];

  const handleActionClick = (path: string) => {
    vibrate('medium');
    navigate(path);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Refetch queries
    await Promise.all([
      supabase.refetchQueries(['supervisorCriticalStock']),
      supabase.refetchQueries(['supervisorTodayDeliveries'])
    ]);
    setRefreshing(false);
  };

  return (
    <>
      <SyncStatusBar />
      <PullToRefresh onRefresh={handleRefresh} disabled={refreshing}>
        <div className="supervisor-mobile min-h-screen pb-32 bg-background">
          {/* Mobile Header */}
          <MobileHeader
            onRefresh={handleRefresh}
            refreshing={refreshing}
            title={t('supervisor.logistics.title') || 'Site Logistics'}
          />

          <div className="p-4 space-y-6">
            {/* Page Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t('supervisor.logistics.title') || 'Site Logistics'}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('supervisor.logistics.subtitle') || 'Materials, deliveries, and inventory management'}
                </p>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid gap-4">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Card 
                    key={action.id} 
                    className={cn(
                      "active:scale-[0.98] transition-all cursor-pointer border-2 overflow-hidden",
                      "hover:shadow-md",
                      action.color
                    )}
                    onClick={() => handleActionClick(action.path)}
                  >
                    <CardContent className="p-0">
                      <div className="flex items-center">
                        <div className={cn("p-6", action.color.includes('primary') ? 'bg-primary text-primary-foreground' : '')}>
                          <Icon className="h-8 w-8" />
                        </div>
                        <div className="flex-1 p-4">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{action.title}</h3>
                            {action.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {action.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{action.description}</p>
                        </div>
                        <div className="px-4">
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Critical Stock Alerts */}
            {criticalStock && criticalStock.length > 0 && (
              <Alert className="border-orange-200 bg-orange-50/30 dark:bg-orange-950/20">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-sm font-medium text-orange-900 dark:text-orange-200">
                    {t('supervisor.logistics.criticalStockAlerts') || 'Critical Stock Alerts'}
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    {criticalStock.length}
                  </Badge>
                </AlertDescription>
              </Alert>
            )}

            {/* Today's Deliveries Preview */}
            {todayDeliveries && todayDeliveries.length > 0 && (
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-blue-600" />
                      <CardTitle className="text-sm font-bold">
                        {t('supervisor.logistics.todayDeliveries') || "Today's Deliveries"}
                      </CardTitle>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleActionClick('/supervisor/logistics/deliveries')}
                      className="text-xs"
                    >
                      {t('common:viewAll') || 'View All'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {todayDeliveries.slice(0, 3).map((delivery: any) => (
                    <div key={delivery.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{delivery.suppliers?.name}</p>
                          <p className="text-xs text-muted-foreground">{delivery.projects?.name}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={delivery.status === 'in_transit' ? 'default' : delivery.status === 'delivered' ? 'success' : 'secondary'}
                        className="text-xs"
                      >
                        {t(`supervisor.logistics.status.${delivery.status}`) || delivery.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Empty State for No Alerts */}
            {(!criticalStock || criticalStock.length === 0) && (!todayDeliveries || todayDeliveries.length === 0) && (
              <Card className="border-dashed border-2 border-muted-foreground/20">
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-muted-foreground mb-2">
                    {t('supervisor.logistics.allCaughtUp') || 'All Caught Up'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('supervisor.logistics.noCriticalIssues') || 'No critical stock issues or delivery alerts today.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </PullToRefresh>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </>
  );
}
