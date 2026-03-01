import * as z from 'zod';
import { format } from 'date-fns';
import { validateCPF } from '@/utils/formatters';
import { useLocalization } from '@/contexts/LocalizationContext';

/**
 * Normalize number inputs from form fields (handles comma as decimal separator)
 */
export const normalizeNumberInput = (value: unknown) => {
  if (value === '' || value === null || typeof value === 'undefined') return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // If the value ends with a decimal point or comma, keep it as string to allow typing
    if (value.endsWith('.') || value.endsWith(',')) return value;
    
    const normalized = value.replace(',', '.').trim();
    const num = Number(normalized);
    return Number.isNaN(num) ? value : num;
  }
  return value;
};

// Helper for flexible number fields that might be in intermediate string state
export const flexibleNumber = z.preprocess(
  normalizeNumberInput,
  z.union([z.number(), z.string()])
    .transform(val => {
      // If it's a string, it must be because it's an intermediate state (e.g. "10.")
      // We allow it to pass through as string to the form state
      return val;
    })
    .refine((val) => {
      if (typeof val === 'number') return val >= 0;
      if (typeof val === 'string') {
        const parsed = parseFloat(val.replace(',', '.'));
        return !isNaN(parsed) && parsed >= 0;
      }
      return true; // undefined/null handled by preprocess usually, but safe to allow
    }, { message: "Must be a positive number" })
    .optional()
);

export const flexibleNumberMin1 = z.preprocess(
  normalizeNumberInput,
  z.union([z.number(), z.string()])
    .transform(val => val)
    .refine((val) => {
      if (typeof val === 'number') return val >= 1;
      if (typeof val === 'string') {
        const parsed = parseFloat(val.replace(',', '.'));
        return !isNaN(parsed) && parsed >= 1;
      }
      return true;
    }, { message: "Duration must be at least 1 day" })
    .optional()
);

/**
 * Base project schema without translations (for use without i18n context)
 */
export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  client_id: z.string().uuid('Client selection is required'),
  location: z.string().max(200).nullable().optional().or(z.literal('')),
  construction_address: z.string().max(300).nullable().optional().or(z.literal('')),
  street_number: z.string().max(20).nullable().optional().or(z.literal('')),
  neighborhood: z.string().max(100).nullable().optional().or(z.literal('')),
  zip_code: z.string().max(20).nullable().optional().or(z.literal('')),
  address_complement: z.string().max(300).nullable().optional().or(z.literal('')),
  city: z.string().max(100).nullable().optional().or(z.literal('')),
  language: z.string().max(10).nullable().optional().or(z.literal('')),
  state: z.string().max(50).nullable().optional().or(z.literal('')),
  budget_date: z.string().nullable().optional().or(z.literal('')),
  manager_id: z.string().uuid().nullable().optional().or(z.literal('')),
  type: z.enum(['Project Owned', 'Project Customer']).nullable().optional().or(z.literal('')),
  status: z.string().min(1, 'Status is required'),
  start_date: z.preprocess((arg) => {
    if (arg instanceof Date) return format(arg, 'yyyy-MM-dd');
    return arg;
  }, z.string().min(1, 'Start date is required')),
  total_duration: flexibleNumberMin1,
  end_date: z.preprocess((arg) => {
    if (arg instanceof Date) return format(arg, 'yyyy-MM-dd');
    return arg;
  }, z.string().nullable().optional().or(z.literal(''))),
  budget_total: flexibleNumber,
  description: z.string().max(1000).nullable().optional().or(z.literal('')),
  image_url: z.string().nullable().optional().or(z.literal('')),
  image_focus_point: z.object({ x: z.number(), y: z.number() }).nullable().optional(),
  construction_unit: z.string().nullable().optional().or(z.literal('')),
  total_gross_floor_area: flexibleNumber,
  covered_area: flexibleNumber,
  other_areas: flexibleNumber,
  gourmet_area: flexibleNumber,
  terrain_type: z.enum(['flat', 'slope', 'upslope']).nullable().optional().or(z.literal('')),
  roof_type: z.enum(['colonial', 'built-in', 'waterproofed']).nullable().optional().or(z.literal('')),
  floor_type: z.enum(['ground floor', 'ground + 1 floor', 'ground + 2 floors', 'ground + 3 floors', 'ground + 4 floors']).nullable().optional().or(z.literal('')),
  finishing_type: z.enum(['simple', 'medium', 'high']).nullable().optional().or(z.literal('')),
  paint_type: z.enum(['acrylic', 'grafiato/texture', 'double height ceiling']).nullable().optional().or(z.literal('')),
  double_height_ceiling: z.string().nullable().optional().or(z.literal('')),
  bathrooms: flexibleNumber,
  lavabos: flexibleNumber,
  labor_cost: flexibleNumber,
  material_cost: flexibleNumber,
  taxes_and_fees: flexibleNumber,
  total_spent: flexibleNumber,
  budget_model: z.string().nullable().optional().default('simple'),
  budget_has_materials: z.boolean().optional().default(true),
  create_default_phases: z.boolean().optional().default(true),
});

