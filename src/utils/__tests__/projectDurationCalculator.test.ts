/**
 * Regression Tests for Project Duration Calculator
 * 
 * These tests ensure that construction months calculation works correctly
 * and prevents regressions where monthly payment shows only 1 month for longer projects.
 * 
 * Test Coverage:
 * - Priority 1: total_duration field (days to months conversion)
 * - Priority 2: start_date and end_date calculation
 * - Edge cases: null/undefined values, invalid dates, loading states
 * - Minimum value: always returns at least 1 month
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateConstructionMonths, type ProjectDurationInput } from '../projectDurationCalculator';

describe('calculateConstructionMonths - Regression Tests', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Priority 1: total_duration field', () => {
    it('should calculate months from total_duration in days', () => {
      const project: ProjectDurationInput = {
        total_duration: 90, // 90 days = 3 months
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBe(3);
    });

    it('should round up partial months (e.g., 61 days = 3 months)', () => {
      const project: ProjectDurationInput = {
        total_duration: 61, // 61 days = 2.03 months, rounded up to 3
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBe(3);
    });

    it('should handle 30 days as 1 month', () => {
      const project: ProjectDurationInput = {
        total_duration: 30,
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBe(1);
    });

    it('should handle 29 days as 1 month (minimum)', () => {
      const project: ProjectDurationInput = {
        total_duration: 29,
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBe(1);
    });

    it('should handle 180 days as 6 months', () => {
      const project: ProjectDurationInput = {
        total_duration: 180,
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBe(6);
    });

    it('should handle 365 days as 13 months (12.17 rounded up)', () => {
      const project: ProjectDurationInput = {
        total_duration: 365,
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBe(13);
    });

    it('should prioritize total_duration over start_date/end_date', () => {
      const project: ProjectDurationInput = {
        total_duration: 120, // 4 months
        start_date: '2024-01-01',
        end_date: '2024-12-31', // Would be ~12 months if calculated from dates
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBe(4); // Should use total_duration, not dates
    });

    it('should handle total_duration of 0 by falling back to dates', () => {
      const project: ProjectDurationInput = {
        total_duration: 0, // Invalid, should fall back
        start_date: '2024-01-01',
        end_date: '2024-07-01', // ~182 days = ~6.07 months, rounded up = 7
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      // Jan 1 to Jul 1 = 182 days (inclusive) = 6.07 months, rounded up = 7
      expect(result).toBe(7);
    });

    it('should handle null total_duration by falling back to dates', () => {
      const project: ProjectDurationInput = {
        total_duration: null,
        start_date: '2024-01-01',
        end_date: '2024-04-01', // ~91 days = ~3.03 months, rounded up = 4
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      // Jan 1 to Apr 1 = 91 days (inclusive) = 3.03 months, rounded up = 4
      expect(result).toBe(4);
    });
  });

  describe('Priority 2: start_date and end_date calculation', () => {
    it('should calculate months from start_date and end_date', () => {
      const project: ProjectDurationInput = {
        start_date: '2024-01-01',
        end_date: '2024-04-01', // ~91 days = ~3.03 months, rounded up to 4
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      // Jan 1 to Apr 1 = 91 days (inclusive) = 3.03 months, rounded up = 4
      expect(result).toBe(4);
    });

    it('should handle 1 month duration (inclusive)', () => {
      const project: ProjectDurationInput = {
        start_date: '2024-01-01',
        end_date: '2024-01-31', // 31 days (inclusive) = 1.03 months, rounded up = 2
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      // 31 days / 30 = 1.03, rounded up = 2 months
      expect(result).toBe(2);
    });

    it('should handle same-day start and end as 1 month (inclusive)', () => {
      const project: ProjectDurationInput = {
        start_date: '2024-01-15',
        end_date: '2024-01-15', // Same day, should be 1 month
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBe(1);
    });

    it('should handle 6 months duration', () => {
      const project: ProjectDurationInput = {
        start_date: '2024-01-01',
        end_date: '2024-07-01', // ~182 days = ~6.07 months, rounded up = 7
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      // Jan 1 to Jul 1 = 182 days (inclusive) = 6.07 months, rounded up = 7
      expect(result).toBe(7);
    });

    it('should handle 12 months duration', () => {
      const project: ProjectDurationInput = {
        start_date: '2024-01-01',
        end_date: '2025-01-01', // 366 days (2024 is leap year) = 12.2 months, rounded up = 13
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      // 366 days / 30 = 12.2, rounded up = 13 months
      expect(result).toBe(13);
    });

    it('should handle dates in reverse order (end before start)', () => {
      const project: ProjectDurationInput = {
        start_date: '2024-12-01',
        end_date: '2024-01-01', // Reverse order, should use absolute difference
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBe(12); // Should calculate correctly using absolute difference
    });

    it('should handle invalid date strings by defaulting to 1 month', () => {
      const project: ProjectDurationInput = {
        start_date: 'invalid-date',
        end_date: '2024-01-01',
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBe(1);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should handle missing start_date by defaulting to 1 month', () => {
      const project: ProjectDurationInput = {
        end_date: '2024-12-31',
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBe(1);
    });

    it('should handle missing end_date by defaulting to 1 month', () => {
      const project: ProjectDurationInput = {
        start_date: '2024-01-01',
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBe(1);
    });
  });

  describe('Edge cases and fallbacks', () => {
    it('should return 1 month when project is null', () => {
      const result = calculateConstructionMonths(null);
      expect(result).toBe(1);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should return 1 month when project is undefined', () => {
      const result = calculateConstructionMonths(undefined);
      expect(result).toBe(1);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should return 0 when isLoading is true (to indicate unknown duration)', () => {
      const project: ProjectDurationInput = {
        total_duration: 180,
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project, { isLoading: true });
      expect(result).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Project data still loading')
      );
    });

    it('should return 1 month when no duration data is available', () => {
      const project: ProjectDurationInput = {
        name: 'Test Project'
        // No total_duration, start_date, or end_date
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBe(1);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should always return at least 1 month (minimum value)', () => {
      // Even with 0 days, should return 1 month minimum
      const project: ProjectDurationInput = {
        total_duration: 0,
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Real-world scenarios (regression prevention)', () => {
    it('should handle a 6-month project correctly (regression test)', () => {
      // This is the scenario that was breaking - showing 1 month instead of 6
      const project: ProjectDurationInput = {
        total_duration: 180, // 6 months
        name: 'Residential Construction'
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBe(6);
    });

    it('should handle a 12-month project correctly (regression test)', () => {
      const project: ProjectDurationInput = {
        total_duration: 365, // ~12 months
        name: 'Commercial Building'
      };

      const result = calculateConstructionMonths(project);
      expect(result).toBe(13); // 365/30 = 12.17, rounded up to 13
    });

    it('should handle a project with only date range (no total_duration)', () => {
      // Scenario: Project has dates but no total_duration field
      const project: ProjectDurationInput = {
        start_date: '2024-01-01',
        end_date: '2024-10-01', // ~274 days = ~9.13 months, rounded up = 10
        name: 'Infrastructure Project'
      };

      const result = calculateConstructionMonths(project);
      // Jan 1 to Oct 1 = 274 days (inclusive) = 9.13 months, rounded up = 10
      expect(result).toBe(10);
    });

    it('should handle project with projectId in options for logging', () => {
      const project: ProjectDurationInput = {
        total_duration: 90,
        name: 'Test Project'
      };

      const result = calculateConstructionMonths(project, { projectId: 'test-id-123' });
      expect(result).toBe(3);
      // Verify logging includes projectId
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[calculateConstructionMonths]'),
        expect.objectContaining({
          projectId: 'test-id-123'
        })
      );
    });
  });

  describe('Monthly payment calculation integration', () => {
    it('should produce correct monthly payment when divided by total INSS', () => {
      // Simulate: Total INSS = R$ 60,000, Project = 6 months
      const project: ProjectDurationInput = {
        total_duration: 180, // 6 months
        name: 'Test Project'
      };

      const constructionMonths = calculateConstructionMonths(project);
      const totalINSS = 60000;
      const monthlyPayment = totalINSS / constructionMonths;

      expect(constructionMonths).toBe(6);
      expect(monthlyPayment).toBe(10000); // R$ 10,000 per month
    });

    it('should prevent monthly payment = total INSS (regression test)', () => {
      // This was the bug: monthly payment showing same as total INSS
      const project: ProjectDurationInput = {
        total_duration: 180, // 6 months
        name: 'Test Project'
      };

      const constructionMonths = calculateConstructionMonths(project);
      const totalINSS = 60000;
      const monthlyPayment = totalINSS / constructionMonths;

      // Monthly payment should NOT equal total INSS for multi-month projects
      expect(monthlyPayment).not.toBe(totalINSS);
      expect(monthlyPayment).toBe(10000);
    });
  });
});
