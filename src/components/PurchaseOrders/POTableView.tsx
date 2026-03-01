// Story 3.5: PO Table View Component (Desktop)
// Displays purchase orders in a table format for desktop

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowUpDown } from 'lucide-react'
import { POStatusBadge, type POStatus } from './POStatusBadge'
import { POQuickActions } from './POQuickActions'
import { useLocalization } from '@/contexts/LocalizationContext'
import { formatCurrency, formatDate } from '@/utils/formatters'

export type SortField = 'po_number' | 'project' | 'supplier' | 'amount' | 'created' | 'sent' | 'delivery'
export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  field: SortField
  direction: SortDirection
}

interface PurchaseOrder {
  id: string
  purchase_order_number: string
  total_amount: number
  currency_id: string
  status: POStatus
  created_at: string
  sent_at: string | null
  expected_delivery_date: string | null
  pdf_url: string | null
  projects: {
    name: string
  }
  suppliers: {
    name: string
  }
}

interface POTableViewProps {
  purchaseOrders: PurchaseOrder[]
  sortConfig: SortConfig
  onSort: (field: SortField) => void
  onViewDetails: (id: string) => void
  onDownloadPDF: (po: PurchaseOrder) => void
  onSendEmail: (po: PurchaseOrder) => void
  onRegeneratePDF: (po: PurchaseOrder) => void
}

const SortIcon: React.FC<{ field: SortField; sortConfig: SortConfig }> = ({ field, sortConfig }) => {
  if (sortConfig.field !== field) {
    return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />
  }
  return (
    <ArrowUpDown
      className={`ml-2 h-4 w-4 ${
        sortConfig.direction === 'asc' ? 'rotate-180' : ''
      }`}
    />
  )
}

export const POTableView: React.FC<POTableViewProps> = ({
  purchaseOrders,
  sortConfig,
  onSort,
  onViewDetails,
  onDownloadPDF,
  onSendEmail,
  onRegeneratePDF,
}) => {
  const { t, currency, dateFormat } = useLocalization();

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSort('po_number')}
            >
              <div className="flex items-center">
                {t('procurement.purchaseOrders').slice(0, -1)} {t('common.number')}
                <SortIcon field="po_number" sortConfig={sortConfig} />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSort('project')}
            >
              <div className="flex items-center">
                {t('procurement.project')}
                <SortIcon field="project" sortConfig={sortConfig} />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSort('supplier')}
            >
              <div className="flex items-center">
                {t('procurement.supplier')}
                <SortIcon field="supplier" sortConfig={sortConfig} />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSort('amount')}
            >
              <div className="flex items-center">
                {t('procurement.amount')}
                <SortIcon field="amount" sortConfig={sortConfig} />
              </div>
            </TableHead>
            <TableHead>{t('procurement.statusLabel')}</TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSort('created')}
            >
              <div className="flex items-center">
                {t('procurement.created')}
                <SortIcon field="created" sortConfig={sortConfig} />
              </div>
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSort('delivery')}
            >
              <div className="flex items-center">
                {t('procurement.expected')} {t('procurement.deliveryDate')}
                <SortIcon field="delivery" sortConfig={sortConfig} />
              </div>
            </TableHead>
            <TableHead className="text-right">{t('procurement.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {purchaseOrders.map((po) => (
            <TableRow
              key={po.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onViewDetails(po.id)}
            >
              <TableCell className="font-medium">
                {po.purchase_order_number}
              </TableCell>
              <TableCell>{po.projects.name}</TableCell>
              <TableCell>{po.suppliers.name}</TableCell>
              <TableCell>
                {formatCurrency(po.total_amount, currency)}
              </TableCell>
              <TableCell>
                <POStatusBadge status={po.status} />
              </TableCell>
              <TableCell>{formatDate(po.created_at, dateFormat)}</TableCell>
              <TableCell>{po.expected_delivery_date ? formatDate(po.expected_delivery_date, dateFormat) : '--'}</TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <POQuickActions
                  purchaseOrder={po}
                  onViewDetails={onViewDetails}
                  onDownloadPDF={onDownloadPDF}
                  onSendEmail={onSendEmail}
                  onRegeneratePDF={onRegeneratePDF}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
