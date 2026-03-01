import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuoteComparisonCards, type QuoteWithSupplier } from '../../../components/CustomerPortal/QuoteComparisonCards';
import { LocalizationProvider } from '../../../contexts/LocalizationContext';

// Mock localStorage
beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    writable: true
  });
});

  // Mock the import.meta.glob to return empty translations immediately
  vi.mock('../../../contexts/LocalizationContext', async () => {
    const actual = await vi.importActual('../../../contexts/LocalizationContext');
    const React = await import('react');

    // Create a mock LocalizationProvider that doesn't have async loading
    const MockLocalizationProvider = ({ children }: { children: React.ReactNode }) => {
      const mockT = (key: string, variables?: Record<string, unknown>) => {
        // Provide test translations directly
        const translations: Record<string, string> = {
          'customerPortal.quoteComparison.noQuotesTitle': 'No quotes received yet',
          'customerPortal.quoteComparison.noQuotesMessage': 'Supplier quotes will appear here when available.',
          'customerPortal.quoteComparison.loading': 'Loading quotes...',
          'customerPortal.quoteComparison.recommended': 'Recommended',
          'customerPortal.quoteComparison.totalPrice': 'Total Price',
          'customerPortal.quoteComparison.deliveryEstimate': 'Delivery Estimate',
          'customerPortal.quoteComparison.deliveryTime': 'Delivery Time',
          'customerPortal.quoteComparison.viewDetails': 'View Details',
          'customerPortal.quoteComparison.deliveryDays.single': '1 day',
          'customerPortal.quoteComparison.deliveryDays.multiple': '{{days}} days',
          'customerPortal.quoteComparison.deliveryDays.notInformed': 'Delivery time not informed',
          'customerPortal.quoteComparison.deliveryNotInformed': 'Delivery time not informed',
          'customerPortal.quoteComparison.itemCount.single': 'item',
          'customerPortal.quoteComparison.itemCount.plural': 'items',
          'customerPortal.quoteComparison.total': 'total',
          'customerPortal.quoteComparison.unknownSupplier': 'Supplier',
          'customerPortal.quoteComparison.navigation.goToCard': 'Go to card {{index}}',
          'customerPortal.quoteComparison.navigation.dotsLabel': '{{current}} of {{total}}',
          'customerPortal.supplier.defaultName': 'Supplier'
        };

        let translation = translations[key] || key;

        // Handle variable interpolation
        if (variables) {
          Object.entries(variables).forEach(([varName, value]) => {
            translation = translation.replace(new RegExp(`{{${varName}}}`, 'g'), String(value));
          });
        }

        return translation;
      };

    const mockContext = {
      language: 'en-US' as const,
      currency: 'BRL' as const,
      dateFormat: 'DD/MM/YYYY' as const,
      timeZone: 'America/Sao_Paulo' as const,
      weatherLocation: 'São Paulo, Brazil',
      temperatureUnit: 'C' as const,
      setLanguage: vi.fn(),
      setCurrency: vi.fn(),
      setDateFormat: vi.fn(),
      setTimeZone: vi.fn(),
      setWeatherLocation: vi.fn(),
      setTemperatureUnit: vi.fn(),
      updateSettings: vi.fn(),
      t: mockT
    };

    return React.createElement(
      React.createContext(mockContext).Provider,
      { value: mockContext },
      children
    );
  };

  return {
    ...actual,
    LocalizationProvider: MockLocalizationProvider,
    useLocalization: () => ({
      language: 'en-US',
      currency: 'BRL',
      dateFormat: 'DD/MM/YYYY',
      timeZone: 'America/Sao_Paulo',
      weatherLocation: 'São Paulo, Brazil',
      temperatureUnit: 'C',
      setLanguage: vi.fn(),
      setCurrency: vi.fn(),
      setDateFormat: vi.fn(),
      setTimeZone: vi.fn(),
      setWeatherLocation: vi.fn(),
      setTemperatureUnit: vi.fn(),
      updateSettings: vi.fn(),
      t: (key: string, variables?: Record<string, unknown>) => {
        // Handle special cases with variables
        if (key === 'customerPortal.quoteComparison.deliveryDays.multiple' && variables?.days) {
          const days = variables.days;
          return `${days} days`;
        }
        if (key === 'customerPortal.quoteComparison.totalSummary') {
          return '1 item, R$ 1.000,00 total';
        }
        if (key === 'customerPortal.quoteComparison.navigation.dotsLabel' && variables?.current && variables?.total) {
          return `${variables.current} of ${variables.total}`;
        }
        if (key === 'customerPortal.quoteComparison.itemCount' && variables?.count) {
          const count = parseInt(variables.count as string);
          return count === 1 ? 'item' : 'items';
        }
        
        const translations: Record<string, string> = {
          'customerPortal.quoteComparison.noQuotesTitle': 'No quotes received yet',
          'customerPortal.quoteComparison.noQuotesMessage': 'Supplier quotes will appear here when available.',
          'customerPortal.quoteComparison.loading': 'Loading quotes...',
          'customerPortal.quoteComparison.recommended': 'Recommended',
          'customerPortal.quoteComparison.totalPrice': 'Total Price',
          'customerPortal.quoteComparison.deliveryEstimate': 'Delivery Estimate',
          'customerPortal.quoteComparison.deliveryTime': 'Delivery Time',
          'customerPortal.quoteComparison.viewDetails': 'View Details',
          'customerPortal.quoteComparison.deliveryDays.single': '1 day',
          'customerPortal.quoteComparison.deliveryDays.plural': 'days',
          'customerPortal.quoteComparison.deliveryDays.notInformed': 'Delivery time not informed',
          'customerPortal.quoteComparison.deliveryNotInformed': 'Delivery time not informed',
          'customerPortal.quoteComparison.itemCount.single': 'item',
          'customerPortal.quoteComparison.itemCount.plural': 'items',
          'customerPortal.quoteComparison.total': 'total',
          'customerPortal.quoteComparison.unknownSupplier': 'Supplier',
          'customerPortal.quoteComparison.navigation.goToCard': 'Go to card',
          'customerPortal.supplier.defaultName': 'Supplier'
        };
        return translations[key] || key;
      }
    })
  };
});

