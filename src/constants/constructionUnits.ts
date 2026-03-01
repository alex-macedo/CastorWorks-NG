import type { Database } from '@/integrations/supabase/types';

type Translator = (key: string, variables?: Record<string, string | number>) => string;

export type ConstructionUnit = Database['public']['Tables']['projects']['Row']['construction_unit'];

export const CONSTRUCTION_UNIT_OPTIONS: ReadonlyArray<{
  value: ConstructionUnit;
  labelKey: string;
  symbol: string;
}> = [
  { value: 'square meter', labelKey: 'projects:constructionUnitSquareMeter', symbol: 'm²' },
  { value: 'square feet', labelKey: 'projects:constructionUnitSquareFeet', symbol: 'ft²' },
];

export const getConstructionUnitSymbol = (unit?: ConstructionUnit | null): string => {
  if (unit === 'square feet') {
    return 'ft²';
  }
  return 'm²';
};

export const getConstructionUnitLabel = (
  t: Translator,
  unit?: ConstructionUnit | null
): string => {
  const option = CONSTRUCTION_UNIT_OPTIONS.find((item) => item.value === unit);
  const labelKey = option?.labelKey ?? 'projects:constructionUnitSquareMeter';
  return t(labelKey);
};
