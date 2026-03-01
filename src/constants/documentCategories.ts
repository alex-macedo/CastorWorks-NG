/**
 * Document Categories for Project Document Management
 *
 * These categories help organize documents in construction and engineering projects.
 */

export const DOCUMENT_CATEGORIES = {
  CONTRACTS: 'contracts',
  PERMITS: 'permits',
  DRAWINGS: 'drawings',
  SPECIFICATIONS: 'specifications',
  INVOICES: 'invoices',
  CORRESPONDENCE: 'correspondence',
} as const;

export type DocumentCategory = typeof DOCUMENT_CATEGORIES[keyof typeof DOCUMENT_CATEGORIES];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  [DOCUMENT_CATEGORIES.CONTRACTS]: 'documents.categories.contracts',
  [DOCUMENT_CATEGORIES.PERMITS]: 'documents.categories.permits',
  [DOCUMENT_CATEGORIES.DRAWINGS]: 'documents.categories.drawings',
  [DOCUMENT_CATEGORIES.SPECIFICATIONS]: 'documents.categories.specifications',
  [DOCUMENT_CATEGORIES.INVOICES]: 'documents.categories.invoices',
  [DOCUMENT_CATEGORIES.CORRESPONDENCE]: 'documents.categories.correspondence',
};

export const DOCUMENT_CATEGORY_COLORS: Record<DocumentCategory, string> = {
  [DOCUMENT_CATEGORIES.CONTRACTS]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [DOCUMENT_CATEGORIES.PERMITS]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [DOCUMENT_CATEGORIES.DRAWINGS]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [DOCUMENT_CATEGORIES.SPECIFICATIONS]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [DOCUMENT_CATEGORIES.INVOICES]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [DOCUMENT_CATEGORIES.CORRESPONDENCE]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};

export const getAllCategories = (): DocumentCategory[] => {
  return Object.values(DOCUMENT_CATEGORIES);
};
