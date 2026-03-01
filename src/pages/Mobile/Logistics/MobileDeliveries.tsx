import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, 
  MapPin, 
  Navigation, 
  Phone, 
  Clock, 
  ChevronLeft,
  Search,
  Route,
  Calendar,
  Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Container } from '@/components/Layout';
import { format } from 'date-fns';

export default function MobileDeliveries() {
  const navigate = useNavigate();
  const { t } = useLocalization();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch deliveries for selected date
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['mobileDeliveries', selectedDate],
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

  return (
    <Container size="sm" className="pb-20">
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/mobile/logistics')}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">{t('logistics:dailyDeliveries')}</h1>
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
          <Card className="bg-blue-50/50 border-blue-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{totalDeliveries}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{t('logistics:total')}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50/50 border-green-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{inTransit}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{t('logistics:inTransit')}</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50/50 border-orange-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-orange-600">{upcoming}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{t('logistics:scheduled')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Delivery Locations Mini-Map */}
        {uniqueLocations && uniqueLocations.length > 0 && (
          <Card className="border-none shadow-md overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">{t('logistics:deliveryRoute')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {uniqueLocations.map((loc, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.address)}`, '_blank')}
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
                        <span className="text-xs text-muted-foreground">{loc.deliveryCount} {t('logistics:deliveries')}</span>
                      </div>
                    </div>
                    <Navigation className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            className="w-full pl-10 pr-4 py-2 rounded-full bg-muted/50 border-none text-sm focus:ring-2 focus:ring-primary"
            placeholder={t('logistics:searchDeliveries')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Deliveries List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">{t('logistics:loading')}</div>
          ) : filteredDeliveries?.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed rounded-2xl">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('logistics:noDeliveriesToday')}</p>
              <p className="text-xs text-muted-foreground mt-2">{t('logistics:tryDifferentDate')}</p>
            </div>
          ) : filteredDeliveries?.map((del: any) => (
            <Card key={del.id} className="border-none shadow-sm overflow-hidden">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                   <Badge 
                     variant={del.status === 'in_transit' ? 'default' : del.status === 'delivered' ? 'success' : 'secondary'} 
                     className="mb-2"
                   >
                     {t(`logistics:status.${del.status}`)}
                   </Badge>
                   <CardTitle className="text-md font-bold">{del.suppliers?.name}</CardTitle>
                   <CardDescription className="text-xs">{del.projects?.name}</CardDescription>
                </div>
                <div className="text-right">
                   <p className="text-xs font-bold text-primary flex items-center gap-1">
                     <Clock className="h-3 w-3" />
                     {del.estimated_arrival ? format(new Date(del.estimated_arrival), 'HH:mm') : 'TBD'}
                   </p>
                   {del.tracking_number && (
                     <p className="text-[10px] text-muted-foreground mt-1">#{del.tracking_number}</p>
                   )}
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

                <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs">{del.projects?.construction_address || t('logistics:addressNotSet')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                   <Button 
                     variant="outline" 
                     size="sm" 
                     className="h-10 text-xs" 
                     onClick={() => del.driver_contact && window.open(`tel:${del.driver_contact}`)}
                     disabled={!del.driver_contact}
                   >
                     <Phone className="mr-2 h-3 w-3" />
                     {t('logistics:callDriver')}
                   </Button>
                   <Button 
                     variant="default" 
                     size="sm" 
                     className="h-10 text-xs" 
                     onClick={() => del.projects?.construction_address && window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(del.projects.construction_address)}`)}
                     disabled={!del.projects?.construction_address}
                   >
                     <Navigation className="mr-2 h-3 w-3" />
                     {t('logistics:navigate')}
                   </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Container>
  );
}
