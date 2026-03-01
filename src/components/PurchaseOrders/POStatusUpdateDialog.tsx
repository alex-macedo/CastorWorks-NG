// Story 3.7: PO Status Update Dialog
// Allows project managers to manually update purchase order status

import { useState } from 'react'
import { useLocalization } from '@/contexts/LocalizationContext'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { POStatusBadge, type POStatus } from './POStatusBadge'

// Define valid status transitions
const STATUS_TRANSITIONS: Record<POStatus, POStatus[]> = {
  draft: ['sent', 'acknowledged', 'cancelled'],
  sent: ['acknowledged', 'in_transit', 'cancelled', 'disputed'],
  acknowledged: ['in_transit', 'cancelled', 'disputed'],
  in_transit: ['delivered', 'disputed', 'cancelled'],
  delivered: [], // Final state
  cancelled: [], // Final state
  disputed: ['in_transit', 'delivered', 'cancelled'],
}

const STATUS_LABELS: Record<POStatus, string> = {
  draft: 'Draft',
  sent: 'Sent to Supplier',
  acknowledged: 'Acknowledged by Supplier',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
}

interface POStatusUpdateDialogProps {
  purchaseOrder: {
    id: string
    purchase_order_number: string
    status: POStatus
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateStatus: (newStatus: POStatus, note: string) => Promise<void>
}

export const POStatusUpdateDialog: React.FC<POStatusUpdateDialogProps> = ({
  purchaseOrder,
  open,
  onOpenChange,
  onUpdateStatus,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<POStatus | ''>('')
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const availableStatuses = STATUS_TRANSITIONS[purchaseOrder.status] || []

  const handleSubmit = async () => {
    if (!selectedStatus) return

    setIsLoading(true)
    try {
      await onUpdateStatus(selectedStatus as POStatus, note)

      // Reset form
      setSelectedStatus('')
      setNote('')
      onOpenChange(false)
    } catch (error) {
      // Error handling done in parent
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setSelectedStatus('')
    setNote('')
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>Update Purchase Order Status</SheetTitle>
          <SheetDescription>
            Update the status of {purchaseOrder.purchase_order_number} to reflect real-world
            progress.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div className="space-y-2">
            <Label>Current Status</Label>
            <div>
              <POStatusBadge status={purchaseOrder.status} />
            </div>
          </div>

          {/* New Status */}
          {availableStatuses.length > 0 ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="new-status">New Status *</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(value) => setSelectedStatus(value as POStatus)}
                >
                  <SelectTrigger id="new-status">
                    <SelectValue placeholder={t("additionalPlaceholders.selectNewStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Note/Reason */}
              <div className="space-y-2">
                <Label htmlFor="note">Note (Optional)</Label>
                <Textarea
                  id="note"
                  placeholder={t("additionalPlaceholders.statusChangeNote")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  This note will be recorded in the activity log.
                </p>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
              This purchase order is in a final state and cannot be updated.
            </div>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedStatus || isLoading || availableStatuses.length === 0}
          >
            {isLoading ? 'Updating...' : 'Update Status'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