// Mock embla-carousel-react
vi.mock('embla-carousel-react', () => ({
  default: () => [
    vi.fn(), // ref
    {
      scrollTo: vi.fn(),
      selectedScrollSnap: () => 0,
      on: vi.fn(),
      off: vi.fn()
    }
  ]
}));

// Test wrapper with localization
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <LocalizationProvider>
    {children}
  </LocalizationProvider>
);

const mockQuotes: QuoteWithSupplier[] = [
  {
    id: '1',
    total_price: 1000,
    unit_price: 100,
    delivery_days: 5,
    status: 'sent',
    supplier_id: '1',
    purchase_request_item_id: '1',
    created_at: '2025-11-04T00:00:00Z',
    updated_at: '2025-11-04T00:00:00Z',
    suppliers: {
      name: 'Fornecedor A',
      rating: 4.5
    },
    purchase_request_items: {
      description: 'Material de construção',
      quantity: 10
    }
  },
  {
    id: '2',
    total_price: 800, // Lowest price - should be recommended
    unit_price: 80,
    delivery_days: 3,
    status: 'sent',
    supplier_id: '2',
    purchase_request_item_id: '1',
    created_at: '2025-11-04T00:00:00Z',
    updated_at: '2025-11-04T00:00:00Z',
    suppliers: {
      name: 'Fornecedor B',
      rating: 4.2
    },
    purchase_request_items: {
      description: 'Material de construção',
      quantity: 10
    }
  }
];

