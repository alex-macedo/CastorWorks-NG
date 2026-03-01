import { enUS, ptBR, es, fr } from 'date-fns/locale';
import type { Language } from '@/contexts/LocalizationContext';

export const getDateFnsLocale = (language: Language) => {
  switch (language) {
    case 'pt-BR':
      return ptBR;
    case 'es-ES':
      return es;
    case 'fr-FR':
      return fr;
    case 'en-US':
    default:
      return enUS;
  }
};
