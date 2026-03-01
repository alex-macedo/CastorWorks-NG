import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';
import type { Database } from '@/integrations/supabase/types';

// Type definitions based on Supabase schema
type Supplier = Database['public']['Tables']['suppliers']['Row'];
type Quote = Database['public']['Tables']['quotes']['Row'];

// Enhanced types with related data
export interface QuoteWithSupplier extends Quote {
  suppliers: Pick<Supplier, 'name' | 'rating'> | null;
  purchase_request_items: {
    description: string;
    quantity: number;
  } | null;
}




interface QuoteCardProps {
  quote: QuoteWithSupplier;
  isRecommended: boolean;
  onViewDetails: (id: string) => void;
  currency: string;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  isRecommended,
  onViewDetails,
  currency,
}) => {
  const { t } = useLocalization();

  const formatPrice = (price: number) => {
    const locale = currency === 'USD' ? 'en-US' : currency === 'EUR' ? 'de-DE' : 'pt-BR';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const formatDeliveryEstimate = (days: number | null) => {
    if (!days) return t('customerPortal.quoteComparison.deliveryDays.notInformed');
    return days === 1 
      ? t('customerPortal.quoteComparison.deliveryDays.single')
      : t('customerPortal.quoteComparison.deliveryDays.multiple', { days: days.toString() });
  };

  return (
    <Card className={`h-full relative overflow-hidden transition-all hover:shadow-md border ${isRecommended ? 'border-primary ring-1 ring-primary/20' : 'bg-white shadow-sm'}`}>
      {isRecommended && (
        <div className="absolute top-0 right-0">
          <div className="bg-primary text-primary-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg shadow-sm">
            {t('customerPortal.quoteComparison.recommended')}
          </div>
        </div>
      )}

      <CardHeader className="pb-4 pt-6">
        <div className="space-y-1">
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            {quote.suppliers?.name || t('customerPortal.supplier.defaultName')}
          </h3>
          
          {quote.suppliers?.rating && (
            <div className="flex items-center text-sm font-medium text-amber-500">
              <span className="mr-1">★</span>
              <span>{quote.suppliers.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="text-center py-2">
          <div className="text-4xl font-extrabold text-primary tabular-nums">
            {formatPrice(quote.total_price)}
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            {t('customerPortal.quoteComparison.totalSummary', {
              itemCount: (quote.purchase_request_items?.quantity || 1).toString(),
              totalPrice: formatPrice(quote.total_price)
            })}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm py-2 border-y border-muted/50">
          <span className="text-muted-foreground font-medium">
            {t('customerPortal.quoteComparison.deliveryTime')}:
          </span>
          <span className="font-bold text-foreground">
            {formatDeliveryEstimate(quote.delivery_days)}
          </span>
        </div>

        {quote.purchase_request_items?.description && (
          <div className="text-sm text-foreground/80 bg-muted/30 p-3 rounded-lg">
            <p className="line-clamp-2 leading-relaxed">
              {quote.purchase_request_items.description}
            </p>
          </div>
        )}

        <Button 
          variant={isRecommended ? "default" : "outline"} 
          className="w-full mt-4 font-bold h-12"
          onClick={() => onViewDetails(quote.id)}
        >
          {t('customerPortal.quoteComparison.viewDetails')}
        </Button>
      </CardContent>
    </Card>
  );
};
