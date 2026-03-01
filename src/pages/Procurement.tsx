import { Plus, Package, Clock, TrendingDown, Filter, Send, FileText, Trash2, DollarSign, Truck, AlertCircle, Search, X, Mail, Eye, ChevronDown, ChevronUp, LayoutGrid, List, Phone, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useLocalization } from "@/contexts/LocalizationContext";
import { useRouteTranslations } from "@/hooks/useRouteTranslations";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useQuotes } from "@/hooks/useQuotes";
import { formatCurrency } from "@/utils/formatters";
import { formatDateSystem } from "@/utils/dateSystemFormatters";
import { SupplierForm } from "@/components/Suppliers/SupplierForm";
import { RequestDetailsDialog } from "@/components/Procurement/RequestDetailsDialog";
import { QuoteApprovalDialog } from "@/components/Procurement/QuoteApprovalDialog";
import { QuoteApprovalHistoryDialog } from "@/components/Procurement/QuoteApprovalHistoryDialog";
import { QuoteRequestDialog } from "@/components/Procurement/QuoteRequestDialog";
import { QuoteRequestHistoryTable } from "@/components/Procurement/QuoteRequestHistoryTable";
import { ProcurementDashboard } from "@/components/Procurement/ProcurementDashboard";
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMultiFilter } from "@/hooks/useMultiFilter";
import { MultiSelect } from "@/components/ui/multi-select";
import { usePaymentStats, usePaymentDashboard } from "@/hooks/usePayments";
import { useDeliveryConfirmations } from "@/hooks/useDeliveryConfirmations";
import { useProcurementPrediction } from "@/hooks/useProcurementPrediction";
import { ProcurementAIRecommendations } from "@/components/Procurement/ProcurementAIRecommendations";
import { AICacheHeader } from "@/components/AI/AICacheHeader";
import { SupplierScoreBadge } from "@/components/Procurement/SupplierScoreBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const getStableSupplierScore = (supplierId?: string, supplierName?: string) => {
  const source = supplierId || supplierName || "supplier";
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 31 + source.charCodeAt(i)) % 31;
  }
  return 70 + (hash % 31);
};

