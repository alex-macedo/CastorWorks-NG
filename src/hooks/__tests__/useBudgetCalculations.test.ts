import { describe, it, expect } from 'vitest';

// Mock data for testing
const mockAppSettings = {
  bdi_central_admin: 3.89,
  bdi_site_overhead: 1.62,
  bdi_financial_costs: 1.09,
  bdi_risks_insurance: 7.05,
  bdi_taxes: 9.0,
  bdi_profit_margin: 7.05,
};

/**
 * Calculate BDI based on the complex formula:
 * BDI_TOTAL = (((1 + Admin) * (1 + Site_OH) * (1 + Financial) * (1 + Risk)) / (1 - Taxes)) - 1
 */
const calculateBDI = (settings: typeof mockAppSettings): number => {
  const admin = settings.bdi_central_admin / 100;
  const siteOH = settings.bdi_site_overhead / 100;
  const financial = settings.bdi_financial_costs / 100;
  const risk = settings.bdi_risks_insurance / 100;
  const taxes = settings.bdi_taxes / 100;

  const numerator = (1 + admin) * (1 + siteOH) * (1 + financial) * (1 + risk);
  const denominator = 1 - taxes;
  const bdiTotal = (numerator / denominator) - 1;

  return bdiTotal;
};

/**
 * Calculate individual BDI component amounts
 */
const calculateBDIComponents = (directCost: number, settings: typeof mockAppSettings) => {
  const admin = settings.bdi_central_admin / 100;
  const siteOH = settings.bdi_site_overhead / 100;
  const financial = settings.bdi_financial_costs / 100;
  const risk = settings.bdi_risks_insurance / 100;
  const taxes = settings.bdi_taxes / 100;

  let runningTotal = directCost;

  const adminAmount = directCost * admin;
  runningTotal += adminAmount;

  const siteOHAmount = runningTotal * siteOH;
  runningTotal += siteOHAmount;

  const financialAmount = runningTotal * financial;
  runningTotal += financialAmount;

  const riskAmount = runningTotal * risk;
  runningTotal += riskAmount;

  const taxesAmount = runningTotal * (taxes / (1 - taxes));
  runningTotal += taxesAmount;

  return {
    centralAdmin: adminAmount,
    siteOverhead: siteOHAmount,
    financialCosts: financialAmount,
    risksInsurance: riskAmount,
    taxes: taxesAmount,
    total: runningTotal - directCost,
  };
};

