import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLocalizedTemplate } from './templateLocalization';

describe('templateLocalization', () => {
  describe('getLocalizedTemplate', () => {
    // Mock translation function
    const mockT = vi.fn((key: string) => {
      const translations: Record<string, string> = {
        'phaseTemplates.brazilianTemplate.name': 'Construção Residencial Brasileira',
        'phaseTemplates.brazilianTemplate.description': 'Fases abrangentes de construção baseadas em padrões brasileiros',
        'constructionActivities.brazilianTemplate.name': 'Atividades de Construção Brasileira',
        'constructionActivities.brazilianTemplate.description': 'Atividades detalhadas de construção alinhadas com o fluxo de trabalho',
      };
      return translations[key] || key;
    });

    beforeEach(() => {
      mockT.mockClear();
    });

    describe('Brazilian Residential Construction template', () => {
      it('should return localized name and description', () => {
        const result = getLocalizedTemplate(
          'Brazilian Residential Construction',
          'Original description',
          mockT
        );

        expect(result.displayName).toBe('Construção Residencial Brasileira');
        expect(result.displayDescription).toBe('Fases abrangentes de construção baseadas em padrões brasileiros');
        expect(mockT).toHaveBeenCalledWith('phaseTemplates.brazilianTemplate.name');
        expect(mockT).toHaveBeenCalledWith('phaseTemplates.brazilianTemplate.description');
      });

      it('should return localized name and null description when description is null', () => {
        const result = getLocalizedTemplate(
          'Brazilian Residential Construction',
          null,
          mockT
        );

        expect(result.displayName).toBe('Construção Residencial Brasileira');
        expect(result.displayDescription).toBeNull();
        expect(mockT).toHaveBeenCalledWith('phaseTemplates.brazilianTemplate.name');
        expect(mockT).not.toHaveBeenCalledWith('phaseTemplates.brazilianTemplate.description');
      });

      it('should return localized name and null description when description is empty string', () => {
        const result = getLocalizedTemplate(
          'Brazilian Residential Construction',
          '',
          mockT
        );

        expect(result.displayName).toBe('Construção Residencial Brasileira');
        expect(result.displayDescription).toBeNull();
      });
    });

    describe('Brazilian Construction Activities template', () => {
      it('should return localized name and description', () => {
        const result = getLocalizedTemplate(
          'Brazilian Construction Activities',
          'Original description',
          mockT
        );

        expect(result.displayName).toBe('Atividades de Construção Brasileira');
        expect(result.displayDescription).toBe('Atividades detalhadas de construção alinhadas com o fluxo de trabalho');
        expect(mockT).toHaveBeenCalledWith('constructionActivities.brazilianTemplate.name');
        expect(mockT).toHaveBeenCalledWith('constructionActivities.brazilianTemplate.description');
      });

      it('should return localized name and null description when description is null', () => {
        const result = getLocalizedTemplate(
          'Brazilian Construction Activities',
          null,
          mockT
        );

        expect(result.displayName).toBe('Atividades de Construção Brasileira');
        expect(result.displayDescription).toBeNull();
        expect(mockT).toHaveBeenCalledWith('constructionActivities.brazilianTemplate.name');
        expect(mockT).not.toHaveBeenCalledWith('constructionActivities.brazilianTemplate.description');
      });
    });

    describe('Custom/unknown templates', () => {
      it('should return original name and description for unknown templates', () => {
        const result = getLocalizedTemplate(
          'Custom Template Name',
          'Custom template description',
          mockT
        );

        expect(result.displayName).toBe('Custom Template Name');
        expect(result.displayDescription).toBe('Custom template description');
        expect(mockT).not.toHaveBeenCalled();
      });

      it('should return original name and null description when description is null', () => {
        const result = getLocalizedTemplate(
          'Another Custom Template',
          null,
          mockT
        );

        expect(result.displayName).toBe('Another Custom Template');
        expect(result.displayDescription).toBeNull();
        expect(mockT).not.toHaveBeenCalled();
      });

      it('should handle empty template name', () => {
        const result = getLocalizedTemplate(
          '',
          'Some description',
          mockT
        );

        expect(result.displayName).toBe('');
        expect(result.displayDescription).toBe('Some description');
        expect(mockT).not.toHaveBeenCalled();
      });
    });

    describe('Edge cases', () => {
      it('should be case-sensitive for template names', () => {
        const result = getLocalizedTemplate(
          'brazilian residential construction', // lowercase
          'Description',
          mockT
        );

        expect(result.displayName).toBe('brazilian residential construction');
        expect(result.displayDescription).toBe('Description');
        expect(mockT).not.toHaveBeenCalled();
      });

      it('should not match partial template names', () => {
        const result = getLocalizedTemplate(
          'Brazilian Residential',
          'Description',
          mockT
        );

        expect(result.displayName).toBe('Brazilian Residential');
        expect(result.displayDescription).toBe('Description');
        expect(mockT).not.toHaveBeenCalled();
      });

      it('should handle template names with extra whitespace', () => {
        const result = getLocalizedTemplate(
          'Brazilian Residential Construction ',
          'Description',
          mockT
        );

        // Should not match due to trailing space
        expect(result.displayName).toBe('Brazilian Residential Construction ');
        expect(result.displayDescription).toBe('Description');
        expect(mockT).not.toHaveBeenCalled();
      });
    });

    describe('Translation function behavior', () => {
      it('should call translation function with correct keys for phase templates', () => {
        const customT = vi.fn((key: string) => key);
        
        getLocalizedTemplate(
          'Brazilian Residential Construction',
          'Description',
          customT
        );

        expect(customT).toHaveBeenCalledTimes(2);
        expect(customT).toHaveBeenNthCalledWith(1, 'phaseTemplates.brazilianTemplate.name');
        expect(customT).toHaveBeenNthCalledWith(2, 'phaseTemplates.brazilianTemplate.description');
      });

      it('should call translation function with correct keys for activity templates', () => {
        const customT = vi.fn((key: string) => key);
        
        getLocalizedTemplate(
          'Brazilian Construction Activities',
          'Description',
          customT
        );

        expect(customT).toHaveBeenCalledTimes(2);
        expect(customT).toHaveBeenNthCalledWith(1, 'constructionActivities.brazilianTemplate.name');
        expect(customT).toHaveBeenNthCalledWith(2, 'constructionActivities.brazilianTemplate.description');
      });

      it('should only call translation function once when description is null', () => {
        const customT = vi.fn((key: string) => key);
        
        getLocalizedTemplate(
          'Brazilian Residential Construction',
          null,
          customT
        );

        expect(customT).toHaveBeenCalledTimes(1);
        expect(customT).toHaveBeenCalledWith('phaseTemplates.brazilianTemplate.name');
      });
    });
  });
});
