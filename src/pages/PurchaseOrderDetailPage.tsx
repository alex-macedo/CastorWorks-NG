/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { useParams, useNavigate } from 'react-router-dom'
import { useLocalization } from '@/contexts/LocalizationContext'
import { ArrowLeft, Package, Calendar, FileText, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders'
import { useDeliveryConfirmations } from '@/hooks/useDeliveryConfirmations'
import { DeliveryTimeline } from '@/components/PurchaseOrders/DeliveryTimeline'
import { CreateDeliverySheet } from '@/components/PurchaseOrders/CreateDeliverySheet'
import { POStatusBadge } from '@/components/PurchaseOrders/POStatusBadge'
import { PODeliveryStatus } from '@/components/PurchaseOrders/PODeliveryStatus'
import { Loader2 } from 'lucide-react'
import { formatCurrency } from '@/utils/formatters'
import { useDateFormat } from '@/hooks/useDateFormat';
import { SidebarHeaderShell } from "@/components/Layout/SidebarHeaderShell";

export default function PurchaseOrderDetailPage() {
  const { t } = useLocalization()
  const { formatLongDate, formatShortDate } = useDateFormat();
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { purchaseOrders, isLoading: poLoading } = usePurchaseOrders()
  const {
    data: deliveryConfirmations = [],
    isLoading: deliveriesLoading,
  } = useDeliveryConfirmations(id)

  const purchaseOrder = purchaseOrders.find(po => po.id === id)

  if (poLoading || deliveriesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!purchaseOrder) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t('procurement.purchaseOrderDetail.notFound')}</h2>
          <Button onClick={() => navigate('/purchase-orders')}>
            {t('procurement.purchaseOrderDetail.backButton')}
          </Button>
        </div>
      </div>
    )
  }

  const getDeliveryStatus = (): 'not_delivered' | 'partial' | 'delivered' | 'damaged' => {
    if (deliveryConfirmations.length === 0) return 'not_delivered'
    if (deliveryConfirmations.some(d => d.status === 'damaged')) return 'damaged'
    if (deliveryConfirmations.some(d => d.status === 'full')) return 'delivered'
    return 'partial'
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <SidebarHeaderShell>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{purchaseOrder.purchase_order_number}</h1>
            <p className="text-muted-foreground">
              {purchaseOrder.projects?.name || t('procurement.purchaseOrderDetail.noProject')} • {purchaseOrder.suppliers?.name || t('procurement.purchaseOrderDetail.unknownSupplier')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <POStatusBadge status={purchaseOrder.status as any} />
            <PODeliveryStatus 
              status={getDeliveryStatus()} 
              deliveryCount={deliveryConfirmations.length}
            />
          </div>
        </div>
      </SidebarHeaderShell>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('procurement.purchaseOrderDetail.totalAmount')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(purchaseOrder.total_amount, purchaseOrder.currency_id as any)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('procurement.purchaseOrderDetail.expectedDelivery')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">
              {purchaseOrder.expected_delivery_date 
                ? formatLongDate(new Date(purchaseOrder.expected_delivery_date))
                : t('procurement.purchaseOrderDetail.notSet')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('procurement.deliveries')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryConfirmations.length}</div>
            <p className="text-xs text-muted-foreground">
              {deliveryConfirmations.length === 0 ? t('procurement.purchaseOrderDetail.noDeliveriesYet') : t('procurement.purchaseOrderDetail.totalDeliveries')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('procurement.items')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">
              {purchaseOrder.purchase_order_items?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('procurement.purchaseOrderDetail.itemsOrdered')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('procurement.purchaseOrderDetail.orderInformation')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('procurement.project')}</p>
                <p className="text-base">{purchaseOrder.projects?.name || 'N/A'}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('procurement.supplier')}</p>
                <p className="text-base">{purchaseOrder.suppliers?.name || 'N/A'}</p>
              </div>
              <Separator />
                <div>
                <p className="text-sm font-medium text-muted-foreground">{t('procurement.created')}</p>
                <p className="text-base">{formatLongDate(new Date(purchaseOrder.created_at))}</p>
              </div>
              {purchaseOrder.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('procurement.notes')}</p>
                    <p className="text-base">{purchaseOrder.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('procurement.items')}</CardTitle>
              <CardDescription>{t('procurement.purchaseOrderDetail.itemsIncluded')}</CardDescription>
            </CardHeader>
            <CardContent>
              {purchaseOrder.purchase_order_items && purchaseOrder.purchase_order_items.length > 0 ? (
                <div className="space-y-4">
                  {purchaseOrder.purchase_order_items.map((item: any) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm font-semibold">
                          {formatCurrency(item.quantity * item.unit_price, purchaseOrder.currency_id as any)}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>{t('procurement.purchaseOrderDetail.quantityLabel')} {item.quantity} {item.unit}</p>
                        <p>{t('procurement.purchaseOrderDetail.unitPriceLabel')} {formatCurrency(item.unit_price, purchaseOrder.currency_id as any)}</p>
                        {item.notes && <p className="italic">{t('procurement.purchaseOrderDetail.noteLabel')} {item.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('procurement.noItems')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="flex justify-end">
            <CreateDeliverySheet purchaseOrderId={id!} />
          </div>
          
          <DeliveryTimeline 
            deliveries={deliveryConfirmations}
            expectedDeliveryDate={purchaseOrder.expected_delivery_date}
          />
        </div>
      </div>
    </div>
  )
}
