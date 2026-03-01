import * as z from 'zod';
import { addDays } from 'date-fns';

/**
 * Common reusable Zod validators for form fields
 * Eliminates duplicate validation logic across forms
 */

// String validators
export const requiredString = (fieldName: string = 'Field') =>
  z.string().min(1, `${fieldName} is required`);

export const optionalString = () =>
  z.string().nullable().optional().or(z.literal(''));

export const maxString = (max: number, fieldName: string = 'Field') =>
  z.string().max(max, `${fieldName} must not exceed ${max} characters`);

export const requiredEmail = () =>
  z.string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .max(255);

export const optionalEmail = () =>
  z.string()
    .email('Invalid email address')
    .max(255)
    .nullable()
    .optional()
    .or(z.literal(''));

// Phone validators
export const requiredPhone = () =>
  z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must not exceed 20 characters');

export const optionalPhone = () =>
  z.string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must not exceed 20 characters')
    .nullable()
    .optional()
    .or(z.literal(''));

// Currency validators
export const currency = () =>
  z.number()
    .min(0, 'Amount must be greater than or equal to 0')
    .nullable()
    .optional();

export const requiredCurrency = () =>
  z.number()
    .min(0.01, 'Amount must be greater than 0')
    .max(999999999, 'Amount exceeds maximum allowed');

export const optionalCurrency = () =>
  z.number()
    .min(0, 'Amount must be greater than or equal to 0')
    .nullable()
    .optional();

// Percentage validators
export const percentage = () =>
  z.number()
    .min(0, 'Percentage must be 0 or greater')
    .max(100, 'Percentage must not exceed 100')
    .nullable()
    .optional();

export const requiredPercentage = () =>
  z.number()
    .min(0, 'Percentage must be 0 or greater')
    .max(100, 'Percentage must not exceed 100');

// Number validators
export const positiveNumber = () =>
  z.number()
    .min(0.01, 'Value must be greater than 0')
    .nullable()
    .optional();

export const nonNegativeNumber = () =>
  z.number()
    .min(0, 'Value must be greater than or equal to 0')
    .nullable()
    .optional();

export const requiredPositiveNumber = () =>
  z.number()
    .min(0.01, 'Value must be greater than 0');

// Date validators
export const optionalDate = () =>
  z.string().nullable().optional().or(z.literal(''));

export const requiredDate = (fieldName: string = 'Date') =>
  z.string().min(1, `${fieldName} is required`);

export const dateRange = (fieldName: string = 'Date range') => ({
  startDate: requiredDate(`${fieldName} start`),
  endDate: requiredDate(`${fieldName} end`),
});

// File validators
export const imageFile = (maxSizeMB: number = 5) =>
  z.instanceof(File)
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Only JPG, PNG, and WebP images are allowed'
    )
    .refine(
      (file) => file.size <= maxSizeMB * 1024 * 1024,
      `File size must not exceed ${maxSizeMB}MB`
    )
    .nullable()
    .optional();

export const maxFileSize = (maxSizeMB: number = 10) =>
  z.instanceof(File)
    .refine(
      (file) => file.size <= maxSizeMB * 1024 * 1024,
      `File size must not exceed ${maxSizeMB}MB`
    )
    .nullable()
    .optional();

// Array validators
export const arrayLength = (min: number = 0, max: number = 999) =>
  z.array(z.any())
    .min(min, `Must have at least ${min} items`)
    .max(max, `Must not exceed ${max} items`);

export const requiredArray = (min: number = 1, max: number = 999) =>
  z.array(z.any())
    .min(min, `Must have at least ${min} items`)
    .max(max, `Must not exceed ${max} items`);

export const optionalArray = () =>
  z.array(z.any()).nullable().optional().or(z.literal(''));

// URL validator
export const urlString = () =>
  z.string()
    .url('Invalid URL')
    .nullable()
    .optional()
    .or(z.literal(''));

export const requiredUrl = () =>
  z.string()
    .min(1, 'URL is required')
    .url('Invalid URL');

// Enum helpers
export const enumField = <T extends readonly [string, ...string[]]>(
  values: T,
  fieldName: string = 'Field'
) =>
  z.enum(values)
    .nullable()
    .optional()
    .or(z.literal(''));

export const requiredEnum = <T extends readonly [string, ...string[]]>(
  values: T,
  fieldName: string = 'Field'
) =>
  z.enum(values)
    .refine((val) => val !== '', `${fieldName} is required`);

// Combined validators for common use cases
export const contactName = () =>
  z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters');

export const companyName = () =>
  z.string()
    .min(2, 'Company name must be at least 2 characters')
    .max(150, 'Company name must not exceed 150 characters');

export const description = (maxLength: number = 1000) =>
  z.string()
    .max(maxLength, `Description must not exceed ${maxLength} characters`)
    .nullable()
    .optional()
    .or(z.literal(''));

export const requiredDescription = (minLength: number = 10, maxLength: number = 1000) =>
  z.string()
    .min(minLength, `Description must be at least ${minLength} characters`)
    .max(maxLength, `Description must not exceed ${maxLength} characters`);

// CPF/CNPJ (Brazil specific)
export const cpf = () =>
  z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, 'Invalid CPF format')
    .nullable()
    .optional()
    .or(z.literal(''));

export const cnpj = () =>
  z.string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, 'Invalid CNPJ format')
    .nullable()
    .optional()
    .or(z.literal(''));
