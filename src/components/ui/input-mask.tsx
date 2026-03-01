import * as React from "react";
import { Input } from "@/components/ui/input";

export interface InputMaskProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: 'cpf' | 'cnpj' | 'phone' | 'currency' | 'date';
  onChange?: (value: string) => void;
  currencyLocale?: string;
  currencyCode?: string;
}

const applyMask = (value: string, mask: string): string => {
  const cleanValue = value.replace(/\D/g, '');
  
  switch (mask) {
    case 'cpf':
      // Format: 000.000.000-00
      return cleanValue
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2');
    
    case 'cnpj':
      // Format: 00.000.000/0000-00
      return cleanValue
        .slice(0, 14)
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})/, '$1-$2');
    
    case 'phone':
      // Format: (00) 00000-0000 or (00) 0000-0000
      if (cleanValue.length <= 10) {
        return cleanValue
          .slice(0, 10)
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d)/, '$1-$2');
      }
      return cleanValue
        .slice(0, 11)
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2');
    
    case 'date':
      // Format: DD/MM/YYYY
      return cleanValue
        .slice(0, 8)
        .replace(/(\d{2})(\d)/, '$1/$2')
        .replace(/(\d{2})(\d)/, '$1/$2');
    
    default:
      return value;
  }
};

const applyCurrencyMask = (value: string, locale: string = 'pt-BR', currency: string = 'BRL'): string => {
  const cleanValue = value.replace(/\D/g, '');
  const numericValue = parseFloat(cleanValue) / 100;
  
  if (isNaN(numericValue)) return '';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(numericValue);
};

const removeMask = (value: string, mask: string): string => {
  if (mask === 'currency') {
    return value.replace(/\D/g, '');
  }
  return value.replace(/\D/g, '');
};

export const InputMask = React.forwardRef<HTMLInputElement, InputMaskProps>(
  ({ mask, onChange, currencyLocale = 'pt-BR', currencyCode = 'BRL', ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      
      let maskedValue: string;
      if (mask === 'currency') {
        maskedValue = applyCurrencyMask(rawValue, currencyLocale, currencyCode);
      } else {
        maskedValue = applyMask(rawValue, mask);
      }
      
      e.target.value = maskedValue;
      
      if (onChange) {
        const cleanValue = removeMask(maskedValue, mask);
        onChange(cleanValue);
      }
    };

    return <Input ref={ref} {...props} onChange={handleChange} />;
  }
);

InputMask.displayName = "InputMask";