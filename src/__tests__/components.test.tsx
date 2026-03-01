import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ReportViewer } from '../components/Reports/ReportViewerSimple';

// Mock the useLocalization hook to avoid LocalizationProvider loading issues
vi.mock('../contexts/LocalizationContext', () => ({
  useLocalization: () => ({
    t: (key: string) => key, // Simple identity function for translations
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'BRL',
    numberFormat: 'pt-BR',
    weatherLocation: 'São Paulo, Brazil',
    temperatureUnit: 'C',
    setLanguage: vi.fn(),
    setTimezone: vi.fn(),
    setDateFormat: vi.fn(),
    setTimeFormat: vi.fn(),
    setCurrency: vi.fn(),
    setNumberFormat: vi.fn(),
    setWeatherLocation: vi.fn(),
    setTemperatureUnit: vi.fn(),
  }),
  LocalizationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the toast hook
vi.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Test wrapper for components that need routing
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Critical Components Rendering', () => {
  it('should render ReportViewer without crashing', () => {
    const mockProps = {
      isOpen: true,
      onClose: () => {},
      reportType: 'projectStatus' as const,
      reportData: {
        project: { 
          id: 'test-project', 
          name: 'Test Project',
          bathrooms: 0,
          budget_date: '',
          budget_total: 0,
          city: '',
          client_cpf: '',
          client_id: '',
          client_name: '',
          construction_address: '',
          construction_unit: '',
          created_at: '',
          updated_at: '',
        } as any,
        budgetItems: [],
        financialEntries: [],
        materials: [],
        companySettings: {} as any,
      },
      reportTitle: 'Test Report',
    };

    expect(() => {
      render(
        <TestWrapper>
          <ReportViewer {...mockProps} />
        </TestWrapper>
      );
    }).not.toThrow();
  });

  it('should display report viewer dialog when open', () => {
    const mockProps = {
      isOpen: true,
      onClose: () => {},
      reportType: 'projectStatus' as const,
      reportData: {
        project: { 
          id: 'test-project', 
          name: 'Test Project',
        } as any,
        budgetItems: [],
        financialEntries: [],
        materials: [],
        companySettings: {} as any,
      },
      reportTitle: 'Test Report',
    };

    render(
      <TestWrapper>
        <ReportViewer {...mockProps} />
      </TestWrapper>
    );

    // Should render the dialog content
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should not display report viewer dialog when closed', () => {
    const mockProps = {
      isOpen: false,
      onClose: () => {},
      reportType: 'projectStatus' as const,
      reportData: {
        project: { 
          id: 'test-project', 
          name: 'Test Project',
        } as any,
        budgetItems: [],
        financialEntries: [],
        materials: [],
        companySettings: {} as any,
      },
      reportTitle: 'Test Report',
    };

    render(
      <TestWrapper>
        <ReportViewer {...mockProps} />
      </TestWrapper>
    );

    // Should not render the dialog content
    expect(document.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});