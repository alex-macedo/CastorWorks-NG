import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  Truck, 
  QrCode, 
  TrendingDown, 
  Plus, 
  MapPin, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Calendar,
  ChevronRight,
  Printer
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useInventoryPredictions } from '@/hooks/useInventoryPredictions';
import { AICacheHeader } from '@/components/AI/AICacheHeader';
import { useLocalization } from '@/contexts/LocalizationContext';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { AddInventoryItemModal } from './AddInventoryItemModal';
import { AddDeliveryModal } from './AddDeliveryModal';
import { QRCodePrintModal } from './QRCodePrintModal';

interface LogisticsTabContentProps {
  projectId: string;
}

export function LogisticsTabContent({ projectId }: LogisticsTabContentProps) {
  const { t } = useLocalization();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState('inventory');
  
  // Modal states
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddDeliveryOpen, setIsAddDeliveryOpen] = useState(false);
  const [isPrintQROpen, setIsPrintQROpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);

  // 1. Fetch Inventory
  const { data: inventory, isLoading: isInvLoading } = useQuery({
    queryKey: ['projectInventory', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_inventory')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return data;
    }
  });

  // 2. Fetch Deliveries
  const { data: deliveries, isLoading: isDelLoading } = useQuery({
    queryKey: ['projectDeliveries', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_deliveries')
        .select('*, suppliers(name)')
        .eq('project_id', projectId)
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // 3. Fetch AI Predictions (with cache support)
  const {
    predictions,
    cached: predictionsCached,
    generatedAt: predictionsGeneratedAt,
    isLoading: isPredLoading,
    refresh: refreshPredictions,
  } = useInventoryPredictions(projectId);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['projectInventory', projectId] });
    queryClient.invalidateQueries({ queryKey: ['projectDeliveries', projectId] });
  };

  const handleEditDelivery = (delivery: any) => {
    setSelectedDelivery(delivery);
    setIsAddDeliveryOpen(true);
  };

  const handleAddDelivery = () => {
    setSelectedDelivery(null);
    setIsAddDeliveryOpen(true);
  };

  return (
    <div className="space-y-6 mt-6 animate-fade-in">
      {/* Header Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">{t('logistics:totalItems')}</p>
                <p className="text-2xl font-bold">{inventory?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50/50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">{t('logistics:lowStock')}</p>
                <p className="text-2xl font-bold text-orange-600">
                  {inventory?.filter((i: any) => (i.current_stock || 0) <= (i.min_stock_level || 0)).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">{t('logistics:pendingDeliveries')}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {deliveries?.filter((d: any) => d.status === 'scheduled' || d.status === 'in_transit').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="inventory">{t('logistics:inventory')}</TabsTrigger>
          <TabsTrigger value="deliveries">{t('logistics:deliveries')}</TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <TrendingDown className="h-3 w-3" />
            {t('logistics:aiPredictions')}
          </TabsTrigger>
        </TabsList>

        {/* INVENTORY TAB */}
        <TabsContent value="inventory" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('logistics:onSiteInventory')}</h3>
            <div className="flex gap-2">
               <Button 
                 variant="outline" 
                 size="sm" 
                 onClick={() => setIsPrintQROpen(true)}
                 disabled={!inventory || inventory.length === 0}
               >
                 <Printer className="mr-2 h-4 w-4" />
                 {t('logistics:printAllQRCodes')}
               </Button>
               <Button size="sm" onClick={() => setIsAddItemOpen(true)}>
                 <Plus className="mr-2 h-4 w-4" />
                 {t('logistics:addItem')}
               </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inventory?.map((item: any) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-md">{item.item_name}</CardTitle>
                    <Badge variant={item.current_stock <= item.min_stock_level ? 'destructive' : 'secondary'}>
                      {item.current_stock} {item.unit}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">{item.sku || t('logistics:noSku')}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <MapPin className="h-3 w-3" />
                    {item.location_in_site || t('logistics:noLocationSet')}
                  </div>
                  {item.cost_per_unit && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('logistics:cost')}: ${item.cost_per_unit} / {item.unit}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {inventory?.length === 0 && (
              <div className="col-span-full text-center py-12 border-2 border-dashed rounded-2xl">
                <p className="text-muted-foreground mb-4">{t('logistics:noItemsFound')}</p>
                <Button onClick={() => setIsAddItemOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('logistics:addFirstItem')}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* DELIVERIES TAB */}
        <TabsContent value="deliveries" className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('logistics:scheduledDeliveries')}</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/mobile/logistics/deliveries`)}>
                <MapPin className="mr-2 h-4 w-4" />
                {t('logistics:viewOnMap')}
              </Button>
              <Button size="sm" onClick={handleAddDelivery}>
                <Plus className="mr-2 h-4 w-4" />
                {t('logistics:addDelivery')}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {deliveries?.map((del: any) => (
              <div 
                key={del.id} 
                className="flex items-center justify-between p-4 border rounded-xl bg-card cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleEditDelivery(del)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-muted rounded-full">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">{del.suppliers?.name || t('logistics:unknownSupplier')}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(del.scheduled_date), 'PPP')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {del.estimated_arrival ? format(new Date(del.estimated_arrival), 'HH:mm') : '--:--'}
                      </span>
                    </div>
                    {del.items && del.items.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {del.items.map((item: any) => `${item.qty} ${item.unit} ${item.name}`).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <Badge variant={del.status === 'delivered' ? 'success' : del.status === 'in_transit' ? 'active' : 'secondary'}>
                    {t(`logistics:status.${del.status}`) || del.status}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditDelivery(del); }}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {deliveries?.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-2xl">
                <p className="text-muted-foreground mb-4">{t('logistics:noDeliveriesScheduled')}</p>
                <Button onClick={handleAddDelivery}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('logistics:scheduleFirstDelivery')}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* PREDICTIONS TAB */}
        <TabsContent value="predictions" className="space-y-4 pt-4">
          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-lg text-purple-900">{t('logistics:aiStockForecasting')}</CardTitle>
                </div>
                {predictions.length > 0 && (
                  <AICacheHeader
                    lastUpdated={predictionsGeneratedAt}
                    cached={predictionsCached}
                    onRefresh={refreshPredictions}
                    isRefreshing={isPredLoading}
                  />
                )}
              </div>
              <CardDescription>
                {t('logistics:predictionDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isPredLoading ? (
                  <div className="text-center py-8 text-muted-foreground">{t('logistics:calculating')}</div>
                ) : predictions?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">{t('logistics:noPredictions')}</div>
                ) : predictions?.map((pred: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white border border-purple-100 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      {pred.priority === 'high' ? (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      <div>
                        <p className="font-bold">{pred.material_name}</p>
                        <p className="text-xs text-muted-foreground">{pred.action}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{t('logistics:neededBy')}: {pred.needed_by}</p>
                      <Badge variant={pred.priority === 'high' ? 'destructive' : 'secondary'} className="text-[10px] h-4">
                        {pred.predicted_shortfall} {t('logistics:shortfall')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddInventoryItemModal
        projectId={projectId}
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onSuccess={handleRefresh}
      />

      <AddDeliveryModal
        projectId={projectId}
        isOpen={isAddDeliveryOpen}
        onClose={() => setIsAddDeliveryOpen(false)}
        onSuccess={handleRefresh}
        editDelivery={selectedDelivery}
      />

      <QRCodePrintModal
        inventory={inventory || []}
        isOpen={isPrintQROpen}
        onClose={() => setIsPrintQROpen(false)}
      />
    </div>
  );
}
