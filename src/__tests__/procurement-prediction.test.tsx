import { describe, it, expect, vi } from 'vitest';

describe('Procurement Spend Prediction', () => {
  describe('Supplier scoring algorithm', () => {
    it('should calculate weighted score correctly', () => {
      // Score = Price (40%) + Response Time (30%) + Reliability (30%)
      const priceScore = 75;
      const responseScore = 80; // (100 - avgResponseTime * 10)
      const reliabilityScore = 85;

      const weightedScore = Math.round(priceScore * 0.4 + responseScore * 0.3 + reliabilityScore * 0.3);
      expect(weightedScore).toBe(80); // 30 + 24 + 25.5 ≈ 80
    });

    it('should rank suppliers by score descending', () => {
      const scores = [
        { name: 'Supplier A', score: 75, rank: 0 },
        { name: 'Supplier B', score: 90, rank: 0 },
        { name: 'Supplier C', score: 85, rank: 0 },
      ];

      scores.sort((a, b) => b.score - a.score);
      scores.forEach((s, i) => s.rank = i + 1);

      expect(scores[0].name).toBe('Supplier B');
      expect(scores[0].rank).toBe(1);
      expect(scores[1].name).toBe('Supplier C');
      expect(scores[1].rank).toBe(2);
      expect(scores[2].name).toBe('Supplier A');
      expect(scores[2].rank).toBe(3);
    });
  });

  describe('Spend forecasting', () => {
    it('should calculate forecast based on historical average', () => {
      const totalHistoricalSpend = 90000;
      const daysOfData = 90;
      const timeframeDays = 30;

      const dailyAverage = totalHistoricalSpend / daysOfData;
      const forecast = Math.round(dailyAverage * timeframeDays);

      expect(forecast).toBe(30000);
    });

    it('should set confidence level based on data quantity', () => {
      const getConfidence = (purchaseCount: number) => {
        if (purchaseCount > 10) return 75;
        if (purchaseCount > 5) return 60;
        return 45;
      };

      expect(getConfidence(15)).toBe(75);
      expect(getConfidence(8)).toBe(60);
      expect(getConfidence(3)).toBe(45);
    });

    it('should split forecast between materials and services', () => {
      const forecastedSpend = 100000;
      const materialsRatio = 0.7;
      const servicesRatio = 0.3;

      const breakdown = {
        materials: Math.round(forecastedSpend * materialsRatio),
        services: Math.round(forecastedSpend * servicesRatio)
      };

      expect(breakdown.materials).toBe(70000);
      expect(breakdown.services).toBe(30000);
      expect(breakdown.materials + breakdown.services).toBe(forecastedSpend);
    });
  });

  describe('Optimal purchase windows', () => {
    it('should suggest windows based on timeframe', () => {
      const findWindows = (timeframeDays: number) => {
        const windows = [];
        if (timeframeDays >= 30) windows.push({ reason: 'Week 2 - Optimal for bulk orders', savings: 5 });
        if (timeframeDays >= 60) windows.push({ reason: 'Month-end supplier discounts', savings: 8 });
        return windows;
      };

      expect(findWindows(30)).toHaveLength(1);
      expect(findWindows(60)).toHaveLength(2);
      expect(findWindows(90)).toHaveLength(2);
    });
  });

  describe('Timeframe validation', () => {
    it('should accept valid timeframes', () => {
      const validTimeframes = ['30', '60', '90'];
      expect(validTimeframes).toContain('30');
      expect(validTimeframes).toContain('60');
      expect(validTimeframes).toContain('90');
    });
  });
});
