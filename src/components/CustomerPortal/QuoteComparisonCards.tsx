import React, { useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocalization } from '@/contexts/LocalizationContext';
import { QuoteCard } from './QuoteCard';
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

export interface QuoteComparisonCardsProps {
  quotes: QuoteWithSupplier[];
  isLoading?: boolean;
  onViewDetails?: (quoteId: string) => void;
  className?: string;
}

export const QuoteComparisonCards: React.FC<QuoteComparisonCardsProps> = ({
  quotes,
  isLoading = false,
  onViewDetails,
  className = '',
}) => {
  const { t, currency } = useLocalization();
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    align: 'center',
    skipSnaps: false,
    dragFree: false 
  });
  const [currentIndex, setCurrentIndex] = useState(0);

  // Find the lowest price quote for the "Recommended" badge
  const lowestPrice = quotes.length > 0 
    ? Math.min(...quotes.map(quote => quote.total_price))
    : 0;

  // Handle carousel scroll events
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  React.useEffect(() => {
    if (!emblaApi) return;
    
    emblaApi.on('select', onSelect);
    onSelect(); // Set initial index
    
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Format currency based on user's localization settings
  const formatPrice = (price: number) => {
    const locale = currency === 'USD' ? 'en-US' : currency === 'EUR' ? 'de-DE' : 'pt-BR';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  // Format delivery estimate using translations
  const formatDeliveryEstimate = (days: number | null) => {
    if (!days) return t('customerPortal.quoteComparison.deliveryDays.notInformed');
    return days === 1 
      ? t('customerPortal.quoteComparison.deliveryDays.single')
      : t('customerPortal.quoteComparison.deliveryDays.multiple', { days: days.toString() });
  };

  // Calculate total items for summary
  const getTotalItems = (quote: QuoteWithSupplier) => {
    return quote.purchase_request_items?.quantity || 1;
  };

  // Handle empty state
  if (!isLoading && (!quotes || quotes.length === 0)) {
    return (
      <div className={`flex items-center justify-center p-8 text-center ${className}`}>
        <div className="space-y-3">
          <div className="text-lg text-muted-foreground">
            📦
          </div>
          <h3 className="text-lg font-medium">
            {t('customerPortal.quoteComparison.noQuotesTitle')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('customerPortal.quoteComparison.noQuotesMessage')}
          </p>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`} data-testid="loading-skeleton">
        <div className="animate-pulse">
          <Card className="h-64">
            <CardHeader className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Carousel container */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {quotes.map((quote) => (
            <div key={quote.id} className="flex-[0_0_100%] min-w-0 px-2">
              <QuoteCard
                quote={quote}
                isRecommended={quote.total_price === lowestPrice}
                onViewDetails={(id) => onViewDetails?.(id)}
                currency={currency}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots indicator */}
      {quotes.length > 1 && (
        <div className="flex justify-center items-center space-x-2 py-4">
          {quotes.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                index === currentIndex 
                  ? 'bg-primary' 
                  : 'bg-gray-300'
              }`}
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={t('customerPortal.quoteComparison.navigation.goToCard', { index: (index + 1).toString() })}
            />
          ))}
          <span className="ml-3 text-sm text-gray-600">
            {t('customerPortal.quoteComparison.navigation.dotsLabel', {
              current: (currentIndex + 1).toString(),
              total: quotes.length.toString()
            })}
          </span>
        </div>
      )}
    </div>
  );
};

export default QuoteComparisonCards;