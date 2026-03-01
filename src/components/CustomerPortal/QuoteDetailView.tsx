import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDateFormat } from '@/hooks/useDateFormat';

// Type definitions matching database schema from validate-approval-token edge function
interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
}

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
}

interface Quote {
  id: string;
  quote_number: string;
  total_amount: number;
  currency_id: string;
  status: string;
  valid_until: string | null;
  delivery_estimate: string | null;
  notes: string | null;
  created_at: string;
  supplier_id: string;
  suppliers: Supplier | null;
  quote_items: QuoteItem[];
}

export interface QuoteDetailViewProps {
  quote: Quote;
  onClose: () => void;
  onSelectForApproval?: (quoteId: string) => void;
  isRecommended?: boolean;
  className?: string;
}

export const QuoteDetailView: React.FC<QuoteDetailViewProps> = ({
  quote,
  onClose,
  onSelectForApproval,
  isRecommended = false,
  className = '',
}) => {
  const { t, currency } = useLocalization();
  const { formatDate } = useDateFormat();

  // Format currency based on user's localization settings
  const formatPrice = (price: number) => {
    const locale = currency === 'USD' ? 'en-US' : currency === 'EUR' ? 'de-DE' : 'pt-BR';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  // Calculate subtotal from items (should match total_amount before tax)
  const calculateSubtotal = () => {
    return quote.quote_items.reduce((sum, item) => sum + item.total_price, 0);
  };

  // Calculate tax (if there's a difference between subtotal and total_amount)
  const subtotal = calculateSubtotal();
  const taxAmount = quote.total_amount - subtotal;
  const hasTax = Math.abs(taxAmount) > 0.01; // Account for floating point precision

  // Generate mailto link for contacting supplier
  const getMailtoLink = () => {
    if (!quote.suppliers?.contact_email) return '#';
    const subject = encodeURIComponent(`Question about Quote #${quote.quote_number}`);
    const body = encodeURIComponent(
      `Hello ${quote.suppliers.contact_name || quote.suppliers.name},\n\n` +
      `I have a question about your quote (${quote.quote_number}):\n\n`
    );
    return `mailto:${quote.suppliers.contact_email}?subject=${subject}&body=${body}`;
  };

  return (
    <Card className={`w-full ${className}`}>
      {/* Header with back button */}
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back') || 'Back'}
          </Button>

          {isRecommended && (
            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
              {t('customerPortal.quoteComparison.recommended') || 'Recommended'}
            </Badge>
          )}
        </div>

        <div>
          <CardTitle className="text-2xl">
            {quote.suppliers?.name || t('customerPortal.supplier.defaultName') || 'Supplier'}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t('customerPortal.quoteDetail.quoteNumber') || 'Quote'} #{quote.quote_number}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Itemized Pricing Table */}
        <div>
          <h3 className="text-lg font-semibold mb-3">
            {t('customerPortal.quoteDetail.itemizedPricing') || 'Itemized Pricing'}
          </h3>

          <div className="border rounded-md">
            <div className={`${quote.quote_items.length > 10 ? 'max-h-96 overflow-y-auto' : ''}`}>
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>{t('customerPortal.quoteDetail.description') || 'Item Description'}</TableHead>
                    <TableHead className="text-right">{t('customerPortal.quoteDetail.quantity') || 'Quantity'}</TableHead>
                    <TableHead className="text-right">{t('customerPortal.quoteDetail.unitPrice') || 'Unit Price'}</TableHead>
                    <TableHead className="text-right">{t('customerPortal.quoteDetail.subtotal') || 'Subtotal'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quote.quote_items.map((item, index) => (
                    <TableRow
                      key={item.id}
                      className={index % 2 === 0 ? 'bg-muted/30' : ''}
                    >
                      <TableCell className="font-medium">
                        <div>
                          {item.description}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPrice(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(item.total_price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-medium">
                      {t('customerPortal.quoteDetail.subtotal') || 'Subtotal'}:
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(subtotal)}
                    </TableCell>
                  </TableRow>

                  {hasTax && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">
                        {t('customerPortal.quoteDetail.tax') || 'Tax'}:
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(taxAmount)}
                      </TableCell>
                    </TableRow>
                  )}

                  <TableRow className="bg-primary/5">
                    <TableCell colSpan={3} className="text-right text-lg font-bold">
                      {t('customerPortal.quoteDetail.total') || 'Total'}:
                    </TableCell>
                    <TableCell className="text-right text-lg font-bold">
                      {formatPrice(quote.total_amount)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        </div>

        {/* Delivery and Payment Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase">
              {t('customerPortal.quoteDetail.deliveryEstimate') || 'Delivery Estimate'}
            </h4>
            <p className="text-base">
              {quote.delivery_estimate || t('customerPortal.quoteDetail.notSpecified') || 'Not specified'}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase">
              {t('customerPortal.quoteDetail.paymentTerms') || 'Payment Terms'}
            </h4>
            <p className="text-base">
              {/* Payment terms would come from quote.payment_terms if field exists */}
              {(quote as any).payment_terms || t('customerPortal.quoteDetail.standardTerms') || 'Standard terms apply'}
            </p>
          </div>

          {quote.valid_until && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase">
                {t('customerPortal.quoteDetail.validUntil') || 'Valid Until'}
              </h4>
              <p className="text-base">
                {formatDate(quote.valid_until)}
              </p>
            </div>
          )}
        </div>

        {/* Supplier Contact Information */}
        {quote.suppliers && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <h4 className="font-semibold">
              {t('customerPortal.quoteDetail.supplierContact') || 'Supplier Contact'}
            </h4>

            <div className="space-y-2 text-sm">
              {quote.suppliers.contact_name && (
                <div>
                  <span className="text-muted-foreground">
                    {t('customerPortal.quoteDetail.contactPerson') || 'Contact Person'}:
                  </span>{' '}
                  <span className="font-medium">{quote.suppliers.contact_name}</span>
                </div>
              )}

              {quote.suppliers.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{quote.suppliers.contact_email}</span>
                </div>
              )}

              {quote.suppliers.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{quote.suppliers.phone}</span>
                </div>
              )}
            </div>

            {quote.suppliers.contact_email && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                asChild
              >
                <a href={getMailtoLink()}>
                  <Mail className="h-4 w-4 mr-2" />
                  {t('customerPortal.quoteDetail.contactSupplier') || 'Contact Supplier'}
                </a>
              </Button>
            )}
          </div>
        )}

        {/* Supplier Notes */}
        {quote.notes && (
          <div className="space-y-2">
            <h4 className="font-semibold">
              {t('customerPortal.quoteDetail.supplierNotes') || 'Supplier Notes'}
            </h4>
            <div className="border rounded-lg p-4 bg-muted/30 max-h-40 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">
                {quote.notes}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons at bottom */}
        <div className="pt-4 border-t space-y-2">
          {onSelectForApproval && (
            <Button
              onClick={() => onSelectForApproval(quote.id)}
              className="w-full"
              size="lg"
            >
              {t('customerPortal.actions.selectForApproval') || 'Select for Approval'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('customerPortal.quoteDetail.backToComparison') || 'Back to Quote Comparison'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
