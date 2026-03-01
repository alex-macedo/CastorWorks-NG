import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { LocalizationContext } from '@/contexts/LocalizationContext';

export const createTestQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

export const TestProviders = ({ children }: { children?: React.ReactNode }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LocalizationContext.Provider value={{
          language: 'en-US',
          currency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          timeZone: 'America/New_York',
          weatherLocation: 'New York, USA',
          temperatureUnit: 'F',
          numberFormat: 'compact',
          setLanguage: () => {},
          setCurrency: () => {},
          setDateFormat: () => {},
          setTimeZone: () => {},
          setWeatherLocation: () => {},
          setTemperatureUnit: () => {},
          setNumberFormat: () => {},
          updateSettings: () => {},
          t: (k: string) => k,
          loadTranslationsForRoute: () => {},
        } as any}>
          {children}
        </LocalizationContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

export default TestProviders;
