export type FilterState = {
  projects: string[];
  categories: string[];
  type: 'all' | 'income' | 'expense';
  startDate: string;
  endDate: string;
  search: string;
};

export type ColumnFilters = {
  dateFrom: string;
  dateTo: string;
  reference: string;
  description: string;
  project: string;
  category: string;
  type: string;
  paymentMethod: string;
  recipientPayer: string;
  debitMin: number | null;
  debitMax: number | null;
  creditMin: number | null;
  creditMax: number | null;
  balanceMin: number | null;
  balanceMax: number | null;
};
