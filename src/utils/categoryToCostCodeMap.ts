/**
 * Maps expense categories to Cost Code IDs
 * Used for auto-selecting cost codes based on category selection
 * Now supports language-specific cost codes (e.g., MO for pt-BR, LAB for en-US)
 */

import type { Language } from '@/contexts/LocalizationContext';

// Cost Code identifiers by language
export const COST_CODES_EN_US = {
  LAB: 'LAB',   // Labor
  MAT: 'MAT',   // Materials
  EQT: 'EQT',   // Equipment
  SUB: 'SUB',   // Subcontract
  FEE: 'FEE',   // Permits & Fees
  OVH: 'OVH',   // Overhead / General Conditions
  ADM: 'ADM',   // Administrative Expenses
} as const;

export const COST_CODES_PT_BR = {
  MO: 'MO',     // Mão de Obra (Labor)
  MAT: 'MAT',   // Materiais (Materials)
  EQP: 'EQP',   // Equipamentos (Equipment)
  TER: 'TER',   // Terceiros (Subcontract)
  TAX: 'TAX',   // Taxas (Fees)
  IND: 'IND',   // Indiretos (Overhead)
  ADM: 'ADM',   // Despesas Administrativas (Administrative)
} as const;

export const COST_CODES_ES_ES = {
  MO: 'MO',     // Mano de Obra (Labor)
  MAT: 'MAT',   // Materiales (Materials)
  EQP: 'EQP',   // Equipos (Equipment)
  SUB: 'SUB',   // Subcontratación (Subcontract)
  TAX: 'TAX',   // Tasas y Permisos (Fees)
  IND: 'IND',   // Indirectos (Overhead)
  ADM: 'ADM',   // Gastos Administrativos (Administrative)
} as const;

export const COST_CODES_FR_FR = {
  MO: 'MO',     // Main d'Œuvre (Labor)
  MAT: 'MAT',   // Matériaux (Materials)
  EQP: 'EQP',   // Équipements (Equipment)
  ST: 'ST',     // Sous-Traitance (Subcontract)
  TAX: 'TAX',   // Taxes et Permis (Fees)
  IND: 'IND',   // Indirects (Overhead)
  ADM: 'ADM',   // Frais Administratifs (Administrative)
} as const;

// Legacy COST_CODES for backward compatibility (defaults to English)
export const COST_CODES = COST_CODES_EN_US;

export type CostCodeType = string;

/**
 * Get cost codes for a specific language
 */
export function getCostCodesForLanguage(language: Language): any {
  switch (language) {
    case 'pt-BR':
      return COST_CODES_PT_BR;
    case 'es-ES':
      return COST_CODES_ES_ES;
    case 'fr-FR':
      return COST_CODES_FR_FR;
    case 'en-US':
    default:
      return COST_CODES_EN_US;
  }
}

/**
 * Maps category strings to cost code types
 * Handles both English and Portuguese variations
 * Returns the appropriate cost code based on language
 */