/**
 * Type for project form data
 */
export type ProjectFormData = z.infer<typeof projectSchema>;

/**
 * Type for dynamic project form schema (create/edit modes)
 */
export type DynamicProjectFormData = {
  name: string;
  client_id: string;
  location?: string | null;
  construction_address?: string | null;
  street_number?: string | null;
  neighborhood?: string | null;
  zip_code?: string | null;
  address_complement?: string | null;
  city?: string | null;
  language?: string | null;
  state?: string | null;
  budget_date?: string | null;
  manager_id?: string | null;
  type?: string | null;
  status: string;
  start_date: string;
  total_duration: number | string;
  end_date?: string | null;
  budget_total?: number | string | null;
  total_gross_floor_area: number | string;
  covered_area: number | string;
  other_areas: number | string;
  gourmet_area: number | string;
  terrain_type?: string | null;
  roof_type?: string | null;
  floor_type?: string | null;
  finishing_type?: string | null;
  paint_type?: string | null;
  double_height_ceiling?: string | null;
  bathrooms?: number | string | null;
  lavabos?: number | string | null;
  labor_cost?: number | string | null;
  material_cost?: number | string | null;
  taxes_and_fees?: number | string | null;
  total_spent?: number | string | null;
  description?: string | null;
  image_url?: string | null;
  image_focus_point?: { x: number; y: number } | null;
  construction_unit?: string | null;
  budget_model: string | null;
  budget_has_materials?: boolean;
  create_default_phases?: boolean;
};

/**
 * Create a translated project schema for use with i18n
 * @param t - translation function from useTranslation()
 */
