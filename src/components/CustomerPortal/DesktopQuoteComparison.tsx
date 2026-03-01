import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';
import { QuoteDetailView } from './QuoteDetailView';
import {
  TrendingDown,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Eye,
} from 'lucide-react';

interface Quote {
  id: string;
  quote_number: string;
  total_amount: number;
  currency_id: string;
  delivery_estimate: number | null;
  status: 'pending' | 'approved' | 'rejected';
  valid_until?: string | null;
  notes?: string | null;
  created_at?: string;
  supplier_id?: string;
  suppliers: {
    name: string;
    rating?: number;
  } | null;
  quote_items?: any[];
}

export interface DesktopQuoteComparisonProps {
  quotes: Quote[];
  onQuoteSelect?: (quoteId: string) => void;
  selectedQuoteId?: string | null;
  approvedQuoteId?: string | null;
  isLoading?: boolean;
  className?: string;
}

type SortOption = 'price-asc' | 'price-desc' | 'delivery' | 'rating';

export const DesktopQuoteComparison: React.FC<DesktopQuoteComparisonProps> = ({
  quotes,
  onQuoteSelect,
  selectedQuoteId,
  approvedQuoteId,
  isLoading = false,
  className = '',
}) => {
  const { t, currency } = useLocalization();
  const [sortBy, setSortBy] = useState<SortOption>('price-asc');
  const [detailQuoteId, setDetailQuoteId] = useState<string | null>(null);

  // Find best price and fastest delivery
  const { lowestPrice, fastestDelivery } = useMemo(() => {
    if (quotes.length === 0) return { lowestPrice: null, fastestDelivery: null };

    const lowest = Math.min(...quotes.map(q => q.total_amount));
    const fastest = Math.min(
      ...quotes
        .filter(q => q.delivery_estimate !== null)
        .map(q => q.delivery_estimate!)
    );

    return {
      lowestPrice: lowest,
      fastestDelivery: fastest || null,
    };
  }, [quotes]);

  // Sort quotes
  const sortedQuotes = useMemo(() => {
    const sorted = [...quotes];

    switch (sortBy) {
      case 'price-asc':
        sorted.sort((a, b) => a.total_amount - b.total_amount);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.total_amount - a.total_amount);
        break;
      case 'delivery':
        sorted.sort((a, b) => {
          if (a.delivery_estimate === null) return 1;
          if (b.delivery_estimate === null) return -1;
          return a.delivery_estimate - b.delivery_estimate;
        });
        break;
      case 'rating':
        sorted.sort((a, b) => {
          const ratingA = a.suppliers?.rating || 0;
          const ratingB = b.suppliers?.rating || 0;
          return ratingB - ratingA;
        });
        break;
    }

    return sorted;
  }, [quotes, sortBy]);

  // Format currency
  const formatPrice = (price: number) => {
    const locale = currency === 'USD' ? 'en-US' : currency === 'EUR' ? 'de-DE' : 'pt-BR';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  // Format delivery time
  const formatDelivery = (days: number | null) => {
    if (days === null) {
      return t('customerPortal.quoteComparison.deliveryDays.notInformed') || 'Not informed';
    }
    if (days === 1) {
      return t('customerPortal.quoteComparison.deliveryDays.single') || '1 day';
    }
    return t('customerPortal.quoteComparison.deliveryDays.multiple', { days }) || `${days} days`;
  };

  // Check if quote is recommended (lowest price)
  const isRecommended = (quote: Quote) => {
    return quote.total_amount === lowestPrice;
  };

  // Check if quote has fastest delivery
  const isFastestDelivery = (quote: Quote) => {
    return quote.delivery_estimate !== null && quote.delivery_estimate === fastestDelivery;
  };

  // Get status badge
  const getStatusBadge = (quote: Quote) => {
    if (quote.id === approvedQuoteId || quote.status === 'approved') {
      return (
        <Badge className="bg-green-600 hover:bg-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          {t('customerPortal.actions.approve') || 'Approved'}
        </Badge>
      );
    }
    if (quote.status === 'rejected') {
      return (
        <Badge variant="secondary" className="opacity-60">
          <XCircle className="h-3 w-3 mr-1" />
          {t('customerPortal.actions.reject') || 'Rejected'}
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  };

  // Show detail view if quote selected
  const detailQuote = detailQuoteId ? quotes.find(q => q.id === detailQuoteId) : null;
  if (detailQuote) {
    return (
      <QuoteDetailView
        quote={detailQuote as any}
        onClose={() => setDetailQuoteId(null)}
        isRecommended={isRecommended(detailQuote)}
        className="max-w-6xl mx-auto"
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-4" />
              <div className="h-4 bg-muted rounded w-full mb-2" />
              <div className="h-4 bg-muted rounded w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (quotes.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <div className="mb-4 text-muted-foreground">
            <Eye className="h-16 w-16 mx-auto opacity-20" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t('customerPortal.quoteComparison.noQuotesTitle') || 'No Quotes Available'}
          </h3>
          <p className="text-muted-foreground">
            {t('customerPortal.quoteComparison.noQuotesMessage') ||
              'Quotes will appear here when available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Sort Controls */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold">
            {t('customerPortal.quoteComparison.title') || 'Quote Comparison'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'} available
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price-asc">Price (Low to High)</SelectItem>
              <SelectItem value="price-desc">Price (High to Low)</SelectItem>
              <SelectItem value="delivery">Delivery Time</SelectItem>
              <SelectItem value="rating">Supplier Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quote Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedQuotes.map((quote) => {
          const recommended = isRecommended(quote);
          const fastest = isFastestDelivery(quote);
          const isSelected = quote.id === selectedQuoteId;
          const isApproved = quote.id === approvedQuoteId || quote.status === 'approved';
          const isRejected = quote.status === 'rejected';

          return (
            <Card
              key={quote.id}
              className={`
                relative transition-all hover:shadow-lg cursor-pointer
                ${recommended ? 'border-green-500 border-2' : ''}
                ${isSelected ? 'ring-2 ring-primary' : ''}
                ${isRejected ? 'opacity-60' : ''}
                ${isApproved ? 'border-green-600 border-2' : ''}
              `}
              onClick={() => {
                onQuoteSelect?.(quote.id);
                setDetailQuoteId(quote.id);
              }}
            >
              {/* Badges */}
              <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                {recommended && !isApproved && (
                  <Badge className="bg-green-600 hover:bg-green-700">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    {t('customerPortal.quoteComparison.recommended') || 'Best Price'}
                  </Badge>
                )}
                {fastest && (
                  <Badge className="bg-blue-600 hover:bg-blue-700">
                    <Zap className="h-3 w-3 mr-1" />
                    Fastest
                  </Badge>
                )}
              </div>

              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 pr-20">
                    <h4 className="font-semibold text-lg truncate">
                      {quote.suppliers?.name || t('customerPortal.supplier.defaultName') || 'Supplier'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {quote.quote_number}
                    </p>
                  </div>
                </div>

                {/* Supplier Rating */}
                {quote.suppliers?.rating && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{quote.suppliers.rating.toFixed(1)}</span>
                  </div>
                )}
              </CardHeader>

              <CardContent>
                {/* Price */}
                <div className="mb-4">
                  <div className="text-3xl font-bold text-primary">
                    {formatPrice(quote.total_amount)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('customerPortal.quoteComparison.totalPrice') || 'Total Price'}
                  </div>
                </div>

                {/* Delivery */}
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {formatDelivery(quote.delivery_estimate)}
                  </span>
                </div>

                {/* Status */}
                <div className="mb-4">
                  {getStatusBadge(quote)}
                </div>

                {/* View Details Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailQuoteId(quote.id);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {t('customerPortal.quoteComparison.viewDetails') || 'View Details'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