describe('QuoteComparisonCards', () => {
  it('renders empty state when no quotes provided', () => {
    render(
      <TestWrapper>
        <QuoteComparisonCards quotes={[]} />
      </TestWrapper>
    );
    
    expect(screen.getByText('No quotes received yet')).toBeInTheDocument();
    expect(screen.getByText('Supplier quotes will appear here when available.')).toBeInTheDocument();
  });

  it('renders loading state when isLoading is true', () => {
    render(
      <TestWrapper>
        <QuoteComparisonCards quotes={[]} isLoading={true} />
      </TestWrapper>
    );
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('displays quote cards with correct information', () => {
    render(
      <TestWrapper>
        <QuoteComparisonCards quotes={mockQuotes} />
      </TestWrapper>
    );
    
    // Check supplier names
    expect(screen.getByText('Fornecedor A')).toBeInTheDocument();
    expect(screen.getByText('Fornecedor B')).toBeInTheDocument();
    
    // Check prices (Brazilian currency format - default BRL)
    expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 800,00')).toBeInTheDocument();
    
    // Check delivery estimates (English translations)
    expect(screen.getByText('5 days')).toBeInTheDocument();
    expect(screen.getByText('3 days')).toBeInTheDocument();
  });

  it('shows "Recommended" badge on lowest price quote', () => {
    render(
      <TestWrapper>
        <QuoteComparisonCards quotes={mockQuotes} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  it('displays supplier ratings', () => {
    render(
      <TestWrapper>
        <QuoteComparisonCards quotes={mockQuotes} />
      </TestWrapper>
    );
    
    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('4.2')).toBeInTheDocument();
  });

  it('shows dots indicator when multiple quotes exist', () => {
    render(
      <TestWrapper>
        <QuoteComparisonCards quotes={mockQuotes} />
      </TestWrapper>
    );
    
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  it('does not show dots indicator for single quote', () => {
    render(
      <TestWrapper>
        <QuoteComparisonCards quotes={[mockQuotes[0]]} />
      </TestWrapper>
    );
    
    expect(screen.queryByText('1 of 1')).not.toBeInTheDocument();
  });

  it('calls onViewDetails when "View Details" button is clicked', () => {
    const onViewDetails = vi.fn();
    render(
      <TestWrapper>
        <QuoteComparisonCards quotes={[mockQuotes[0]]} onViewDetails={onViewDetails} />
      </TestWrapper>
    );
    
    fireEvent.click(screen.getByText('View Details'));
    
    expect(onViewDetails).toHaveBeenCalledWith('1');
  });

  it('handles quotes without suppliers data gracefully', () => {
    const quotesWithoutSuppliers: QuoteWithSupplier[] = [
      {
        ...mockQuotes[0],
        suppliers: null
      }
    ];
    
    render(
      <TestWrapper>
        <QuoteComparisonCards quotes={quotesWithoutSuppliers} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Supplier')).toBeInTheDocument();
  });

  it('handles quotes without purchase request items gracefully', () => {
    const quotesWithoutItems: QuoteWithSupplier[] = [
      {
        ...mockQuotes[0],
        purchase_request_items: null
      }
    ];
    
    render(
      <TestWrapper>
        <QuoteComparisonCards quotes={quotesWithoutItems} />
      </TestWrapper>
    );
    
    expect(screen.getByText('1 item, R$ 1.000,00 total')).toBeInTheDocument();
  });

  it('formats delivery estimate correctly for single day', () => {
    const quotesWithOneDay: QuoteWithSupplier[] = [
      {
        ...mockQuotes[0],
        delivery_days: 1
      }
    ];
    
    render(
      <TestWrapper>
        <QuoteComparisonCards quotes={quotesWithOneDay} />
      </TestWrapper>
    );
    
    expect(screen.getByText('1 day')).toBeInTheDocument();
  });

  it('handles null delivery days gracefully', () => {
    const quotesWithNullDelivery: QuoteWithSupplier[] = [
      {
        ...mockQuotes[0],
        delivery_days: null
      }
    ];
    
    render(
      <TestWrapper>
        <QuoteComparisonCards quotes={quotesWithNullDelivery} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Delivery time not informed')).toBeInTheDocument();
  });
});