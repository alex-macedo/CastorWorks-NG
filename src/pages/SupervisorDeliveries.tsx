import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  Phone, 
  Clock, 
  Search,
  Route,
  Calendar,
  Package,
  Filter
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
import { format } from 'date-fns';

export default function SupervisorDeliveries() {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const { vibrate } = useHapticFeedback();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch deliveries for selected date
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['supervisorDeliveries', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_deliveries')
        .select('*, suppliers(name, phone), projects(name, construction_address, location)')
        .eq('scheduled_date', selectedDate)
        .order('estimated_arrival', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // Calculate delivery stats
  const totalDeliveries = deliveries?.length || 0;
  const inTransit = deliveries?.filter(d => d.status === 'in_transit').length || 0;
  const delivered = deliveries?.filter(d => d.status === 'delivered').length || 0;
  const upcoming = deliveries?.filter(d => d.status === 'scheduled').length || 0;

  const filteredDeliveries = deliveries?.filter(d => 
    d.suppliers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.projects?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.projects?.construction_address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get unique delivery locations for the mini-map
  const uniqueLocations = deliveries?.reduce((acc: any[], del: any) => {
    const address = del.projects?.construction_address;
    if (address && !acc.find(l => l.address === address)) {
      acc.push({
        address,
        projectName: del.projects?.name,
        deliveryCount: deliveries.filter((d: any) => d.projects?.construction_address === address).length
      });
    }
    return acc;
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      supabase.refetchQueries(['supervisorDeliveries'])
    ]);
    setRefreshing(false);
  };

  const handleNavigate = (address: string) => {
    vibrate('light');
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`, '_blank');
  };

  const handleCall = (phone: string) => {
    vibrate('light');
    window.open(`tel:${phone}`);
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
            title={t('supervisor.logistics.dailyDeliveries') || 'Daily Deliveries'}
          />

          <div className="p-4 space-y-6">
            {/* Page Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{t('supervisor.logistics.dailyDeliveries') || 'Daily Deliveries'}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('supervisor.logistics.trackOnMap') || 'Track incoming deliveries on map'}
                </p>
              </div>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 bg-transparent border-none text-sm focus:outline-none"
              />
            </div>

            {/* Delivery Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalDeliveries}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{t('supervisor.logistics.total') || 'Total'}</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{inTransit}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{t('supervisor.logistics.inTransit') || 'In Transit'}</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{upcoming}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{t('supervisor.logistics.scheduled') || 'Scheduled'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                className="w-full pl-10 pr-4 py-3 rounded-full bg-muted/50 border-none text-sm focus:ring-2 focus:ring-primary"
                placeholder={t('supervisor.logistics.searchDeliveries') || 'Search deliveries...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -transform -translate-y-1/2 h-8 w-8 rounded-full">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Delivery Locations Mini-Map */}
            {uniqueLocations && uniqueLocations.length > 0 && (
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Route className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">{t('supervisor.logistics.deliveryRoute') || 'Delivery Route'}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {uniqueLocations.map((loc, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.98]"
                        onClick={() => handleNavigate(loc.address)}
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
                            {idx + 1}
                          </div>
                          {idx < uniqueLocations.length - 1 && (
                            <div className="w-0.5 h-6 bg-border mt-1" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{loc.projectName}</p>
                          <p className="text-xs text-muted-foreground truncate">{loc.address}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{loc.deliveryCount} {t('supervisor.logistics.deliveries') || 'deliveries'}</span>
                          </div>
                        </div>
                        <Navigation className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Deliveries List */}
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-10 text-muted-foreground">{t('supervisor.logistics.loading') || 'Loading...'}</div>
              ) : filteredDeliveries?.length === 0 ? (
                <Card className="border-dashed border-2 border-muted-foreground/20">
                  <CardContent className="p-8 text-center">
                    <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-muted-foreground mb-2">
                      {t('supervisor.logistics.noDeliveriesToday') || 'No Deliveries Today'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t('supervisor.logistics.tryDifferentDate') || 'Try selecting a different date.'}
                    </p>
                  </CardContent>
                </Card>
              ) : filteredDeliveries?.map((del: any) => (
                <Card key={del.id} className="border-l-4 border-l-blue-500 active:scale-[0.98] transition-transform">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Badge 
                          variant={del.status === 'in_transit' ? 'default' : del.status === 'delivered' ? 'success' : 'secondary'} 
                          className="mb-2 text-xs"
                        >
                          {t(`supervisor.logistics.status.${del.status}`) || del.status}
                        </Badge>
                        <CardTitle className="text-base font-bold">{del.suppliers?.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{del.projects?.name}</p>
                      </div>
                      <div className="text-right ml-4">
                         <p className="text-sm font-bold text-primary flex items-center gap-1">
                           <Clock className="h-3 w-3" />
                           {del.estimated_arrival ? format(new Date(del.estimated_arrival), 'HH:mm') : 'TBD'}
                         </p>
                         {del.tracking_number && (
                           <p className="text-[10px] text-muted-foreground mt-1">#{del.tracking_number}</p>
                         )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {del.items && del.items.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {del.items.map((item: any, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-[10px]">
                            {item.qty} {item.unit} {item.name}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm">{del.projects?.construction_address || t('supervisor.logistics.addressNotSet') || 'Address not set'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className="h-10 text-xs active:scale-95 transition-transform" 
                         onClick={() => del.driver_contact && handleCall(del.driver_contact)}
                         disabled={!del.driver_contact}
                       >
                         <Phone className="mr-2 h-3 w-3" />
                         {t('supervisor.logistics.callDriver') || 'Call Driver'}
                       </Button>
                       <Button 
                         variant="default" 
                         size="sm" 
                         className="h-10 text-xs active:scale-95 transition-transform" 
                         onClick={() => del.projects?.construction_address && handleNavigate(del.projects.construction_address)}
                         disabled={!del.projects?.construction_address}
                       >
                         <Navigation className="mr-2 h-3 w-3" />
                         {t('supervisor.logistics.navigate') || 'Navigate'}
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </PullToRefresh>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </>
  );
}