const Procurement = () => {
  useRouteTranslations(); // Load translations for this route
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'dashboard';
  const [quoteRequestDialogOpen, setQuoteRequestDialogOpen] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState<string[]>([]);
  const [requestSupplierFilter, setRequestSupplierFilter] = useState<string[]>([]);
  const [requestProjectFilter, setRequestProjectFilter] = useState<string[]>([]);
  
  // Search and filter states
  const [poSearch, setPoSearch] = useState("");
  const [poStatusFilter, setPoStatusFilter] = useState("all");
  const [purchaseOrdersViewMode, setPurchaseOrdersViewMode] = useState<"list" | "cards">("cards");
  const [deliverySearch, setDeliverySearch] = useState("");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState("all");
  const [deliveriesViewMode, setDeliveriesViewMode] = useState<"list" | "cards">("cards");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentsViewMode, setPaymentsViewMode] = useState<"list" | "cards">("cards");
  const [quotesViewMode, setQuotesViewMode] = useState<"list" | "cards">("cards");
  
  const { t, currency } = useLocalization();
  const { purchaseRequests, isLoading: requestsLoading, deleteRequest } = usePurchaseRequests();
  const { suppliers, isLoading: suppliersLoading, deleteSupplier } = useSuppliers();
  const { quotes, isLoading: quotesLoading } = useQuotes();
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'supplier' | 'request'>('supplier');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approved' | 'rejected'>('approved');
  const [selectedQuote, setSelectedQuote] = useState<{
    id: string;
    name: string;
    supplier: string;
  } | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());

  const handleViewDetails = (id: string) => {
    navigate(`/purchase-orders/${id}`);
  };

  const toggleRequestExpansion = (requestId: string) => {
    setExpandedRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
  };

  // Read status filter from URL parameters for requests
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      const statuses = statusParam.split(',');
      setRequestStatusFilter(statuses);
    }
  }, [searchParams]);

  // Fetch purchase orders
  const { data: purchaseOrders, refetch: refetchPurchaseOrders } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('purchase_orders')
        .select('*, suppliers(name), projects(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch payment stats
  const { data: paymentStats } = usePaymentStats() as any;
  
  // Fetch payment dashboard
  const { data: paymentDashboard } = usePaymentDashboard() as any;
  
  // Fetch delivery confirmations
  const { data: deliveryConfirmations } = useDeliveryConfirmations() as any;

  // AI Predictions
  const { prediction, isLoading: predictionLoading, predict, refresh } = useProcurementPrediction();

  // Use ref to ensure prediction only runs once on mount
  const hasLoadedPrediction = useRef(false);

  useEffect(() => {
    // Load initial predictions only once
    if (!hasLoadedPrediction.current) {
      hasLoadedPrediction.current = true;
      predict('30');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount


  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('procurement-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_orders'
        },
        () => {
          refetchPurchaseOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_transactions'
        },
        () => {
          refetchPurchaseOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delivery_confirmations'
        },
        () => {
          refetchPurchaseOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchPurchaseOrders]);

  const filterGroups = useMemo(() => ({
    status: requestStatusFilter,
    supplier_id: requestSupplierFilter,
    project_id: requestProjectFilter,
  }), [requestStatusFilter, requestSupplierFilter, requestProjectFilter]);

  const filteredRequests = useMultiFilter(purchaseRequests || [], filterGroups).filter((request: any) => {
    const matchesText = !filterText || 
      request.description?.toLowerCase().includes(filterText.toLowerCase()) ||
      request.requested_by?.toLowerCase().includes(filterText.toLowerCase()) ||
      request.projects?.name?.toLowerCase().includes(filterText.toLowerCase());
    
    const matchesPriority = !filterPriority || request.priority === filterPriority;
    
    return matchesText && matchesPriority;
  });

  const activePOs = (purchaseOrders as any[] || [])?.filter((po: any) => po.status !== 'delivered' && po.status !== 'cancelled') || [];
  const pendingDeliveries = (deliveryConfirmations as any[] || [])?.filter((d: any) => d.status === 'pending') || [];
  const overduePayments = (paymentDashboard as any[] || [])?.filter((p: any) => p.is_overdue) || [];

  // Filtered purchase orders
  const filteredPurchaseOrders = useMemo(() => {
    if (!purchaseOrders) return [];
    
    return (purchaseOrders as any[]).filter(po => {
      const matchesSearch = !poSearch || 
        po.purchase_order_number?.toLowerCase().includes(poSearch.toLowerCase()) ||
        po.suppliers?.name?.toLowerCase().includes(poSearch.toLowerCase()) ||
        po.projects?.name?.toLowerCase().includes(poSearch.toLowerCase());
      
      const matchesStatus = poStatusFilter === 'all' || po.status === poStatusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, poSearch, poStatusFilter]);

  // Filtered deliveries
  const filteredDeliveries = useMemo(() => {
    if (!deliveryConfirmations) return [];
    
    return (deliveryConfirmations as any[]).filter((delivery: any) => {
      const matchesSearch = !deliverySearch || 
        delivery.purchase_order_id?.toLowerCase().includes(deliverySearch.toLowerCase()) ||
        delivery.confirmed_by_name?.toLowerCase().includes(deliverySearch.toLowerCase());
      
      const matchesStatus = deliveryStatusFilter === 'all' || 
        (deliveryStatusFilter === 'issues' && delivery.has_issues) ||
        delivery.status === deliveryStatusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [deliveryConfirmations, deliverySearch, deliveryStatusFilter]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    if (!paymentDashboard) return [];
    
    return (paymentDashboard as any[]).filter((payment: any) => {
      const matchesSearch = !paymentSearch || 
        payment.purchase_order_number?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
        payment.supplier_name?.toLowerCase().includes(paymentSearch.toLowerCase());
      
      const matchesStatus = paymentStatusFilter === 'all' || 
        (paymentStatusFilter === 'overdue' && payment.is_overdue) ||
        payment.payment_status === paymentStatusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [paymentDashboard, paymentSearch, paymentStatusFilter]);

  return (
    <div className="flex-1 space-y-6">
      <SidebarHeaderShell variant="auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("procurement.title")}</h1>
            <p className="text-sm text-sidebar-primary-foreground/80">{t("procurement.subtitle")}</p>
          </div>
          <Button
            variant="glass-style-white"
            onClick={() => navigate('/procurement/new')}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("procurement.newRequest")}
          </Button>
        </div>
      </SidebarHeaderShell>

      {/* 5 Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{t('procurement.activeRequests')}</p>
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold">{(purchaseRequests as any[])?.filter((r: any) => r.status !== 'approved').length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{t('procurement.activePurchaseOrders')}</p>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <p className="text-3xl font-bold">{(purchaseOrders as any[])?.filter((po: any) => po.status !== 'delivered' && po.status !== 'cancelled').length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{t('procurement.pendingDeliveries')}</p>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Truck className="h-4 w-4 text-orange-500" />
              </div>
            </div>
            <p className="text-3xl font-bold">{(deliveryConfirmations as any[])?.filter((d: any) => d.status === 'pending').length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{t('procurement.paymentsDue')}</p>
              <div className="p-2 rounded-lg bg-warning/10">
                <DollarSign className="h-4 w-4 text-warning" />
              </div>
            </div>
            <p className="text-3xl font-bold">{paymentStats?.pending_count || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(paymentStats?.pending_amount || 0, currency)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{t('procurement.overduePayments')}</p>
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
            </div>
            <p className="text-3xl font-bold text-destructive">{(paymentDashboard as any[])?.filter((p: any) => p.is_overdue).length || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(paymentStats?.overdue_amount || 0, currency)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={defaultTab} variant="pill" className="w-full">
        <div className="relative">
          <TabsList className="flex w-full flex-nowrap gap-0.5 p-1 rounded-xl h-auto min-h-10 justify-start items-center bg-muted/40 border border-border/50 overflow-x-auto scrollbar-hide">
            <TabsTrigger value="dashboard" className="whitespace-nowrap px-3">{t('procurement.dashboard.title')}</TabsTrigger>
            <TabsTrigger value="requests" className="whitespace-nowrap px-3">{t('procurement.requests')}</TabsTrigger>
            <TabsTrigger value="purchase-orders" className="whitespace-nowrap px-3">{t('procurement.purchaseOrders')}</TabsTrigger>
            <TabsTrigger value="deliveries" className="whitespace-nowrap px-3">{t('procurement.deliveries')}</TabsTrigger>
            <TabsTrigger value="payments" className="whitespace-nowrap px-3">{t('procurement.payments')}</TabsTrigger>
            <TabsTrigger value="quotes" className="whitespace-nowrap px-3">{t('procurement.quotes')}</TabsTrigger>
            <TabsTrigger value="suppliers" className="whitespace-nowrap px-3">{t('procurement.suppliers')}</TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4 mt-6">
          <ProcurementDashboard />
        </TabsContent>

        {/* Purchase Requests Tab */}
        <TabsContent value="requests" className="space-y-4 mt-6">
          <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
            <h2 className="text-xl font-bold">{t('procurement.purchaseRequests')}</h2>
            <div className="flex flex-wrap gap-2 items-center">
              <MultiSelect
                options={[
                  { id: 'pending', name: t('procurement.statusLabels.pending') },
                  { id: 'quoted', name: t('procurement.statusLabels.quoted') },
                  { id: 'approved', name: t('procurement.statusLabels.approved') },
                ]}
                selected={requestStatusFilter}
                onChange={setRequestStatusFilter}
                placeholder={t('procurement.filterByStatus')}
                className="w-[180px]"
              />
              <MultiSelect
                options={(suppliers?.map(s => ({ id: s.id, name: s.name })) || []) as any}
                selected={requestSupplierFilter}
                onChange={setRequestSupplierFilter}
                placeholder={t('procurement.filterBySupplier')}
                className="w-[180px]"
              />
              <MultiSelect
                options={(Array.from(new Set((purchaseRequests as any[])?.map((r: any) => r.projects?.id).filter(Boolean))).map(id => ({
                  id: id!,
                  name: (purchaseRequests as any[])?.find((r: any) => r.projects?.id === id)?.projects?.name || 'N/A'
                }))) as any}
                selected={requestProjectFilter}
                onChange={setRequestProjectFilter}
                placeholder={t('procurement.filterByProject')}
                className="w-[180px]"
              />
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="space-y-2">
            {prediction && (
              <div className="flex justify-end">
                <AICacheHeader
                  lastUpdated={prediction.generatedAt}
                  cached={prediction.cached}
                  onRefresh={() => refresh('30')}
                  isRefreshing={predictionLoading}
                />
              </div>
            )}
            <ProcurementAIRecommendations 
              recommendations={prediction?.recommendations}
              isLoading={predictionLoading}
            />
          </div>

          <div className="space-y-3">
            {requestsLoading ? (
              <p className="text-muted-foreground text-center col-span-2">{t('procurement.loadingRequests')}</p>
            ) : filteredRequests && filteredRequests.length > 0 ? (
              filteredRequests
                .map((request: any) => {
                const isExpanded = expandedRequests.has(request.id);
                return (
                  <Card key={request.id} className="transition-all">
                    <CardContent className="p-4">
                      {/* Compact One-Line View */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Project */}
                          <div className="min-w-[180px]">
                            <p className="text-xs text-muted-foreground">{t('procurement.project')}</p>
                            <p className="font-medium text-sm truncate">{request.projects?.name || 'N/A'}</p>
                          </div>

                          {/* Requested By */}
                          <div className="min-w-[140px]">
                            <p className="text-xs text-muted-foreground">{t('procurement.requestedBy')}</p>
                            <p className="font-medium text-sm truncate">{request.requested_by || 'N/A'}</p>
                          </div>

                          {/* Request Date */}
                          <div className="min-w-[120px]">
                            <p className="text-xs text-muted-foreground">{t('procurement.requestDate')}</p>
                            <p className="font-medium text-sm">{formatDateSystem(request.created_at)}</p>
                          </div>

                          {/* Required Date */}
                          <div className="min-w-[120px]">
                            <p className="text-xs text-muted-foreground">{t('procurement.requiredDate')}</p>
                            <p className="font-medium text-sm">
                              {request.delivery_date ? formatDateSystem(request.delivery_date) : 'N/A'}
                            </p>
                          </div>

                          {/* Status Badges */}
                          <div className="flex items-center gap-2 min-w-[200px]">
                            {(() => {
                              let normalizedPriority = (request.priority as any);
                              if (normalizedPriority === "procurement.priorityLabels.urgent") {
                                normalizedPriority = "urgent";
                              }
                              return (
                                <Badge
                                  variant={
                                    normalizedPriority === "high"
                                      ? "destructive"
                                      : normalizedPriority === "medium"
                                      ? "warning"
                                      : "secondary"
                                  }
                                >
                                  {t(`procurement.priorityLabels.${normalizedPriority}`)}
                                </Badge>
                              );
                            })()}
                            <Badge
                              variant={
                                request.status === "pending"
                                  ? "warning"
                                  : request.status === "quoted"
                                  ? "info"
                                  : "success"
                              }
                            >
                              {t(`procurement.statusLabels.${request.status}`)}
                            </Badge>
                          </div>
                        </div>

                        {/* Expand/Collapse Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRequestExpansion(request.id)}
                          className="flex-shrink-0"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              {t('common.collapse')}
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              {t('common.expand')}
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          {/* Action buttons */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Empty space for future content */}
                            </div>
                            <div className="flex gap-2">
                              {request.status === 'pending' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="default"
                                      size="icon"
                                      onClick={() => {
                                        setSelectedRequestId(request.id);
                                        setQuoteRequestDialogOpen(true);
                                      }}
                                    >
                                      <Mail className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{t('procurement.sendQuoteRequests')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      setDeletingId(request.id);
                                      setDeleteType('request');
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('common.delete')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>

                          {/* Items */}
                          <div className="border-t pt-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                              {t('procurement.items')} ({request.purchase_request_items?.length || 0})
                            </h4>
                            <div className="space-y-2">
                              {request.purchase_request_items?.slice(0, 2).map((item: any) => (
                                <div key={item.id} className="bg-muted/50 rounded p-2">
                                  <p className="font-medium text-sm">{item.description}</p>
                                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                                    <span>{item.quantity} {item.unit}</span>
                                    {item.estimated_total_price && (
                                      <span className="font-semibold text-primary">
                                        {formatCurrency(item.estimated_total_price, currency)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {request.purchase_request_items && request.purchase_request_items.length > 2 && (
                                <p className="text-xs text-muted-foreground">
                                  +{request.purchase_request_items.length - 2} {t('procurement.noItems')}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Notes */}
                          {request.notes && (
                            <div className="border-t pt-3 text-xs">
                              <p className="text-muted-foreground font-semibold mb-1">{t('procurement.notes')}</p>
                              <p className="text-muted-foreground line-clamp-2">{request.notes}</p>
                            </div>
                          )}

                          {/* Quote Request History */}
                          <div className="border-t pt-3">
                            <QuoteRequestHistoryTable purchaseRequestId={request.id} requestStatus={request.status} />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <p className="text-muted-foreground text-center">{t('procurement.noPurchaseRequests')}</p>
            )}
          </div>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders" className="space-y-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{t('procurement.purchaseOrders')}</h2>
            <div className="flex items-center gap-2">
              <ToggleGroup
                type="single"
                value={purchaseOrdersViewMode}
                onValueChange={(value) => value && setPurchaseOrdersViewMode(value as "list" | "cards")}
              >
                <ToggleGroupItem value="cards" aria-label={t("common.ariaLabels.cardView")}>
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label={t("common.ariaLabels.listView")}>
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
              <Button onClick={() => navigate('/purchase-orders')}>{t('procurement.viewAll')}</Button>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('procurement.searchPO')}
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
                className="pl-10 pr-10"
              />
              {poSearch && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setPoSearch("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Select value={poStatusFilter} onValueChange={setPoStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('procurement.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('procurement.allStatus')}</SelectItem>
                <SelectItem value="pending">{t('procurement.statusLabels.pending')}</SelectItem>
                <SelectItem value="confirmed">{t('procurement.confirmed')}</SelectItem>
                <SelectItem value="shipped">{t('procurement.shipped')}</SelectItem>
                <SelectItem value="delivered">{t('procurement.statusLabels.delivered')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={purchaseOrdersViewMode === "cards" ? "grid gap-4 md:grid-cols-3" : "space-y-3"}>
            {filteredPurchaseOrders.length === 0 ? (
              <p className={`text-center text-muted-foreground py-8 ${purchaseOrdersViewMode === "cards" ? "col-span-full" : ""}`}>
                {t('procurement.noPurchaseOrders')}
              </p>
            ) : (
              filteredPurchaseOrders.slice(0, 10).map((po: any) => (
              <Card key={po.id} className="cursor-pointer hover:bg-primary/10/50" onClick={() => handleViewDetails(po.id)}>
                <CardContent className="p-4">
                  {purchaseOrdersViewMode === "cards" ? (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate">{po.purchase_order_number}</h3>
                            <Badge
                              variant={
                                po.status === 'pending' ? 'secondary' :
                                po.status === 'confirmed' ? 'info' :
                                po.status === 'shipped' ? 'warning' :
                                po.status === 'delivered' ? 'success' : 'secondary'
                              }
                            >
                              {t(`procurement.status.${po.status}`)}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg whitespace-nowrap">{formatCurrency(po.total_amount, currency)}</p>
                        </div>
                      </div>

                      <div className="text-sm">
                        <div className="text-muted-foreground">{po.suppliers?.name || '-'}</div>
                      </div>

                      <div className="text-sm">
                        <div className="text-muted-foreground">{po.projects?.name || '-'}</div>
                      </div>

                      <div className="text-sm">
                        <div className="text-muted-foreground">
                          {formatDateSystem(po.expected_delivery_date) || '-'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{po.purchase_order_number}</h3>
                          <Badge variant={
                            po.status === 'pending' ? 'secondary' :
                            po.status === 'confirmed' ? 'info' :
                            po.status === 'shipped' ? 'warning' :
                            po.status === 'delivered' ? 'success' : 'secondary'
                          }>
                            {t(`procurement.status.${po.status}`)}
                          </Badge>
                        </div>
                        <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{t('procurement.supplier')}: {po.suppliers?.name}</span>
                          <span>{t('procurement.project')}: {po.projects?.name}</span>
                          <span>{t('procurement.expected')}: {formatDateSystem(po.expected_delivery_date)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(po.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t('common.view')}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
            )}
          </div>
        </TabsContent>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries" className="space-y-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{t('procurement.recentDeliveries')}</h2>
            <div className="flex items-center gap-2">
              <ToggleGroup
                type="single"
                value={deliveriesViewMode}
                onValueChange={(value) => value && setDeliveriesViewMode(value as "list" | "cards")}
              >
                <ToggleGroupItem value="cards" aria-label={t("common.ariaLabels.cardView")}>
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label={t("common.ariaLabels.listView")}>
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
              <Button onClick={() => navigate('/supervisor/deliveries')}>{t('procurement.viewAll')}</Button>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('procurement.searchDeliveries')}
                value={deliverySearch}
                onChange={(e) => setDeliverySearch(e.target.value)}
                className="pl-10 pr-10"
              />
              {deliverySearch && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setDeliverySearch("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Select value={deliveryStatusFilter} onValueChange={setDeliveryStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('procurement.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('procurement.allStatus')}</SelectItem>
                <SelectItem value="full_delivery">{t('procurement.fullDelivery')}</SelectItem>
                <SelectItem value="partial_delivery">{t('procurement.partialDelivery')}</SelectItem>
                <SelectItem value="issues">{t('procurement.hasIssues')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={deliveriesViewMode === "cards" ? "grid gap-4 md:grid-cols-3" : "space-y-3"}>
            {filteredDeliveries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t('procurement.noDeliveries')}</p>
            ) : (
              filteredDeliveries.slice(0, 10).map((delivery: any) => (
              <Card key={delivery.id} className="cursor-pointer hover:bg-primary/10/50" onClick={() => navigate(`/supervisor/deliveries`)}>
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{t('procurement.purchaseOrderNumber', { number: delivery.purchase_order_id?.substring(0, 8) })}</h3>
                        <Badge variant={delivery.status === 'full_delivery' ? 'success' : 'warning'}>
                          {delivery.status === 'full_delivery' ? t('procurement.full') : t('procurement.partial')}
                        </Badge>
                        {delivery.has_issues && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {t('procurement.issues')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{t('procurement.delivered')}: {formatDateSystem(delivery.delivery_date)}</span>
                        <span>{t('procurement.confirmed')}: {formatDateSystem(delivery.confirmation_date)}</span>
                        <span>{delivery.photo_count || 0} {t('procurement.photos')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/supervisor/deliveries`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t('common.view')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
            )}
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{t('procurement.paymentStatus')}</h2>
            <div className="flex items-center gap-2">
              <ToggleGroup
                type="single"
                value={paymentsViewMode}
                onValueChange={(value) => value && setPaymentsViewMode(value as "list" | "cards")}
              >
                <ToggleGroupItem value="cards" aria-label={t("common.ariaLabels.cardView")}>
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label={t("common.ariaLabels.listView")}>
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
              <Button onClick={() => navigate('/payments')}>{t('procurement.paymentDashboard')}</Button>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('procurement.searchPayments')}
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className="pl-10 pr-10"
              />
              {paymentSearch && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setPaymentSearch("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('procurement.filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('procurement.allStatus')}</SelectItem>
                <SelectItem value="pending">{t('procurement.statusLabels.pending')}</SelectItem>
                <SelectItem value="scheduled">{t('procurement.scheduled')}</SelectItem>
                <SelectItem value="completed">{t('procurement.statusLabels.completed')}</SelectItem>
                <SelectItem value="overdue">{t('procurement.overdue')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={paymentsViewMode === "cards" ? "grid gap-4 md:grid-cols-3" : "space-y-3"}>
            {filteredPayments.length === 0 ? (
              <p className={`text-center text-muted-foreground py-8 ${paymentsViewMode === "cards" ? "col-span-full" : ""}`}>
                {t('procurement.noPayments')}
              </p>
            ) : (
              filteredPayments.slice(0, 10).map((payment: any) => (
              <Card 
                key={payment.transaction_id} 
                className={`cursor-pointer hover:bg-primary/10/50 ${payment.is_overdue ? 'border-destructive' : ''}`}
                onClick={() => navigate(`/payments/${payment.transaction_id}`)}
              >
                <CardContent className="p-4">
                  {paymentsViewMode === "cards" ? (
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{t('procurement.purchaseOrderNumber', { number: payment.purchase_order_number || payment.purchase_order_id })}</h3>
                        <Badge
                          variant={
                            payment.payment_status === 'paid' ? 'success' :
                            payment.payment_status === 'pending' ? 'warning' :
                            'secondary'
                          }
                        >
                          {payment.payment_status}
                        </Badge>
                        {payment.is_overdue && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {t('procurement.overdue')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg whitespace-nowrap ${payment.is_overdue ? 'text-destructive' : ''}`}>
                        {formatCurrency(payment.amount, currency)}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="text-muted-foreground">{payment.supplier_name || '-'}</div>
                  </div>

                  <div className="text-sm">
                    <div className="text-muted-foreground">
                      {formatDateSystem(payment.due_date) || '-'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{t('procurement.purchaseOrderNumber', { number: payment.purchase_order_number || payment.purchase_order_id })}</h3>
                      <Badge variant={
                        payment.payment_status === 'paid' ? 'success' :
                        payment.payment_status === 'pending' ? 'warning' :
                        'secondary'
                      }>
                        {payment.payment_status}
                      </Badge>
                      {payment.is_overdue && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {t('procurement.overdue')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{t('procurement.supplier')}: {payment.supplier_name}</span>
                      <span>{t('procurement.due')}: {formatDateSystem(payment.due_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/payments/${payment.transaction_id}`);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {t('common.view')}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))
        )}
      </div>
    </TabsContent>

    {/* Quotes Tab */}
    <TabsContent value="quotes" className="space-y-6 mt-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">{t('procurement.quoteComparison')}</h2>
          <ToggleGroup
            type="single"
            value={quotesViewMode}
            onValueChange={(value) => value && setQuotesViewMode(value as "list" | "cards")}
          >
            <ToggleGroupItem value="cards" aria-label={t("common.ariaLabels.cardView")}>
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label={t("common.ariaLabels.listView")}>
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <p className="text-muted-foreground mb-6">{t('procurement.quoteComparisonDescription')}</p>
        <div className={quotesViewMode === "cards" ? "grid gap-4 grid-cols-1 md:grid-cols-2" : "space-y-3"}>
          {quotesLoading ? (
            <p className={`text-muted-foreground text-center ${quotesViewMode === "cards" ? "col-span-full" : ""}`}>
              {t('procurement.loadingQuotes')}
            </p>
          ) : quotes && quotes.length > 0 ? (
            quotes.map((quote: any) => {
              const itemDescription = quote.purchase_request_items?.description || t('procurement.requestFields.item');
              const supplierName = quote.suppliers?.name || t('procurement.delivery.unknownSupplier');
              const hasStatus = quote.status === 'approved' || quote.status === 'rejected';
              return (
                <Card key={quote.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2">{itemDescription}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <p className="text-muted-foreground">{t('procurement.requestFields.supplier')}: <span className="text-foreground">{supplierName}</span></p>
                        <p className="text-muted-foreground">{t('procurement.requestFields.unitPrice')}: <span className="text-foreground">{formatCurrency(quote.unit_price, currency)}</span></p>
                        <p className="text-muted-foreground">{t('procurement.requestFields.total')}: <span className="text-primary font-semibold">{formatCurrency(quote.total_price, currency)}</span></p>
                        {quote.delivery_days && (
                          <p className="text-muted-foreground">{t('procurement.requestFields.delivery')}: <span className="text-foreground">{quote.delivery_days} {t('procurement.days')}</span></p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center flex-shrink-0">
                      {hasStatus ? (
                        <>
                          <Badge
                            variant={
                              quote.status === 'approved'
                                ? 'success'
                                : quote.status === 'rejected'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {quote.status === 'approved' ? t('procurement.approved') : t('procurement.rejected')}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedQuote({
                                id: quote.id,
                                name: itemDescription,
                                supplier: supplierName
                              });
                              setHistoryDialogOpen(true);
                            }}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedQuote({
                                id: quote.id,
                                name: itemDescription,
                                supplier: supplierName
                              });
                              setApprovalAction('rejected');
                              setApprovalDialogOpen(true);
                            }}
                          >
                            {t('common.reject')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedQuote({
                                id: quote.id,
                                name: itemDescription,
                                supplier: supplierName
                              });
                              setApprovalAction('approved');
                              setApprovalDialogOpen(true);
                            }}
                          >
                            {t('common.approve')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <p className={`text-muted-foreground text-center ${quotesViewMode === "cards" ? "col-span-full" : ""}`}>
              {t('procurement.noQuotesFound')}
            </p>
          )}
        </div>
      </div>
    </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{t('procurement.suppliers')}</h2>
            <Button variant="default" onClick={() => setSupplierFormOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('procurement.addSupplier')}
            </Button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suppliersLoading ? (
              <p className="text-muted-foreground text-center col-span-3">{t('procurement.loadingSuppliers')}</p>
            ) : suppliers && suppliers.length > 0 ? (
              suppliers.map((supplier) => (
                <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{supplier.name}</h3>
                        <Badge variant="outline" className="mt-1">
                          {t(`procurement.categories.${supplier.category}`)}
                        </Badge>
                      </div>
                      <SupplierScoreBadge score={getStableSupplierScore(supplier.id, supplier.name)} />
                    </div>
                    
                    <div className="space-y-2 text-sm mb-6">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{supplier.contact_email || t('procurement.noEmail')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{supplier.contact_phone || t('procurement.noPhone')}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setEditingSupplier(supplier);
                          setSupplierFormOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {t('common.edit')}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-destructive hover:text-destructive"
                        onClick={() => {
                          setDeletingId(supplier.id);
                          setDeleteType('supplier');
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('common.delete')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-muted-foreground text-center col-span-3">{t('procurement.noSuppliers')}</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <SupplierForm
        open={supplierFormOpen}
        onOpenChange={setSupplierFormOpen}
        supplier={editingSupplier}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === 'supplier' 
                ? t('procurement.deleteSupplierConfirm') 
                : t('procurement.deleteRequestConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deletingId) {
                  if (deleteType === 'supplier') {
                    await deleteSupplier.mutateAsync(deletingId);
                  } else {
                    await deleteRequest.mutateAsync(deletingId);
                  }
                  setDeletingId(null);
                  setDeleteDialogOpen(false);
                }
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedRequestId && (
        <QuoteRequestDialog
          open={quoteRequestDialogOpen}
          onOpenChange={setQuoteRequestDialogOpen}
          purchaseRequestId={selectedRequestId}
        />
      )}

      {selectedQuote && (
        <QuoteApprovalDialog
          open={approvalDialogOpen}
          onOpenChange={setApprovalDialogOpen}
          quoteId={selectedQuote.id}
          quoteName={selectedQuote.name}
          supplierName={selectedQuote.supplier}
          action={approvalAction}
        />
      )}

      {selectedQuote && (
        <QuoteApprovalHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          quoteId={selectedQuote.id}
          quoteName={selectedQuote.name}
          supplierName={selectedQuote.supplier}
        />
      )}
      
      {selectedTransactionId && (
        <RequestDetailsDialog
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          requestId={selectedTransactionId}
        />
      )}
    </div>
  );
};

export default Procurement;
