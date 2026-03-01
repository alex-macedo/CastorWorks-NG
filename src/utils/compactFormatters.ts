import { Currency } from "@/contexts/LocalizationContext";

/**
 * Format currency with compact notation (K, M, B)
 */
export function formatCompactCurrency(
  value: number,
  currency: Currency = 'BRL'
): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  const currencySymbols: Record<Currency, string> = {
    BRL: 'R$',
    USD: '$',
    EUR: '€',
  };

  const symbol = currencySymbols[currency];

  // Billions
  if (absValue >= 1_000_000_000) {
    return `${sign}${symbol} ${(absValue / 1_000_000_000).toFixed(1)}B`;
  }
  
  // Millions
  if (absValue >= 1_000_000) {
    return `${sign}${symbol} ${(absValue / 1_000_000).toFixed(1)}M`;
  }
  
  // Thousands
  if (absValue >= 1_000) {
    return `${sign}${symbol} ${(absValue / 1_000).toFixed(1)}K`;
  }
  
  // Less than 1000
  return `${sign}${symbol} ${absValue.toFixed(0)}`;
}

/**
 * Format number with compact notation (K, M, B) - no currency symbol
 */
export function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  // Billions
  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(1)}B`;
  }
  
  // Millions
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(1)}M`;
  }
  
  // Thousands
  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(1)}K`;
  }
  
  // Less than 1000
  return `${sign}${absValue.toFixed(0)}`;
}
