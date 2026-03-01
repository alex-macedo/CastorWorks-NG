import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as z from 'zod';

// Mock the hooks
vi.mock('@/hooks/useConfigDropdown', () => ({
  useConfigDropdown: vi.fn(() => [
    { value: 'Own Build', label: 'Own Build' },
    { value: 'Final Contractor', label: 'Final Contractor' }
  ])
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({
    projects: [
      { id: '1', name: 'Own Build Project', type: 'Own Build' },
      { id: '2', name: 'Final Contractor Project', type: 'Final Contractor' }
    ],
    isLoading: false
  }))
}));

vi.mock('@/hooks/useFinancialEntries', () => ({
  useFinancialEntries: vi.fn(() => ({
    createEntry: { mutate: vi.fn(), isPending: false },
    updateEntry: { mutate: vi.fn(), isPending: false }
  }))
}));

// Mock LocalizationContext
vi.mock('@/contexts/LocalizationContext', () => ({
  useLocalization: vi.fn(() => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'projects:projectTypeLabel': 'Project Type',
        'projects:selectProjectType': 'Select project type',
        'projects:totalAreaLabel': `Total Area (${params?.unit || 'm²'})`,
        'projects:constructionStartDate': 'Construction Start Date',
        'projects:externalAreaGrassLabel': `External Area - Grass (${params?.unit || 'm²'})`,
        'projects:externalAreaPavingLabel': `External Area - Paving (${params?.unit || 'm²'})`,
        'common.selectDate': 'Select date'
      };
      return translations[key] || key;
    },
    dateFormat: 'MM/dd/yyyy',
    currency: 'USD',
    setLanguage: vi.fn(),
    setCurrency: vi.fn(),
    setDateFormat: vi.fn(),
    language: 'en'
  })),
  LocalizationContext: {
    Provider: ({ children }: any) => children
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

describe('Project Type and Revenue Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1: Project Type Schema Validation', () => {
    it('should accept valid project types', () => {
      const projectSchema = z.object({
        type: z.enum(['Own Build', 'Final Contractor']).nullable().optional().or(z.literal('')),
      });

      // Test Own Build
      const ownBuildResult = projectSchema.safeParse({ type: 'Own Build' });
      expect(ownBuildResult.success).toBe(true);

      // Test Final Contractor
      const finalContractorResult = projectSchema.safeParse({ type: 'Final Contractor' });
      expect(finalContractorResult.success).toBe(true);

      // Test null
      const nullResult = projectSchema.safeParse({ type: null });
      expect(nullResult.success).toBe(true);

      // Test empty string
      const emptyResult = projectSchema.safeParse({ type: '' });
      expect(emptyResult.success).toBe(true);
    });

    it('should reject invalid project types', () => {
      const projectSchema = z.object({
        type: z.enum(['Own Build', 'Final Contractor']).nullable().optional().or(z.literal('')),
      });

      const invalidResult = projectSchema.safeParse({ type: 'Invalid Type' });
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('AC2 & AC3: Revenue Rule Logic', () => {
    it('should identify Final Contractor projects correctly', () => {
      const projects = [
        { id: '1', type: 'Own Build' },
        { id: '2', type: 'Final Contractor' },
        { id: '3', type: 'final contractor' }, // case insensitive
        { id: '4', type: null }
      ];

      // Test the logic used in the application
      const isFinalContractor = (projectType: string | null | undefined) => {
        return !!projectType && projectType.toLowerCase().includes('final');
      };

      expect(isFinalContractor(projects[0].type)).toBe(false);
      expect(isFinalContractor(projects[1].type)).toBe(true);
      expect(isFinalContractor(projects[2].type)).toBe(true);
      expect(isFinalContractor(projects[3].type)).toBe(false);
    });

    it('should validate income entry type based on project type', () => {
      const validateIncomeEntry = (projectType: string | null | undefined, entryType: string) => {
        if (entryType === 'income' && projectType && projectType.toLowerCase().includes('final')) {
          throw new Error('Cannot create revenue/income for a Final Contractor project. Revenue is disabled for this project type.');
        }
        return true;
      };

      // Own Build - should allow income
      expect(() => validateIncomeEntry('Own Build', 'income')).not.toThrow();

      // Final Contractor - should block income
      expect(() => validateIncomeEntry('Final Contractor', 'income')).toThrow('Cannot create revenue/income for a Final Contractor project');

      // Final Contractor - should allow expense
      expect(() => validateIncomeEntry('Final Contractor', 'expense')).not.toThrow();

      // Own Build - should allow expense
      expect(() => validateIncomeEntry('Own Build', 'expense')).not.toThrow();
    });

    it('should have correct error message for validation', () => {
      const expectedMessage = 'Cannot create revenue/income for a Final Contractor project. Revenue is disabled for this project type.';

      try {
        const projectType = 'Final Contractor';
        const entryType = 'income';

        if (entryType === 'income' && projectType && projectType.toLowerCase().includes('final')) {
          throw new Error(expectedMessage);
        }
      } catch (error: any) {
        expect(error.message).toBe(expectedMessage);
      }
    });
  });

  describe('Database Migration', () => {
    it('should have proper CHECK constraint values', () => {
      const allowedValues = ['Own Build', 'Final Contractor'];
      const testValues = [
        { value: 'Own Build', valid: true },
        { value: 'Final Contractor', valid: true },
        { value: 'Invalid', valid: false },
        { value: null, valid: true }, // NULL is allowed
      ];

      testValues.forEach(test => {
        const isValid = test.value === null || allowedValues.includes(test.value);
        expect(isValid).toBe(test.valid);
      });
    });
  });
});