export const createProjectSchema = (
  t: (key: string) => string,
  options?: { mode?: 'create' | 'edit' }
) => {
  const mode = options?.mode ?? 'create';
  const isCreate = mode === 'create';

  const requiredDuration = z.preprocess(
    normalizeNumberInput,
    z.union([z.number(), z.string()]).optional()
  ).refine((val) => val !== undefined && val !== null && val !== '', {
    message: t('projects:validation.durationRequired'),
  }).refine((val) => {
    if (typeof val === 'number') return val >= 1;
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(',', '.'));
      return !isNaN(parsed) && parsed >= 1;
    }
    return false;
  }, {
    message: t('projects:validation.durationRequired'),
  });

  const schema = z.object({
    name: z.string().min(1, t('projects:validation.projectNameRequired')).max(200),
    client_id: z.string().uuid(t('projects:validation.clientRequired') || 'Client selection is required'),
    location: z.string().max(200).nullable().optional().or(z.literal('')),
    construction_address: isCreate
      ? z.string().min(1, t('projects:validation.constructionAddressRequired')).max(300)
      : z.string().max(300).nullable().optional().or(z.literal('')),
    street_number: z.string().max(20).nullable().optional().or(z.literal('')),
    neighborhood: z.string().max(100).nullable().optional().or(z.literal('')),
    zip_code: z.string().max(20).nullable().optional().or(z.literal('')),
    address_complement: z.string().max(300).nullable().optional().or(z.literal('')),
    city: isCreate
      ? z.string().min(1, t('projects:validation.cityRequired')).max(100)
      : z.string().max(100).nullable().optional().or(z.literal('')),
    language: isCreate
      ? z.string().min(1, t('projects:validation.languageRequired')).max(10)
      : z.string().max(10).nullable().optional().or(z.literal('')),
    state: isCreate
      ? z.string().min(1, t('projects:validation.stateRequired')).max(50)
      : z.string().max(50).nullable().optional().or(z.literal('')),
    budget_date: z.string().nullable().optional().or(z.literal('')),
    manager_id: z.string().uuid().nullable().optional().or(z.literal('')),
    type: z.enum(['Project Owned', 'Project Customer']).nullable().optional().or(z.literal('')),
    status: z.string().min(1, t('projects:validation.statusRequired')),
    start_date: z.preprocess((arg) => {
      if (arg instanceof Date) return format(arg, 'yyyy-MM-dd');
      return arg;
    }, z.string().min(1, t('projects:validation.startDateRequired'))),
    total_duration: isCreate ? requiredDuration : flexibleNumberMin1,
    end_date: z.preprocess((arg) => {
      if (arg instanceof Date) return format(arg, 'yyyy-MM-dd');
      return arg;
    }, z.string().nullable().optional().or(z.literal(''))),
    budget_total: flexibleNumber,
    description: z.string().max(1000).nullable().optional().or(z.literal('')),
    image_url: z.string().nullable().optional().or(z.literal('')),
    image_focus_point: z.object({ x: z.number(), y: z.number() }).nullable().optional(),
    construction_unit: z.string().nullable().optional().or(z.literal('')),
    total_gross_floor_area: flexibleNumber,
    covered_area: flexibleNumber,
    other_areas: flexibleNumber,
    gourmet_area: flexibleNumber,
    terrain_type: z.enum(['flat', 'slope', 'upslope']).nullable().optional().or(z.literal('')),
    roof_type: z.enum(['colonial', 'built-in', 'waterproofed']).nullable().optional().or(z.literal('')),
    floor_type: z
      .enum(['ground floor', 'ground + 1 floor', 'ground + 2 floors', 'ground + 3 floors', 'ground + 4 floors'])
      .nullable()
      .optional()
      .or(z.literal('')),
    finishing_type: z.enum(['simple', 'medium', 'high']).nullable().optional().or(z.literal('')),
    paint_type: z.enum(['acrylic', 'grafiato/texture', 'double height ceiling']).nullable().optional().or(z.literal('')),
    double_height_ceiling: z.string().nullable().optional().or(z.literal('')),
    bathrooms: flexibleNumber,
    lavabos: flexibleNumber,
    labor_cost: flexibleNumber,
    material_cost: flexibleNumber,
    taxes_and_fees: flexibleNumber,
    total_spent: flexibleNumber,
    budget_model: z.string().nullable().optional().default('simple'),
    budget_has_materials: z.boolean().optional().default(true),
    create_default_phases: z.boolean().optional().default(true),
  }).superRefine((data, ctx) => {
    if (data.budget_model !== 'cost_control') return;

    const requiredMessage =
      t('projects:validation.totalBudgetRequired') ||
      t('projects:validation.budgetTotalRequiredForCostControl') ||
      'Budget Total is required';

    const rawBudgetTotal = data.budget_total;
    if (rawBudgetTotal === undefined || rawBudgetTotal === null || rawBudgetTotal === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['budget_total'],
        message: requiredMessage,
      });
      return;
    }

    const parsedBudgetTotal =
      typeof rawBudgetTotal === 'number'
        ? rawBudgetTotal
        : Number.parseFloat(String(rawBudgetTotal).replace(',', '.'));

    if (!Number.isFinite(parsedBudgetTotal)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['budget_total'],
        message: requiredMessage,
      });
      return;
    }

    if (parsedBudgetTotal <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['budget_total'],
        message: t('projects:validation.totalBudgetMustBePositive') || requiredMessage,
      });
    }
  });

  return schema;
};
