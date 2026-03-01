import { parseISO, isValid } from 'date-fns';
import { Currency } from '@/contexts/LocalizationContext';
import { formatDateSystem, formatDateTimeSystem } from './dateSystemFormatters';
import { validateCNPJ } from './validation';

export const formatCurrency = (amount: number, currency: Currency): string => {
  const currencyConfig = {
    BRL: { locale: 'pt-BR', currency: 'BRL' },
    USD: { locale: 'en-US', currency: 'USD' },
    EUR: { locale: 'de-DE', currency: 'EUR' },
  };

  const config = currencyConfig[currency] || currencyConfig.BRL; // Default to BRL if currency is invalid

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
  }).format(amount);
};

/**
 * @deprecated Use formatDateSystem from dateSystemFormatters instead.
 * This function now delegates to system locale formatting.
 */
export const formatDate = (date: Date | string | null | undefined): string => {
  return formatDateSystem(date);
};

/**
 * @deprecated Use formatDateTimeSystem from dateSystemFormatters instead.
 * This function now delegates to system locale formatting.
 */
export const formatDateTime = (date: Date | string | null | undefined): string => {
  return formatDateTimeSystem(date);
};

export const formatNumber = (num: number, locale: string = 'pt-BR'): string => {
  return new Intl.NumberFormat(locale).format(num);
};

export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
};

export const unformatCPF = (cpf: string): string => {
  return cpf.replace(/\D/g, '');
};

export const validateCPF = (cpf: string): boolean => {
  const cleaned = unformatCPF(cpf);
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;
  
  return true;
};

/** Format CPF (11 digits) or CNPJ (14 digits) for display */
export const formatCPFOrCNPJ = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 11) return formatCPF(cleaned);
  // CNPJ: XX.XXX.XXX/XXXX-XX
  const match = cleaned.match(/^(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2})$/);
  if (match) {
    let formatted = '';
    if (match[1]) formatted += match[1];
    if (match[2]) formatted += '.' + match[2];
    if (match[3]) formatted += '.' + match[3];
    if (match[4]) formatted += '/' + match[4];
    if (match[5]) formatted += '-' + match[5];
    return formatted;
  }
  return value;
};

/** Validate CPF (11 digits) or CNPJ (14 digits). Empty is valid (optional field). */
export const validateCPFOrCNPJ = (value: string): boolean => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 0) return true;
  if (cleaned.length === 11) return validateCPF(value);
  if (cleaned.length === 14) return validateCNPJ(value);
  return false;
};
