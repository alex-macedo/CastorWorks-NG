export interface PhaseTemplate {
  id: string;
  template_name: string;
  description: string | null;
  is_default: boolean;
  is_system: boolean;
  phases: Array<{
    sequence: number;
    phaseName: string;
    defaultDurationDays: number;
    defaultBudgetPercentage: number;
  }>;
  created_at: string;
  updated_at: string;
  image_url?: string | null;
  created_by?: string | null;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}
