import { format, parseISO, isValid } from 'date-fns';

// Define basic types for the functions that use them
interface Material {
  id: string;
  description: string;
  group_name?: string;
}

interface BudgetItem {
  category: string;
  budgeted_amount: number;
}

export const formatCurrency = (amount: number, currency: string = 'BRL'): string => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: currency 
  }).format(amount);
};

/**
 * Format a date for reports using the system's preferred date format
 * Reads from system preferences in app_settings table via localStorage cache
 */
export const formatDate = (date: string | Date, dateFormatOverride?: string): string => {
  if (!date) return '--';

  // Get system's date format preference from localStorage cache (set by LocalizationContext)
  let systemDateFormat = dateFormatOverride;
  if (!systemDateFormat) {
    try {
      // Try the system settings cache (set by LocalizationContext from app_settings table)
      const settingsJson = localStorage.getItem('localization-settings');
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        systemDateFormat = settings.dateFormat;
      }

      // Fallback to system default (DD/MM/YYYY for Brazilian market)
      if (!systemDateFormat) {
        systemDateFormat = 'DD/MM/YYYY';
      }
    } catch (error) {
      systemDateFormat = 'DD/MM/YYYY';
    }
  }

  // Map system format to date-fns format
  const formatMap: Record<string, string> = {
    'DD/MM/YYYY': 'dd/MM/yyyy',
    'MM/DD/YYYY': 'MM/dd/yyyy',
    'YYYY-MM-DD': 'yyyy-MM-dd',
    'MMM DD, YYYY': 'MMM dd, yyyy',
    'DD.MM.YYYY': 'dd.MM.yyyy',
    'yyyy/MM/dd': 'yyyy/MM/dd',
    // Support lowercase variants from database/settings
    'DD/MM/yyyy': 'dd/MM/yyyy',
    'MM/DD/yyyy': 'MM/dd/yyyy',
    'yyyy-MM-dd': 'yyyy-MM-dd',
    'MMM dd, yyyy': 'MMM dd, yyyy',
    // Fully lowercase variants
    'dd/mm/yyyy': 'dd/MM/yyyy',
    'mm/dd/yyyy': 'MM/dd/yyyy',
    'yyyy/mm/dd': 'yyyy/MM/dd',
    'dd.mm.yyyy': 'dd.MM.yyyy',
  };

  const dateFnsFormat = formatMap[systemDateFormat] || 'dd/MM/yyyy';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '--';

  const result = format(dateObj, dateFnsFormat);

  return result;
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const groupMaterialsByCategory = (materials: Material[]): Record<string, Material[]> => {
  return materials.reduce((acc, material) => {
    const group = material.group_name || 'Other';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(material);
    return acc;
  }, {} as Record<string, Material[]>);
};

export const calculateTotalsByCategory = (items: BudgetItem[]): Record<string, number> => {
  return items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = 0;
    }
    acc[item.category] += Number(item.budgeted_amount);
    return acc;
  }, {} as Record<string, number>);
};

export interface PaymentTerm {
  percentage: number;
  description: string;
}

export interface PaymentSchedule {
  installment: number;
  description: string;
  amount: number;
  percentage: number;
}

export const generatePaymentSchedule = (
  totalAmount: number, 
  terms: PaymentTerm[]
): PaymentSchedule[] => {
  return terms.map((term, index) => ({
    installment: index + 1,
    description: term.description,
    amount: (totalAmount * term.percentage) / 100,
    percentage: term.percentage
  }));
};

export const defaultPaymentTerms: PaymentTerm[] = [
  { percentage: 10, description: 'Contract signature' },
  { percentage: 20, description: 'Foundation completion' },
  { percentage: 30, description: 'Structure completion' },
  { percentage: 25, description: 'Finishing 50%' },
  { percentage: 15, description: 'Project completion' }
];
