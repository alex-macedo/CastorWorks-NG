import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, Package, AlertCircle } from 'lucide-react'

interface PODeliveryStatusProps {
  status: 'not_delivered' | 'partial' | 'delivered' | 'damaged'
  deliveryCount?: number
}

export function PODeliveryStatus({ status, deliveryCount = 0 }: PODeliveryStatusProps) {
  const statusConfig = {
    not_delivered: {
      label: 'Not Delivered',
      variant: 'outline' as const,
      icon: Clock,
      className: 'text-muted-foreground'
    },
    partial: {
      label: `Partial (${deliveryCount})`,
      variant: 'secondary' as const,
      icon: Package,
      className: 'text-warning'
    },
    delivered: {
      label: 'Delivered',
      variant: 'default' as const,
      icon: CheckCircle2,
      className: 'text-success'
    },
    damaged: {
      label: 'Has Damaged Items',
      variant: 'destructive' as const,
      icon: AlertCircle,
      className: 'text-destructive'
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className={`h-3 w-3 ${config.className}`} />
      {config.label}
    </Badge>
  )
}
