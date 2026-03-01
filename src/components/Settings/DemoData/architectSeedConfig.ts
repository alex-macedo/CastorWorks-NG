/**
 * Architect Seed Configuration
 * 
 * Maps mock data structures to database schema and defines relationships
 * for architect module demo data seeding.
 */

import { architectMockMoodboardSections } from '@/mocks/architectMockData';

/**
 * Architect tables that should be seeded
 */
export const ARCHITECT_TABLES = [
  'architect_opportunities',
  'architect_briefings',
  'architect_meetings',
  'architect_tasks',
  'architect_task_comments',
  'architect_site_diary',
  'architect_moodboard_sections',
  'architect_moodboard_images',
  'architect_moodboard_colors',
] as const;

/**
 * Architect tables with their display labels
 */
export const ARCHITECT_TABLE_LABELS: Record<string, string> = {
  architect_opportunities: 'Opportunities',
  architect_briefings: 'Briefings',
  architect_meetings: 'Meetings',
  architect_tasks: 'Tasks',
  architect_task_comments: 'Task Comments',
  architect_site_diary: 'Site Diary',
  architect_moodboard_sections: 'Moodboard Sections',
  architect_moodboard_images: 'Moodboard Images',
  architect_moodboard_colors: 'Moodboard Colors',
};

/**
 * Dependency order for architect seeding
 * Tables must be seeded in this order to respect foreign key constraints
 */
export const ARCHITECT_SEED_ORDER = [
  'architect_opportunities',      // Depends on: clients, architect_pipeline_statuses
  'architect_briefings',          // Depends on: projects
  'architect_meetings',           // Depends on: projects, clients
  'architect_tasks',              // Depends on: projects, project_phases (optional)
  'architect_task_comments',      // Depends on: architect_tasks, user_profiles
  'architect_site_diary',         // Depends on: projects
  'architect_moodboard_sections', // Depends on: projects
  'architect_moodboard_images',   // Depends on: architect_moodboard_sections, projects
  'architect_moodboard_colors',   // Depends on: projects
] as const;

/**
 * Helper to map mock project IDs to actual database project IDs
 */
export function mapMockProjectToDbProject(
  mockProjectId: string,
  projects: Array<{ id: string; name: string }>
): string | null {
  // Map based on project name patterns
  const nameMap: Record<string, string[]> = {
    'project-01': ['Hotel', 'Boutique', 'Renovação'],
    'project-02': ['Torre', 'Corporativa', 'Sustentável'],
    'project-03': ['Residência', 'Litorânea', 'Costa'],
  };

  const patterns = nameMap[mockProjectId] || [];
  const project = projects.find(p => 
    patterns.some(pattern => p.name?.includes(pattern))
  );

  return project?.id || projects[0]?.id || null;
}

/**
 * Helper to map mock client IDs to actual database client IDs
 */
export function mapMockClientToDbClient(
  mockClientId: string,
  clients: Array<{ id: string; name: string; email?: string }>
): string | null {
  const clientMap: Record<string, string[]> = {
    '550e8400-e29b-41d4-a716-446655440001': ['Aurora', 'Hospitality'],
    '550e8400-e29b-41d4-a716-446655440002': ['Greenfield', 'Developments'],
    '550e8400-e29b-41d4-a716-446655440003': ['Costa', 'Isabella'],
  };

  const patterns = clientMap[mockClientId] || [];
  const client = clients.find(c =>
    patterns.some(pattern =>
      c.name?.includes(pattern) || c.email?.includes(pattern)
    )
  );

  return client?.id || clients[0]?.id || null;
}

/**
 * Helper to map mock section IDs to actual database section IDs
 */
export function mapMockSectionToDbSection(
  mockSectionId: string,
  sections: Array<{ id: string; name: string }>
): string | null {
  // Try to match by name
  const mockSection = architectMockMoodboardSections.find(ms => ms.id === mockSectionId);
  if (!mockSection) return sections[0]?.id || null;

  const section = sections.find(s => s.name === mockSection.name);
  return section?.id || sections[0]?.id || null;
}
