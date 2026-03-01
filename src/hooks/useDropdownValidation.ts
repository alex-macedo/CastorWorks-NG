import { useCallback } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useDropdownOptions, DropdownCategory } from './useDropdownOptions';

interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

interface UseDropdownValidationResult {
  validateValue: (value: string | null | undefined) => ValidationResult;
  getValidValues: () => string[];
  isLoading: boolean;
}

/**
 * Hook for validating dropdown values with i18n error messages.
 * 
 * @param category - The dropdown category to validate against
 * @returns Validation utilities for the specified category
 * 
 * @example
 * ```tsx
 * const { validateValue, isLoading } = useDropdownValidation('task_priority');
 * 
 * const result = validateValue('high');
 * if (!result.isValid) {
 *   toast.error(result.errorMessage);
 * }
 * ```
 */
export const useDropdownValidation = (
  category: DropdownCategory | string
): UseDropdownValidationResult => {
  const { t } = useLocalization();
  const { data: options = [], isLoading } = useDropdownOptions(category);

  const getValidValues = useCallback(() => {
    return options.map((opt) => opt.value);
  }, [options]);

  const validateValue = useCallback(
    (value: string | null | undefined): ValidationResult => {
      // Allow empty/null values - let required validation handle that separately
      if (value === null || value === undefined || value === '') {
        return { isValid: true };
      }

      const validValues = getValidValues();
      
      // If options haven't loaded yet, assume valid
      if (validValues.length === 0 && isLoading) {
        return { isValid: true };
      }

      const isValid = validValues.includes(value);

      if (!isValid) {
        const errorMessage = t('validation.invalidDropdownValue', {
          value,
          category,
          validOptions: validValues.join(', '),
        }) || `Invalid value "${value}" for ${category}. Valid options: ${validValues.join(', ')}`;

        return { isValid: false, errorMessage };
      }

      return { isValid: true };
    },
    [getValidValues, isLoading, category, t]
  );

  return {
    validateValue,
    getValidValues,
    isLoading,
  };
};

/**
 * Hook for creating a Zod refinement function for dropdown validation.
 * 
 * @param category - The dropdown category to validate against
 * @returns A function suitable for use with Zod's .refine()
 * 
 * @example
 * ```tsx
 * const validatePriority = useDropdownZodValidator('task_priority');
 * 
 * const schema = z.object({
 *   priority: z.string().refine(validatePriority.validate, {
 *     message: validatePriority.message,
 *   }),
 * });
 * ```
 */
export const useDropdownZodValidator = (category: DropdownCategory | string) => {
  const { validateValue, isLoading } = useDropdownValidation(category);
  const { t } = useLocalization();

  return {
    validate: (value: string) => {
      // Skip validation while loading
      if (isLoading) return true;
      const result = validateValue(value);
      return result.isValid;
    },
    message: t('validation.invalidDropdownValue', { category }) || 
      `Invalid value for ${category}`,
  };
};

export default useDropdownValidation;