export function getCostCodeFromCategory(category?: string, language: Language = 'en-US'): CostCodeType | undefined {
  if (!category) return undefined;

  const codes = getCostCodesForLanguage(language) as any;
  const categoryLower = category.toLowerCase();

  // Labor / Mão de Obra
  if (categoryLower.includes('labor') || 
      categoryLower.includes('mão de obra') || 
      categoryLower.includes('mão-de-obra') ||
      categoryLower.includes('mano de obra') ||
      categoryLower.includes('main d\'œuvre')) {
    return language === 'en-US' ? codes.LAB : codes.MO;
  }

  // Materials / Materiais
  if (categoryLower.includes('material') || 
      categoryLower.includes('materiais') ||
      categoryLower.includes('materiales') ||
      categoryLower.includes('matériaux')) {
    return codes.MAT;
  }

  // Equipment / Equipamentos
  if (categoryLower.includes('equipment') || 
      categoryLower.includes('equipamento') ||
      categoryLower.includes('equipo') ||
      categoryLower.includes('équipement')) {
    return language === 'en-US' ? codes.EQT : codes.EQP;
  }

  // Subcontract / Terceiros
  if (categoryLower.includes('subcontract') || 
      categoryLower.includes('terceiro') ||
      categoryLower.includes('subcontratación') ||
      categoryLower.includes('sous-traitance')) {
    if (language === 'en-US') return codes.SUB;
    if (language === 'fr-FR') return codes.ST;
    if (language === 'es-ES') return codes.SUB;
    return codes.TER; // pt-BR
  }

  // Fees / Taxas
  if (categoryLower.includes('fee') || 
      categoryLower.includes('taxa') ||
      categoryLower.includes('imposto') ||
      categoryLower.includes('tax') ||
      categoryLower.includes('permit')) {
    return language === 'en-US' ? codes.FEE : codes.TAX;
  }

  // Overhead / Indiretos
  if (categoryLower.includes('overhead') || 
      categoryLower.includes('indireto') ||
      categoryLower.includes('despesas gerais') ||
      categoryLower.includes('general conditions')) {
    return language === 'en-US' ? codes.OVH : codes.IND;
  }

  // Administrative / Administrativas
  if (categoryLower.includes('admin') || 
      categoryLower.includes('administrativ')) {
    return codes.ADM;
  }

  // Other / Outros - map to overhead
  if (categoryLower.includes('other') || 
      categoryLower.includes('outro') ||
      categoryLower.includes('logistic') ||
      categoryLower.includes('logística')) {
    return language === 'en-US' ? codes.OVH : codes.IND;
  }

  return undefined;
}

/**
 * Cost code metadata for UI display (language-aware)
 */
export function getCostCodeMetadata(language: Language = 'en-US'): Record<string, { name: string; description: string }> {
  const codes = getCostCodesForLanguage(language) as any;

  switch (language) {
    case 'pt-BR':
      return {
        [codes.MO]: { name: 'Mão de Obra', description: 'Custos de mão de obra e pessoal' },
        [codes.MAT]: { name: 'Materiais', description: 'Materiais e suprimentos' },
        [codes.EQP]: { name: 'Equipamentos', description: 'Equipamentos e maquinário' },
        [codes.TER]: { name: 'Terceiros', description: 'Serviços terceirizados' },
        [codes.TAX]: { name: 'Taxas', description: 'Taxas, alvarás e impostos' },
        [codes.IND]: { name: 'Indiretos', description: 'Custos indiretos e gerais' },
        [codes.ADM]: { name: 'Despesas Administrativas', description: 'Despesas administrativas' },
      };

    case 'es-ES':
      return {
        [codes.MO]: { name: 'Mano de Obra', description: 'Costos de mano de obra y personal' },
        [codes.MAT]: { name: 'Materiales', description: 'Materiales y suministros' },
        [codes.EQP]: { name: 'Equipos', description: 'Equipos y maquinaria' },
        [codes.SUB]: { name: 'Subcontratación', description: 'Servicios subcontratados' },
        [codes.TAX]: { name: 'Tasas y Permisos', description: 'Tasas, permisos e impuestos' },
        [codes.IND]: { name: 'Indirectos', description: 'Costos indirectos y generales' },
        [codes.ADM]: { name: 'Gastos Administrativos', description: 'Gastos administrativos' },
      };

    case 'fr-FR':
      return {
        [codes.MO]: { name: 'Main d\'Œuvre', description: 'Coûts de main-d\'œuvre et de personnel' },
        [codes.MAT]: { name: 'Matériaux', description: 'Matériaux et fournitures' },
        [codes.EQP]: { name: 'Équipements', description: 'Équipements et machines' },
        [codes.ST]: { name: 'Sous-Traitance', description: 'Services sous-traités' },
        [codes.TAX]: { name: 'Taxes et Permis', description: 'Taxes, permis et impôts' },
        [codes.IND]: { name: 'Indirects', description: 'Coûts indirects et généraux' },
        [codes.ADM]: { name: 'Frais Administratifs', description: 'Frais administratifs' },
      };

    case 'en-US':
    default:
      return {
        [codes.LAB]: { name: 'Labor', description: 'Labor and personnel costs' },
        [codes.MAT]: { name: 'Materials', description: 'Raw materials and supplies' },
        [codes.EQT]: { name: 'Equipment', description: 'Equipment and machinery' },
        [codes.SUB]: { name: 'Subcontract', description: 'Subcontracted services' },
        [codes.FEE]: { name: 'Permits & Fees', description: 'Professional fees and permits' },
        [codes.OVH]: { name: 'Overhead / General Conditions', description: 'Overhead and general conditions' },
        [codes.ADM]: { name: 'Administrative Expenses', description: 'Administrative expenses' },
      };
  }
}

