import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from 'lodash';

export interface ValidationRule<T = any> {
  validate: (value: T) => boolean | Promise<boolean>;
  message: string;
  async?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  isValidating?: boolean;
}

export interface UseRealTimeValidationOptions<T = any> {
  rules?: ValidationRule<T>[];
  debounceMs?: number;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  asyncDebounceMs?: number;
}

export function useRealTimeValidation<T = any>(
  options: UseRealTimeValidationOptions<T> = {}
) {
  const {
    rules = [],
    debounceMs = 300,
    validateOnChange = true,
    validateOnBlur = true,
    asyncDebounceMs = 500,
  } = options;

  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validateValue = useCallback(
    async (value: T, isBlur = false): Promise<void> => {
      // Cancel previous async validation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setValidation(prev => ({ ...prev, isValidating: true }));

      try {
        const syncRules = rules.filter(rule => !rule.async);
        const asyncRules = rules.filter(rule => rule.async);

        // Validate sync rules immediately
        for (const rule of syncRules) {
          const isValid = rule.validate(value);
          if (!isValid) {
            setValidation({
              isValid: false,
              error: rule.message,
              isValidating: false,
            });
            return;
          }
        }

        // If there are async rules, validate them
        if (asyncRules.length > 0) {
          // Create new abort controller for this validation
          abortControllerRef.current = new AbortController();

          const timeout = setTimeout(async () => {
            if (abortControllerRef.current?.signal.aborted) return;

            for (const rule of asyncRules) {
              try {
                const isValid = await rule.validate(value);
                if (!isValid) {
                  if (!abortControllerRef.current?.signal.aborted) {
                    setValidation({
                      isValid: false,
                      error: rule.message,
                      isValidating: false,
                    });
                  }
                  return;
                }
              } catch (error) {
                if (!abortControllerRef.current?.signal.aborted) {
                  setValidation({
                    isValid: false,
                    error: 'Validation failed',
                    isValidating: false,
                  });
                }
                return;
              }
            }

            // All validations passed
            if (!abortControllerRef.current?.signal.aborted) {
              setValidation({
                isValid: true,
                isValidating: false,
              });
            }
          }, asyncDebounceMs);

          timeoutRef.current = timeout;
        } else {
          // No async rules, all sync rules passed
          setValidation({
            isValid: true,
            isValidating: false,
          });
        }
      } catch (error) {
        setValidation({
          isValid: false,
          error: 'Validation error',
          isValidating: false,
        });
      }
    },
    [rules, asyncDebounceMs]
  );

  const debouncedValidateRef = useRef<ReturnType<typeof debounce> | null>(null);

  useEffect(() => {
    debouncedValidateRef.current?.cancel?.();
    debouncedValidateRef.current = debounce((value: T) => validateValue(value), debounceMs);

    return () => {
      debouncedValidateRef.current?.cancel?.();
    };
  }, [validateValue, debounceMs]);

  const debouncedValidate = useCallback((value: T) => {
    debouncedValidateRef.current?.(value);
  }, []);

  const handleChange = useCallback(
    (value: T) => {
      if (validateOnChange) {
        debouncedValidate(value);
      }
    },
    [validateOnChange, debouncedValidate]
  );

  const handleBlur = useCallback(
    (value: T) => {
      if (validateOnBlur) {
        validateValue(value, true);
      }
    },
    [validateOnBlur, validateValue]
  );

  const reset = useCallback(() => {
    setValidation({ isValid: true });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    validation,
    handleChange,
    handleBlur,
    validateValue,
    reset,
  };
}

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => value !== null && value !== undefined && String(value).trim() !== '',
    message,
  }),

  minLength: (minLength: number, message?: string): ValidationRule => ({
    validate: (value) => String(value).length >= minLength,
    message: message || `Must be at least ${minLength} characters`,
  }),

  maxLength: (maxLength: number, message?: string): ValidationRule => ({
    validate: (value) => String(value).length <= maxLength,
    message: message || `Must be no more than ${maxLength} characters`,
  }),

  email: (message = 'Invalid email address'): ValidationRule => ({
    validate: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(String(value));
    },
    message,
  }),

  url: (message = 'Invalid URL'): ValidationRule => ({
    validate: (value) => {
      try {
        new URL(String(value));
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (value) => regex.test(String(value)),
    message,
  }),

  number: (message = 'Must be a valid number'): ValidationRule => ({
    validate: (value) => !isNaN(Number(value)) && isFinite(Number(value)),
    message,
  }),

  positiveNumber: (message = 'Must be a positive number'): ValidationRule => ({
    validate: (value) => {
      const num = Number(value);
      return !isNaN(num) && isFinite(num) && num > 0;
    },
    message,
  }),

  // Async validation rules
  uniqueEmail: (message = 'Email already exists'): ValidationRule => ({
    validate: async (value) => {
      // This would typically call an API to check if email is unique
      // For now, just return true (implement based on your API)
      return true;
    },
    message,
    async: true,
  }),

  cnpj: (message = 'Invalid CNPJ'): ValidationRule => ({
    validate: (value) => {
      // Brazilian CNPJ validation
      const cnpj = String(value).replace(/\D/g, '');
      if (cnpj.length !== 14) return false;

      // Check if all digits are the same
      if (/^(\d)\1+$/.test(cnpj)) return false;

      // Validate check digits
      const calculateCheckDigit = (cnpj: string, factor: number[]) => {
        let sum = 0;
        for (let i = 0; i < factor.length; i++) {
          sum += parseInt(cnpj[i]) * factor[i];
        }
        const remainder = sum % 11;
        return remainder < 2 ? 0 : 11 - remainder;
      };

      const factor1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const factor2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

      const checkDigit1 = calculateCheckDigit(cnpj, factor1);
      const checkDigit2 = calculateCheckDigit(cnpj, factor2);

      return parseInt(cnpj[12]) === checkDigit1 && parseInt(cnpj[13]) === checkDigit2;
    },
    message,
  }),
};
