import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, CreditCard } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface InvoiceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: {
    id: string;
    invoice_number: string;
    project_name: string;
    issue_date: string;
    due_date: string;
    amount: number;
    status: string;
    description?: string;
    items?: InvoiceItem[];
  };
  onPayNow?: () => void;
  onOpenConversation?: (invoiceId: string) => void;
}

export function InvoiceDetailsModal({
  open,
  onOpenChange,
  invoice,
  onPayNow,
}: InvoiceDetailsModalProps) {
  const { t } = useLocalization();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!invoice) {
    return null;
  }

  const handlePrint = () => {
    setIsPrinting(true);
    // Simulate print action
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 200);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // TODO: Implement PDF download functionality
      console.log('Downloading invoice:', invoice.id);
      // Simulate download
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'due':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const subtotal = invoice.items
    ? invoice.items.reduce((sum, item) => sum + item.amount, 0)
    : invoice.amount * 0.9; // Estimate 10% tax if no items
  const tax = invoice.amount - subtotal;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Invoice Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {invoice.invoice_number}
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("commonUI.project") }</span>
                  <p className="font-medium">{invoice.project_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("clientPortal.description")}</span>
                  <p className="font-medium">
                    {invoice.description || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant={getStatusVariant(invoice.status)}
                className="mb-4"
              >
                {getStatusLabel(invoice.status)}
              </Badge>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("clientPortal.issued")}</span>
                  <p className="font-medium">{invoice.issue_date}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("clientPortal.due")}</span>
                  <p className="font-medium">{invoice.due_date}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Invoice Items */}
          {invoice.items && invoice.items.length > 0 && (
            <>
              <div>
                <h4 className="font-semibold mb-3">{t("clientPortal.lineItems")}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          ${item.unitPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${item.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />
            </>
          )}

          {/* Invoice Summary */}
          <div className="ml-auto w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("clientPortal.subtotal")}</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("clientPortal.tax")}</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>{t("clientPortal.total")}</span>
              <span>${invoice.amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
            <h4 className="font-semibold">{t("clientPortal.paymentTerms")}</h4>
            <p className="text-muted-foreground">
              Payment is due by {invoice.due_date}. Please reference the invoice
              number when making payment.
            </p>
          </div>

          {/* Payment History */}
          {invoice.status === 'paid' && (
            <div className="space-y-2">
              <h4 className="font-semibold">{t("clientPortal.paymentHistory")}</h4>
              <div className="bg-background p-3 rounded-md text-sm">
                {/* If invoice has explicit paymentHistory, render it; otherwise show a mock single payment */}
                {(invoice as any).paymentHistory ? (
                  (invoice as any).paymentHistory.map((p: any) => (
                    <div key={p.id} className="flex justify-between">
                      <div>
                        <div className="font-medium">{p.method}</div>
                        <div className="text-muted-foreground text-xs">{p.date}</div>
                      </div>
                      <div className="font-semibold">${p.amount.toFixed(2)}</div>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">{t("clientPortal.creditCard")}</div>
                      <div className="text-muted-foreground text-xs">Paid on {invoice.due_date}</div>
                    </div>
                    <div className="font-semibold">${invoice.amount.toFixed(2)}</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <SheetFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              {isPrinting ? 'Printing...' : 'Print'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {(invoice.status === 'due' || invoice.status === 'overdue') && (
              <Button onClick={onPayNow} className="gap-2">
                <CreditCard className="h-4 w-4" />
                Pay Now
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={() => onOpenConversation?.(invoice.id)}>
              View Conversation
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
