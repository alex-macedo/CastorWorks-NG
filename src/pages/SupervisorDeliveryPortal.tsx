/**
 * Story 4-2: Supervisor Mobile Portal Landing Page
 * Epic 4: Delivery Confirmation & Payment Processing
 *
 * Mobile-friendly portal for supervisors to access and confirm deliveries
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Calendar, Truck, Building2, RefreshCw, CheckCircle, Image } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useRouteTranslations } from '@/hooks/useRouteTranslations';
import { MobileHeader } from "@/components/supervisor/MobileHeader";
import { MobileBottomNav } from "@/components/supervisor/MobileBottomNav";
import { PullToRefresh } from "@/components/supervisor/PullToRefresh";
import { EmptyState } from '@/components/supervisor/EmptyState';
import { useSupervisorProject } from '@/contexts/SupervisorProjectContext';
import { ProcurementStatusBadge } from '@/components/Procurement/ProcurementStatusBadge';
import { DeliveryPhotoGallery } from '@/components/supervisor/DeliveryPhotoGallery';
import { StatusIndicator } from '@/components/supervisor/StatusIndicator';

interface PurchaseOrder {
  id: string;
  purchase_order_number: string;
  expected_delivery_date: string | null;
  status: string;
  supplier_id: string;
  project_id: string;
  purchase_request_id: string;
  total_amount: number | null;
  currency_id: string | null;
  suppliers: {
    name: string;
    contact_email: string | null;
  } | null;
  projects: {
    name: string;
    construction_address: string | null;
  } | null;
  purchase_order_items?:
    | {
        id: string;
        description: string | null;
        quantity: number | null;
        request_id: string;
      }[]
    | null;
}

export default function SupervisorDeliveryPortal() {
  const { t, currency } = useLocalization();
  const { formatShortDate } = useDateFormat();
  useRouteTranslations();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedProject } = useSupervisorProject();
  const [deliveries, setDeliveries] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('today');
  const [deliveryPhotoCounts, setDeliveryPhotoCounts] = useState<Record<string, number>>({});

  const fetchDeliveries = useCallback(async (showRefreshToast = false) => {
    if (!selectedProject) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setRefreshing(showRefreshToast);

      // Fetch POs with status 'sent' or 'in_transit' for selected project
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          purchase_order_number,
          expected_delivery_date,
          status,
          supplier_id,
          project_id,
          purchase_request_id,
          total_amount,
          currency_id,
          suppliers (
            name,
            contact_email
          ),
          projects (
            name,
            construction_address
          )
        `)
        .eq('project_id', selectedProject)
        .in('status', ['sent', 'in_transit', 'acknowledged'])
        .order('expected_delivery_date', { ascending: true });

      if (error) throw error;

      const purchaseOrders = data ?? [];

      const requestIds = purchaseOrders
        .map(po => po.purchase_request_id)
        .filter((id): id is string => Boolean(id));

      let itemsByRequest = new Map<string, PurchaseOrder['purchase_order_items']>();

      if (requestIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('purchase_request_items')
          .select('id, description, quantity, request_id')
          .in('request_id', requestIds);

        if (itemsError) {
          console.error('Error fetching purchase request items:', itemsError);
        } else if (itemsData) {
          itemsByRequest = itemsData.reduce((map, item) => {
            const list = map.get(item.request_id) ?? [];
            list.push(item);
            map.set(item.request_id, list);
            return map;
          }, new Map<string, PurchaseOrder['purchase_order_items']>());
        }
      }

      const enrichedDeliveries = purchaseOrders.map(po => ({
        ...po,
        purchase_order_items: itemsByRequest.get(po.purchase_request_id) ?? [],
      }));

      setDeliveries(enrichedDeliveries);

      if (showRefreshToast) {
        toast({
          title: t("supervisor.refreshed"),
          description: t("supervisor.foundDeliveries", { count: data?.length || 0 }),
        });
      }
    } catch (error: any) {
      console.error('Error fetching deliveries:', error);
      toast({
        title: t('common.errorTitle'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedProject, toast, t]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleRefresh = async () => {
    fetchDeliveries(true);
  };

  const handleConfirmDelivery = (poId: string) => {
    navigate(`/supervisor/deliveries/${poId}/verify`);
  };

  const handlePhotosLoaded = useCallback((poId: string, count: number) => {
    setDeliveryPhotoCounts(prev => {
      if (prev[poId] === count) return prev;
      return { ...prev, [poId]: count };
    });
  }, []);

  const filterDeliveries = (tab: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    return deliveries.filter(delivery => {
      if (!delivery.expected_delivery_date) return tab === 'all';

      const deliveryDate = new Date(delivery.expected_delivery_date);
      deliveryDate.setHours(0, 0, 0, 0);

      switch (tab) {
        case 'today':
          return deliveryDate.getTime() === today.getTime();
        case 'week':
          return deliveryDate <= weekFromNow && deliveryDate >= today;
        case 'all':
          return true;
        default:
          return true;
      }
    });
  };

  const getItemsCount = (delivery: PurchaseOrder) =>
    delivery.purchase_order_items?.length ?? '...';

  const isDeliveryToday = (date: string | null) => {
    if (!date) return false;
    const today = new Date();
    const deliveryDate = new Date(date);
    return deliveryDate.toDateString() === today.toDateString();
  };

  // Extract material tags from item descriptions
  const getMaterialTags = (delivery: PurchaseOrder): string[] => {
    const tags = new Set<string>();
    const materialKeywords: Record<string, string> = {
      steel: '#STEEL',
      concrete: '#CONCRETE',
      cement: '#CEMENT',
      brick: '#BRICK',
      wood: '#WOOD',
      lumber: '#LUMBER',
      rebar: '#REBAR',
      pipe: '#PIPE',
      electrical: '#ELECTRICAL',
      plumbing: '#PLUMBING',
    };

    delivery.purchase_order_items?.forEach(item => {
      const description = (item.description || '').toLowerCase();
      Object.entries(materialKeywords).forEach(([keyword, tag]) => {
        if (description.includes(keyword)) {
          tags.add(tag);
        }
      });
    });

    return Array.from(tags).slice(0, 3); // Limit to 3 tags
  };

  const getDeliveryStatus = (delivery: PurchaseOrder): 'on_track' | 'delayed' | 'completed' => {
    if (delivery.status === 'delivered') return 'completed';
    if (delivery.expected_delivery_date) {
      const expected = new Date(delivery.expected_delivery_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expected < today) return 'delayed';
    }
    return 'on_track';
  };

  const filteredDeliveries = filterDeliveries(activeTab);

  if (loading) {
    return (
      <>
        <div className="supervisor-mobile w-full min-h-screen pb-32 bg-background">
          <div className="p-4 space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
        <MobileBottomNav />
      </>
    );
  }

  return (
    <>
      <PullToRefresh onRefresh={handleRefresh} disabled={refreshing}>
        <div className="supervisor-mobile w-full min-h-screen pb-32 bg-background">
          <MobileHeader
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />

        <div className="w-full p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{t("supervisor.todayDeliveries")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("supervisor.confirmDeliveryDesc")}
              </p>
            </div>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} variant="pill" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="today">
                {t("supervisor.tabToday")}
                {filterDeliveries('today').length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filterDeliveries('today').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="week">
                {t("supervisor.tabWeek")}
                {filterDeliveries('week').length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filterDeliveries('week').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">{t("supervisor.tabAll")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-4 mt-4">
            {filteredDeliveries.length === 0 ? (
              <EmptyState
                icon={Package}
                title={t("supervisor.noExpectedDeliveries")}
                description={
                  activeTab === 'today'
                    ? t("supervisor.noDeliveriesToday")
                    : activeTab === 'week'
                    ? t("supervisor.noDeliveriesWeek")
                    : t("supervisor.noPendingDeliveries")
                }
                iconClassName="text-primary"
              />
            ) : (
              filteredDeliveries.map(delivery => {
                const supplierName = delivery.suppliers?.name ?? 'Unknown supplier';
                const projectName = delivery.projects?.name ?? 'Project';
                const totalAmount = delivery.total_amount ?? 0;
                const materialTags = getMaterialTags(delivery);
                const photoCount = deliveryPhotoCounts[delivery.id] || 0;
                const deliveryStatus = getDeliveryStatus(delivery);

                return (
                <Card
                  key={delivery.id}
                  className={`cursor-pointer transition-all hover:shadow-lg border-2 ${
                    isDeliveryToday(delivery.expected_delivery_date) ? 'border-primary shadow-md' : ''
                  }`}
                  onClick={() => handleConfirmDelivery(delivery.id)}
                >
                  {/* Enhanced Header with Status */}
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {t('procurement.purchaseOrderNumber', { number: delivery.purchase_order_number })}
                          </CardTitle>
                          <StatusIndicator status={deliveryStatus} variant="dot" size="md" />
                        </div>
                        <CardDescription className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {supplierName || t('procurement.delivery.unknownSupplier')}
                        </CardDescription>
                      </div>
                      {isDeliveryToday(delivery.expected_delivery_date) && (
                        <Badge className="bg-primary text-primary-foreground">{t('procurement.delivery.today')}</Badge>
                      )}
                    </div>

                    {/* Material Tags */}
                    {materialTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {materialTags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs font-mono">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Photo Gallery - Larger, More Prominent */}
                    <div className="relative">
                      <DeliveryPhotoGallery
                        purchaseOrderId={delivery.id}
                        status={delivery.status}
                        onPhotosLoaded={(count) => handlePhotosLoaded(delivery.id, count)}
                      />
                      {photoCount > 0 && (
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded-md text-xs font-semibold backdrop-blur-sm flex items-center gap-1">
                          <Image className="h-3 w-3" />
                          {photoCount} {photoCount === 1 ? t('common.photo') : t('common.photos')}
                        </div>
                      )}
                    </div>

                    <div className="text-sm space-y-2">
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">{t('procurement.delivery.deliverySite')}</p>
                        <p className="font-semibold">{projectName}</p>
                      </div>

                      {delivery.expected_delivery_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {formatShortDate(delivery.expected_delivery_date)}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            ({formatDistance(new Date(delivery.expected_delivery_date), new Date(), { addSuffix: true })})
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{t('procurement.delivery.itemsCount', { count: getItemsCount(delivery) })}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-semibold">
                          {currency} {totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <ProcurementStatusBadge
                        entityType="purchase_order"
                        status={delivery.status}
                        size="default"
                      />
                      <Button size="sm" className="gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {t("procurement.delivery.confirmDelivery")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
              })
            )}
          </div>
        </div>
      </div>
      </PullToRefresh>

      <MobileBottomNav />
    </>
  );
}
