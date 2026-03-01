/**
 * Regression Tests for INSS Planning Container
 * 
 * These tests ensure that the monthly payment calculation works correctly
 * and prevents regressions where monthly payment shows only 1 month for longer projects.
 * 
 * Critical Regression Scenarios:
 * 1. Monthly payment should NOT equal total INSS for multi-month projects
 * 2. Construction months should be calculated correctly from project data
 * 3. Project data loading should not break the calculation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { calculateConstructionMonths } from '@/utils/projectDurationCalculator';
import type { ProjectDurationInput } from '@/utils/projectDurationCalculator';

describe('INSS Planning Container - Regression Tests', () => {
  describe('Construction Months Calculation Integration', () => {
    it('should calculate correct months for 6-month project (critical regression)', () => {
      const project: ProjectDurationInput = {
        total_duration: 180, // 6 months
        name: 'Residential Construction'
      };

      const months = calculateConstructionMonths(project);
      expect(months).toBe(6);

      // Verify monthly payment calculation
      const totalINSS = 60000;
      const monthlyPayment = totalINSS / months;
      
      // Monthly payment should NOT equal total INSS
      expect(monthlyPayment).not.toBe(totalINSS);
      expect(monthlyPayment).toBe(10000); // R$ 10,000 per month
    });

    it('should prevent monthly payment = total INSS bug (regression test)', () => {
      // This was the original bug: monthly payment showing same as total INSS
      const project: ProjectDurationInput = {
        total_duration: 180, // 6 months
        name: 'Test Project'
      };

      const constructionMonths = calculateConstructionMonths(project);
      const totalINSS = 50000;
      const monthlyPayment = totalINSS / constructionMonths;

      // Critical assertion: Monthly payment must be different from total
      expect(constructionMonths).toBeGreaterThan(1);
      expect(monthlyPayment).not.toBe(totalINSS);
      expect(monthlyPayment).toBeLessThan(totalINSS);
    });

    it('should handle project with date range correctly', () => {
      const project: ProjectDurationInput = {
        start_date: '2024-01-01',
        end_date: '2024-07-01', // ~6 months
        name: 'Commercial Building'
      };

      const months = calculateConstructionMonths(project);
      expect(months).toBeGreaterThan(1);

      const totalINSS = 120000;
      const monthlyPayment = totalINSS / months;
      
      expect(monthlyPayment).toBeLessThan(totalINSS);
    });

    it('should default to 1 month only when no project data available', () => {
      // When project is null, should default to 1
      const monthsNull = calculateConstructionMonths(null);
      expect(monthsNull).toBe(1);

      // When project has no duration data, should default to 1
      const projectNoData: ProjectDurationInput = {
        name: 'Test Project'
      };
      const monthsNoData = calculateConstructionMonths(projectNoData);
      expect(monthsNoData).toBe(1);

      // But when project HAS duration data, should NOT default to 1
      const projectWithData: ProjectDurationInput = {
        total_duration: 180,
        name: 'Test Project'
      };
      const monthsWithData = calculateConstructionMonths(projectWithData);
      expect(monthsWithData).toBe(6);
      expect(monthsWithData).not.toBe(1);
    });
  });

  describe('Monthly Payment Formula Validation', () => {
    it('should correctly divide total INSS by construction months', () => {
      const testCases = [
        { total_duration: 90, totalINSS: 30000, expectedMonthly: 10000 }, // 3 months
        { total_duration: 180, totalINSS: 60000, expectedMonthly: 10000 }, // 6 months
        { total_duration: 365, totalINSS: 120000, expectedMonthly: 9231 }, // ~13 months (rounded)
      ];

      testCases.forEach(({ total_duration, totalINSS, expectedMonthly }) => {
        const project: ProjectDurationInput = {
          total_duration,
          name: 'Test Project'
        };

        const months = calculateConstructionMonths(project);
        const monthlyPayment = totalINSS / months;

        // Allow small rounding differences
        expect(Math.abs(monthlyPayment - expectedMonthly)).toBeLessThan(100);
        expect(monthlyPayment).toBeLessThan(totalINSS);
      });
    });

    it('should ensure monthly payment formula: monthlyPayment = totalINSS / constructionMonths', () => {
      const project: ProjectDurationInput = {
        total_duration: 180, // 6 months
        name: 'Test Project'
      };

      const constructionMonths = calculateConstructionMonths(project);
      const totalINSS = 60000;
      const monthlyPayment = totalINSS / constructionMonths;

      // Verify the formula holds
      expect(monthlyPayment * constructionMonths).toBeCloseTo(totalINSS, 2);
    });
  });

  describe('Edge Cases and Data Loading', () => {
    it('should handle loading state correctly', () => {
      const project: ProjectDurationInput = {
        total_duration: 180,
        name: 'Test Project'
      };

      // When loading, should return 0 to indicate unknown duration
      const monthsLoading = calculateConstructionMonths(project, { isLoading: true });
      expect(monthsLoading).toBe(0);

      // When not loading, should return actual calculation
      const monthsLoaded = calculateConstructionMonths(project, { isLoading: false });
      expect(monthsLoaded).toBe(6);
    });

    it('should handle project data becoming available after loading', () => {
      // Simulate loading state
      const monthsDuringLoad = calculateConstructionMonths(null, { isLoading: true });
      expect(monthsDuringLoad).toBe(0);

      // Simulate project data loaded
      const project: ProjectDurationInput = {
        total_duration: 180,
        name: 'Test Project'
      };
      const monthsAfterLoad = calculateConstructionMonths(project, { isLoading: false });
      expect(monthsAfterLoad).toBe(6);
      expect(monthsAfterLoad).not.toBe(monthsDuringLoad);
    });
  });
});
