import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, XCircle, AlertCircle, Package, User, Calendar, Image as ImageIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useLocalization } from '@/contexts/LocalizationContext'
import { formatDate } from '@/utils/formatters'

interface DeliveryConfirmation {
  id: string
  delivery_date: string
  status: 'full' | 'partial' | 'damaged' | 'pending'
  notes: string | null
  delivered_by: string | null
  received_by: string | null
  created_at: string
  photos: string[]
}

interface DeliveryTimelineProps {
  deliveries: DeliveryConfirmation[]
  expectedDeliveryDate?: string | null
}

export function DeliveryTimeline({ deliveries, expectedDeliveryDate }: DeliveryTimelineProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const { dateFormat, t } = useLocalization()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'full':
        return <CheckCircle2 className="h-5 w-5 text-success" />
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-warning" />
      case 'damaged':
        return <XCircle className="h-5 w-5 text-destructive" />
      default:
        return <Package className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      full: 'default',
      partial: 'secondary',
      damaged: 'destructive'
    }
    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    )
  }

  if (deliveries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('procurement.deliveryHistory')}
          </CardTitle>
          {expectedDeliveryDate && (
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('procurement.expected')}: {formatDate(expectedDeliveryDate, dateFormat)}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('procurement.noDeliveries')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          {t('procurement.deliveryHistory')}
        </CardTitle>
        {expectedDeliveryDate && (
          <CardDescription className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('procurement.expected')}: {formatDate(expectedDeliveryDate, dateFormat)}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {deliveries.map((delivery, index) => (
            <div key={delivery.id} className="relative">
              {index !== deliveries.length - 1 && (
                <div className="absolute left-[9px] top-8 h-full w-0.5 bg-border" />
              )}
              
              <div className="flex gap-4">
                <div className="relative flex-shrink-0">
                  {getStatusIcon(delivery.status)}
                </div>
                
                <div className="flex-1 space-y-2 pb-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {formatDate(delivery.delivery_date, dateFormat)}
                        </p>
                        {getStatusBadge(delivery.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(delivery.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  
                  {delivery.notes && (
                    <p className="text-sm text-foreground">
                      {delivery.notes}
                    </p>
                  )}

                  {delivery.photos && delivery.photos.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <ImageIcon className="h-4 w-4" />
                        Photos ({delivery.photos.length})
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {delivery.photos.map((photo, idx) => (
                          <Dialog key={idx}>
                            <DialogTrigger asChild>
                              <button
                                className="relative aspect-square rounded-lg overflow-hidden border bg-muted hover:opacity-80 transition-opacity"
                                onClick={() => setSelectedPhoto(photo)}
                              >
                                <img
                                  src={photo}
                                  alt={`Delivery photo ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>{`Delivery photo ${idx + 1}`}</DialogTitle>
                              </DialogHeader>
                              <img
                                src={photo}
                                alt={`Delivery photo ${idx + 1}`}
                                className="w-full h-auto rounded-lg"
                              />
                            </DialogContent>
                          </Dialog>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {delivery.delivered_by && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Delivered by: {delivery.delivered_by}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
