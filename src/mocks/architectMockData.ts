/**
 * Architect Mock Data - DEPRECATED
 * 
 * This file previously contained mock data for development and demo purposes.
 * All mock data fallbacks have been removed from the codebase as per the new policy.
 * 
 * The mock data exports are kept here only for potential future seeding tools,
 * but they are no longer imported or used in the application runtime.
 * 
 * If you need demo data for development:
 * 1. Use the database seeding tools in src/components/Settings/DemoData/
 * 2. Set up real data in the Supabase database
 * 3. Create proper empty states in your components
 * 
 * @deprecated This file is kept for historical reference only.
 *            Mock data fallbacks have been removed from the application.
 */

// Empty exports to maintain compatibility with any existing imports
// These should be removed once all references are cleaned up
export const architectMockClients = [] as const;
export const architectMockProjects = [] as const;
export const architectMockTasks = [] as const;
export const architectMockTaskComments = [] as const;
export const architectMockMeetings = [] as const;
export const architectMockOpportunities = [] as const;
export const architectMockStatuses = [] as const;
export const architectMockTaskForms = [] as const;
export const architectMockTaskStatuses = [] as const;
export const architectMockDocuments = [] as const;
export const architectMockDiaryEntries = [] as const;
export const architectMockMoodboardSections = [] as const;
export const architectMockMoodboardImages = [] as const;
export const architectMockMoodboardColors = [] as const;
export const architectMockBriefings = [] as const;
export const architectMockSiteDiary = [] as const;
export const architectMockPortalToken = '';

// Types for reference (kept for potential future seeding tools)
export type ArchitectClient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  created_at: string;
  updated_at: string;
};

export type ArchitectProject = {
  id: string;
  name: string;
  client_id: string;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
};

export type ArchitectTask = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ArchitectOpportunity = {
  id: string;
  client_id: string;
  project_id?: string;
  title: string;
  estimated_value: number;
  stage_id: string;
  created_at: string;
  updated_at: string;
};

export type PipelineStatus = {
  id: string;
  name: string;
  color: string;
  position: number;
  is_default: boolean;
  is_terminal: boolean;
  created_at: string;
  updated_at: string;
};