describe('useBudgetCalculations', () => {
  describe('BDI Calculation', () => {
    it('should calculate BDI percentage correctly', () => {
      const bdiPercentage = calculateBDI(mockAppSettings);

      // Expected BDI ~ 25.5% based on the formula (returned as decimal)
      expect(bdiPercentage).toBeGreaterThan(0.25);
      expect(bdiPercentage).toBeLessThan(0.30);

      // More precise check (allowing small floating-point variations)
      expect(bdiPercentage).toBeCloseTo(0.2555, 3);
    });

    it('should return 0 BDI when all components are 0', () => {
      const zeroSettings = {
        bdi_central_admin: 0,
        bdi_site_overhead: 0,
        bdi_financial_costs: 0,
        bdi_risks_insurance: 0,
        bdi_taxes: 0,
        bdi_profit_margin: 0,
      };

      const bdiPercentage = calculateBDI(zeroSettings);
      expect(bdiPercentage).toBe(0);
    });

    it('should handle high tax rates correctly', () => {
      const highTaxSettings = {
        ...mockAppSettings,
        bdi_taxes: 50.0, // 50% tax
      };

      const bdiPercentage = calculateBDI(highTaxSettings);
      
      // With 50% tax, BDI should be significantly higher
      expect(bdiPercentage).toBeGreaterThan(1.0); // Over 100%
    });
  });

  describe('BDI Component Breakdown', () => {
    const directCost = 100000; // $100,000

    it('should calculate component breakdown correctly', () => {
      const components = calculateBDIComponents(directCost, mockAppSettings);

      // Verify individual components
      expect(components.centralAdmin).toBeCloseTo(3890, 0); // 3.89% of 100k
      expect(components.siteOverhead).toBeGreaterThan(0);
      expect(components.financialCosts).toBeGreaterThan(0);
      expect(components.risksInsurance).toBeGreaterThan(0);
      expect(components.taxes).toBeGreaterThan(0);

      // Total should match BDI calculation
      const bdiPercentage = calculateBDI(mockAppSettings);
      const expectedTotal = directCost * bdiPercentage;
      expect(components.total).toBeCloseTo(expectedTotal, 0);
    });

    it('should have cascading effect on components', () => {
      const components = calculateBDIComponents(directCost, mockAppSettings);

      // Site overhead should be calculated on (directCost + admin)
      // So it should be slightly more than siteOH% of directCost
      const simpleSOH = directCost * (mockAppSettings.bdi_site_overhead / 100);
      expect(components.siteOverhead).toBeGreaterThan(simpleSOH);
    });

    it('should sum components to total BDI amount', () => {
      const components = calculateBDIComponents(directCost, mockAppSettings);

      const sumOfComponents =
        components.centralAdmin +
        components.siteOverhead +
        components.financialCosts +
        components.risksInsurance +
        components.taxes;

      expect(sumOfComponents).toBeCloseTo(components.total, 0);
    });
  });

  describe('Phase Total Calculations', () => {
    it('should calculate phase total with BDI', () => {
      const directCost = 50000;
      const bdiPercentage = calculateBDI(mockAppSettings); // Already in decimal form
      const finalTotal = directCost * (1 + bdiPercentage);

      expect(finalTotal).toBeGreaterThan(directCost);
      expect(finalTotal).toBeCloseTo(62774, 0); // ~$62,774 with actual BDI calculation
    });

    it('should handle multiple phases correctly', () => {
      const phases = [
        { name: 'Foundation', directCost: 30000 },
        { name: 'Structure', directCost: 50000 },
        { name: 'Finishing', directCost: 20000 },
      ];

      const bdiPercentage = calculateBDI(mockAppSettings);
      
      const phaseTotals = phases.map((phase) => ({
        ...phase,
        bdiAmount: phase.directCost * bdiPercentage,
        finalTotal: phase.directCost * (1 + bdiPercentage),
      }));

      // Verify each phase
      phaseTotals.forEach((phase) => {
        expect(phase.finalTotal).toBe(phase.directCost + phase.bdiAmount);
      });

      // Verify grand total
      const grandTotal = phaseTotals.reduce((sum, p) => sum + p.finalTotal, 0);
      const directTotal = phases.reduce((sum, p) => sum + p.directCost, 0);
      const expectedGrandTotal = directTotal * (1 + bdiPercentage);
      
      expect(grandTotal).toBeCloseTo(expectedGrandTotal, 0);
    });
  });

  describe('Material vs Labor Calculations', () => {
    it('should calculate material and labor percentages', () => {
      const totalMaterial = 60000;
      const totalLabor = 40000;
      const totalDirect = totalMaterial + totalLabor;

      const materialPercentage = (totalMaterial / totalDirect) * 100;
      const laborPercentage = (totalLabor / totalDirect) * 100;

      expect(materialPercentage).toBe(60);
      expect(laborPercentage).toBe(40);
      expect(materialPercentage + laborPercentage).toBe(100);
    });

    it('should handle zero totals gracefully', () => {
      const totalMaterial = 0;
      const totalLabor = 0;
      const totalDirect = totalMaterial + totalLabor;

      const materialPercentage = totalDirect > 0 ? (totalMaterial / totalDirect) * 100 : 0;
      const laborPercentage = totalDirect > 0 ? (totalLabor / totalDirect) * 100 : 0;

      expect(materialPercentage).toBe(0);
      expect(laborPercentage).toBe(0);
    });
  });

  describe('Line Item Total Calculations', () => {
    it('should calculate line item total correctly', () => {
      const quantity = 100;
      const unitCostMaterial = 25.50;
      const unitCostLabor = 15.30;

      const totalMaterial = quantity * unitCostMaterial;
      const totalLabor = quantity * unitCostLabor;
      const totalCost = totalMaterial + totalLabor;

      expect(totalMaterial).toBe(2550);
      expect(totalLabor).toBe(1530);
      expect(totalCost).toBe(4080);
    });

    it('should handle decimal quantities', () => {
      const quantity = 12.5;
      const unitCostMaterial = 100;
      const unitCostLabor = 50;

      const totalMaterial = quantity * unitCostMaterial;
      const totalLabor = quantity * unitCostLabor;
      const totalCost = totalMaterial + totalLabor;

      expect(totalMaterial).toBe(1250);
      expect(totalLabor).toBe(625);
      expect(totalCost).toBe(1875);
    });

    it('should aggregate line items to phase total', () => {
      const lineItems = [
        { quantity: 100, unitCostMaterial: 10, unitCostLabor: 5 },
        { quantity: 50, unitCostMaterial: 20, unitCostLabor: 10 },
        { quantity: 75, unitCostMaterial: 15, unitCostLabor: 8 },
      ];

      const phaseTotalMaterial = lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitCostMaterial,
        0
      );
      const phaseTotalLabor = lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitCostLabor,
        0
      );
      const phaseTotalDirect = phaseTotalMaterial + phaseTotalLabor;

      expect(phaseTotalMaterial).toBe(3125); // 1000 + 1000 + 1125
      expect(phaseTotalLabor).toBe(1600); // 500 + 500 + 600
      expect(phaseTotalDirect).toBe(4725);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const directCost = 10000000; // $10 million
      const bdiPercentage = calculateBDI(mockAppSettings);
      const finalTotal = directCost * (1 + bdiPercentage);

      expect(finalTotal).toBeGreaterThan(directCost);
      expect(finalTotal).toBeLessThan(directCost * 2);
    });

    it('should handle very small numbers', () => {
      const directCost = 0.01; // 1 cent
      const bdiPercentage = calculateBDI(mockAppSettings); // Already in decimal form
      const finalTotal = directCost * (1 + bdiPercentage);

      expect(finalTotal).toBeGreaterThan(0);
      expect(finalTotal).toBeCloseTo(0.01255, 5); // 0.01 * 1.25547 ≈ 0.01255
    });

    it('should maintain precision with floating-point arithmetic', () => {
      const directCost = 12345.67;
      const bdiPercentage = calculateBDI(mockAppSettings);
      const finalTotal = directCost * (1 + bdiPercentage);

      // Verify no significant precision loss
      const calculatedDirect = finalTotal / (1 + bdiPercentage);
      expect(calculatedDirect).toBeCloseTo(directCost, 2);
    });
  });
});