// Legacy categoryToCostCodeMap for backward compatibility (English only)
export const categoryToCostCodeMap: Record<string, CostCodeType> = {
  // Labor
  'Labor': COST_CODES.LAB,
  'labor': COST_CODES.LAB,
  'LABOR': COST_CODES.LAB,
  'Mão de Obra': COST_CODES.LAB,
  'mão de obra': COST_CODES.LAB,
  'Mão-de-Obra': COST_CODES.LAB,
  'Mão-de-obra': COST_CODES.LAB,
  'mão-de-obra': COST_CODES.LAB,

  // Materials
  'Materials': COST_CODES.MAT,
  'materials': COST_CODES.MAT,
  'MATERIALS': COST_CODES.MAT,
  'Materiais': COST_CODES.MAT,
  'materiais': COST_CODES.MAT,

  // Equipment
  'Equipment': COST_CODES.EQT,
  'equipment': COST_CODES.EQT,
  'EQUIPMENT': COST_CODES.EQT,
  'Equipamentos': COST_CODES.EQT,
  'equipamentos': COST_CODES.EQT,
  'Equipamento': COST_CODES.EQT,
  'equipo': COST_CODES.EQT,

  // Subcontractor
  'Subcontractor': COST_CODES.SUB,
  'subcontractor': COST_CODES.SUB,
  'SUBCONTRACTOR': COST_CODES.SUB,
  'Subcontratação': COST_CODES.SUB,
  'subcontratação': COST_CODES.SUB,

  // Fees
  'Fees': COST_CODES.FEE,
  'fees': COST_CODES.FEE,
  'FEES': COST_CODES.FEE,
  'Taxas': COST_CODES.FEE,
  'taxas': COST_CODES.FEE,
  'Taxes': COST_CODES.FEE,
  'taxes': COST_CODES.FEE,
  'TAXES': COST_CODES.FEE,
  'Impostos': COST_CODES.FEE,
  'impostos': COST_CODES.FEE,
  'Impostos/Taxas': COST_CODES.FEE,
  'impostos/taxas': COST_CODES.FEE,

  // Overhead
  'Overhead': COST_CODES.OVH,
  'overhead': COST_CODES.OVH,
  'OVERHEAD': COST_CODES.OVH,
  'Despesas Gerais': COST_CODES.OVH,
  'despesas gerais': COST_CODES.OVH,

  // Other / Outros
  'Other': COST_CODES.OVH,
  'other': COST_CODES.OVH,
  'OTHER': COST_CODES.OVH,
  'Outros': COST_CODES.OVH,
  'outros': COST_CODES.OVH,
  'Logistics': COST_CODES.OVH,
  'logistics': COST_CODES.OVH,
  'LOGISTICS': COST_CODES.OVH,
  'Logística': COST_CODES.OVH,
  'logística': COST_CODES.OVH,
};

// Legacy costCodeMetadata for backward compatibility (English only)
export const costCodeMetadata = getCostCodeMetadata('en-US');
