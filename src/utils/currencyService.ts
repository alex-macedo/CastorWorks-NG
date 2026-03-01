/**
 * Currency Exchange Rate Service
 * Uses Frankfurter.app (Free & Open Source)
 */

const BASE_URL = 'https://api.frankfurter.app';

export interface ExchangeRateResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

/**
 * Fetches the latest exchange rate from source currency to BRL
 */
export async function fetchExchangeRate(from: string, to: string = 'BRL'): Promise<number> {
  if (from === to) return 1;

  try {
    const response = await fetch(`${BASE_URL}/latest?from=${from}&to=${to}`);
    if (!response.ok) throw new Error('Failed to fetch exchange rate');
    
    const data: ExchangeRateResponse = await response.json();
    return data.rates[to] || 1;
  } catch (error) {
    console.error('[CurrencyService] Error fetching rate:', error);
    return 1;
  }
}

/**
 * List of commonly used currencies for project procurement
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
];
