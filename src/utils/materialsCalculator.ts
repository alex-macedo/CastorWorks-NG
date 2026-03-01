export const calculateMaterialTotal = (
  quantity: number,
  pricePerUnit: number,
  freightPercentage: number = 0
): number => {
  const subtotal = quantity * pricePerUnit;
  const freight = (subtotal * freightPercentage) / 100;
  return subtotal + freight;
};

export const calculateLaborCost = (
  pricePerM2: number,
  totalArea: number
): number => {
  return pricePerM2 * totalArea;
};

export const calculateCostPerM2 = (
  totalCost: number,
  totalArea: number
): number => {
  if (!totalArea || totalArea === 0) return 0;
  return totalCost / totalArea;
};

export const groupMaterialsByCategory = <T extends { group_name?: string; group?: string }>(
  materials: T[]
): Record<string, T[]> => {
  const grouped = materials.reduce((acc, material) => {
    // Check both group_name and group fields, prioritizing group_name
    const group = material.group_name || material.group || "Other";
    
    // Log if we're defaulting to "Other" to help debug
    if (group === "Other" && !material.group_name && !material.group) {
      console.warn("[groupMaterialsByCategory] Item missing group_name and group, defaulting to 'Other':", {
        id: (material as any).id,
        description: (material as any).description,
        hasGroupName: !!material.group_name,
        hasGroup: !!material.group,
      });
    }
    
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(material);
    return acc;
  }, {} as Record<string, T[]>);
  
  // Log summary of groups found
  const groups = Object.keys(grouped);
  if (groups.length > 0) {
    console.log("[groupMaterialsByCategory] Groups found:", groups, "Total items:", materials.length);
  }
  
  return grouped;
};

export const calculateGroupTotal = <T extends { quantity: number; price_per_unit: number; freight_percentage?: number | null }>(
  materials: T[]
): number => {
  return materials.reduce((sum, material) => {
    const freightPct = material.freight_percentage || 0;
    return sum + calculateMaterialTotal(material.quantity, material.price_per_unit, freightPct);
  }, 0);
};

export const formatCurrency = (value: number, language: string = 'pt-BR', currency: string = 'BRL'): string => {
  const currencyConfig: Record<string, { locale: string; currency: string }> = {
    BRL: { locale: 'pt-BR', currency: 'BRL' },
    USD: { locale: 'en-US', currency: 'USD' },
    EUR: { locale: 'de-DE', currency: 'EUR' },
  };

  // Map language codes to Intl.NumberFormat locales
  const localeMap: Record<string, string> = {
    'pt-BR': 'pt-BR',
    'en-US': 'en-US',
    'es-ES': 'es-ES',
    'fr-FR': 'fr-FR',
  };

  const config = currencyConfig[currency] || { locale: 'pt-BR', currency: 'BRL' };
  const locale = localeMap[language] || config.locale;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: config.currency,
  }).format(value);
};
