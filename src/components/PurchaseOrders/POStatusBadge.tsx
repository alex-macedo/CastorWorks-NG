// Story 3.5: PO Status Badge Component
// Displays color-coded status badges for purchase orders

import { Badge } from '@/components/ui/badge'
import { useLocalization } from '@/contexts/LocalizationContext'

export type POStatus = 'draft' | 'sent' | 'acknowledged' | 'in_transit' | 'delivered' | 'cancelled' | 'disputed'

interface POStatusBadgeProps {
  status: POStatus
  className?: string
}

const statusColorConfig: Record<POStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  sent: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  acknowledged: 'bg-green-100 text-green-800 hover:bg-green-100',
  in_transit: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  delivered: 'bg-green-600 text-white hover:bg-green-600',
  cancelled: 'bg-red-100 text-red-800 hover:bg-red-100',
  disputed: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
}

export const POStatusBadge: React.FC<POStatusBadgeProps> = ({ status, className = '' }) => {
  const { t } = useLocalization()
  const colorClass = statusColorConfig[status]
  const label = t(`procurement.status.${status}`)

  return (
    <Badge className={`${colorClass} ${className}`}>
      {label}
    </Badge>
  )
}
