// Story 3.6: PO Status Timeline Component
// Visual timeline showing purchase order progression

import { CheckCircle, FileText, Send, Package, Truck, XCircle, AlertCircle } from 'lucide-react'
import type { POStatus } from './POStatusBadge'

interface StatusStep {
  key: POStatus
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const NORMAL_FLOW: StatusStep[] = [
  { key: 'draft', label: 'Draft Created', icon: FileText },
  { key: 'sent', label: 'Sent to Supplier', icon: Send },
  { key: 'acknowledged', label: 'Acknowledged by Supplier', icon: CheckCircle },
  { key: 'in_transit', label: 'In Transit', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
]

interface POStatusTimelineProps {
  currentStatus: POStatus
  className?: string
}

export const POStatusTimeline: React.FC<POStatusTimelineProps> = ({
  currentStatus,
  className = '',
}) => {
  // Handle special statuses (cancelled, disputed)
  if (currentStatus === 'cancelled') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-100 text-red-600">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold text-red-600">Purchase Order Cancelled</div>
            <div className="text-sm text-muted-foreground">
              This purchase order has been cancelled
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (currentStatus === 'disputed') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-orange-100 text-orange-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold text-orange-600">Disputed</div>
            <div className="text-sm text-muted-foreground">
              There is a dispute with this purchase order
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Find current step index
  const currentIndex = NORMAL_FLOW.findIndex((step) => step.key === currentStatus)

  return (
    <div className={`space-y-2 ${className}`}>
      {NORMAL_FLOW.map((step, index) => {
        const isComplete = index < currentIndex
        const isCurrent = index === currentIndex
        const isFuture = index > currentIndex
        const isLast = index === NORMAL_FLOW.length - 1

        const StepIcon = step.icon

        return (
          <div key={step.key} className="relative">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className={`
                  relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                  ${isComplete ? 'bg-green-600 text-white' : ''}
                  ${isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-200' : ''}
                  ${isFuture ? 'bg-gray-200 text-gray-400' : ''}
                `}
              >
                {isComplete ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
              </div>

              {/* Label */}
              <div className="flex-1 pb-8">
                <div
                  className={`font-medium ${
                    isComplete || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </div>
                {isCurrent && (
                  <div className="text-sm text-blue-600 font-medium mt-1">Current Status</div>
                )}
                {isComplete && (
                  <div className="text-sm text-green-600 mt-1">Completed</div>
                )}
                {isFuture && (
                  <div className="text-sm text-muted-foreground mt-1">Pending</div>
                )}
              </div>
            </div>

            {/* Connecting line */}
            {!isLast && (
              <div
                className={`absolute left-5 top-10 w-0.5 h-8 -translate-x-1/2 ${
                  isComplete ? 'bg-green-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
