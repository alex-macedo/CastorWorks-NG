/**
 * Mock Data Registry
 *
 * Tracks and documents all mock data exports used throughout the application.
 * Provides metadata about what each mock data set represents, where it's used,
 * and its relationship to seeded data.
 *
 * This registry helps maintain consistency between seeded data and mock fallbacks,
 * and ensures mock data is kept up-to-date when schema changes occur.
 */

export interface MockDataMetadata {
  /** Unique identifier for the mock data */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what this mock data represents */
  description: string;

  /** Table(s) this mock data represents */
  tables: string[];

  /** Which seeded data does this mock? */
  mocks?: string;

  /** When was this last updated? */
  lastUpdated: string;

  /** Is this mock data actively used? */
  isActive: boolean;

  /** Where is this used? (files/components) */
  usedIn: string[];

  /** Does this mock data depend on other mocks? */
  dependencies?: string[];

  /** Known issues or limitations */
  issues?: string[];

  /** Notes for developers */
  notes?: string;
}

/**
 * Registry of all mock data exports in the application
 *
 * Each entry documents:
 * - What table(s) the mock represents
 * - Where and how it's used
 * - Relationship to seeded data
 * - Last update date
 * - Known issues
 */
export const MOCK_DATA_REGISTRY: Record<string, MockDataMetadata> = {
  // =========================================================================
  // Organization Mocks
  // =========================================================================

  architectMockClients: {
    id: 'architectMockClients',
    name: 'Architect Mock Clients',
    description: 'Mock client data for architect pages (DEPRECATED - no longer used as fallback)',
    tables: ['clients'],
    lastUpdated: '2024-01-15',
    isActive: false,
    usedIn: [],
    dependencies: [],
    notes: 'DEPRECATED: Mock data fallbacks have been removed from the codebase.',
  },

  // =========================================================================
  // Project Mocks
  // =========================================================================

  architectMockProjects: {
    id: 'architectMockProjects',
    name: 'Architect Mock Projects',
    description: 'Mock project data for architect pages and project views (DEPRECATED - no longer used as fallback)',
    tables: ['projects'],
    lastUpdated: '2024-01-15',
    isActive: false,
    usedIn: [
      'src/hooks/useProjects.tsx',
      'src/components/Architect/ProjectSelector.tsx',
    ],
    dependencies: ['architectMockClients'],
    notes: 'DEPRECATED: Mock data fallbacks have been removed from the codebase.',
  },

  // =========================================================================
  // Architect Workflow Mocks
  // =========================================================================

  architectMockBriefings: {
    id: 'architectMockBriefings',
    name: 'Architect Mock Briefings',
    description: 'Mock project briefing data for architect pages (DEPRECATED - now uses database)',
    tables: ['architect_briefings'],
    mocks: 'ARCHITECT_TASK_TEMPLATES',
    lastUpdated: '2024-01-15',
    isActive: false, // Now uses database queries
    usedIn: ['src/hooks/useArchitectBriefings.tsx'], // Hook now uses database
    dependencies: ['architectMockProjects'],
    notes:
      'DEPRECATED: Briefings now stored in architect_briefings table. Previously used mock data but now uses real database queries.',
  },

  architectMockTasks: {
    id: 'architectMockTasks',
    name: 'Architect Mock Tasks',
    description: 'Mock task data for architect workflow and kanban board (DEPRECATED - no longer used as fallback)',
    tables: ['architect_tasks'],
    mocks: 'ARCHITECT_TASK_TEMPLATES',
    lastUpdated: '2024-01-15',
    isActive: false,
    usedIn: [
      'src/hooks/useArchitectTasks.tsx',
      'src/components/Architect/TasksKanban.tsx',
      'src/components/Architect/TasksFormsView.tsx',
    ],
    dependencies: ['architectMockBriefings'],
    notes: 'DEPRECATED: Mock data fallbacks have been removed from the codebase.',
  },

  architectMockTaskComments: {
    id: 'architectMockTaskComments',
    name: 'Architect Mock Task Comments',
    description: 'Mock comments on architect tasks (DEPRECATED - no longer used as fallback)',
    tables: ['architect_task_comments'],
    mocks: 'ARCHITECT_COMMENT_TEMPLATES',
    lastUpdated: '2024-01-15',
    isActive: false,
    usedIn: ['src/components/Architect/TaskDetail.tsx'],
    dependencies: ['architectMockTasks'],
    notes: 'DEPRECATED: Mock data fallbacks have been removed from the codebase.',
  },

  architectMockMeetings: {
    id: 'architectMockMeetings',
    name: 'Architect Mock Meetings',
    description: 'Mock meeting data for architect workflow (DEPRECATED - now uses database)',
    tables: ['architect_meetings'],
    mocks: 'MEETING_TYPES',
    lastUpdated: '2024-01-15',
    isActive: false, // Now uses database data instead of mock data
    usedIn: ['src/hooks/useArchitectMeetings.tsx'], // Hook now uses database queries
    dependencies: ['architectMockProjects', 'architectMockBriefings'],
    notes:
      'DEPRECATED: Meetings now stored in architect_meetings table. Previously used mock data but now uses real database queries.',
  },

  // =========================================================================
  // Sales Pipeline Mocks
  // =========================================================================

  architectMockOpportunities: {
    id: 'architectMockOpportunities',
    name: 'Architect Mock Opportunities',
    description: 'Mock sales pipeline opportunities for architect business (DEPRECATED - no longer used as fallback)',
    tables: ['architect_opportunities', 'opportunities'],
    mocks: 'OPPORTUNITY_STAGES',
    lastUpdated: '2024-01-15',
    isActive: false,
    usedIn: [
      'src/hooks/useArchitectOpportunities.tsx',
      'src/components/Architect/SalesPipeline.tsx',
    ],
    dependencies: [],
    issues: [
      'Two tables: architect_opportunities and opportunities. Ensure both are kept in sync.',
    ],
    notes: 'DEPRECATED: Mock data fallbacks have been removed from the codebase.',
  },

  // =========================================================================
  // Status & Configuration Mocks
  // =========================================================================

  architectMockStatuses: {
    id: 'architectMockStatuses',
    name: 'Architect Mock Statuses',
    description: 'Mock status options for architect tasks and projects (DEPRECATED - no longer used as fallback)',
    tables: ['architect_pipeline_statuses'],
    lastUpdated: '2024-01-15',
    isActive: false,
    usedIn: ['src/hooks/useArchitectStatuses.tsx'],
    dependencies: [],
    notes: 'DEPRECATED: Mock data fallbacks have been removed from the codebase.',
  },

  // =========================================================================
  // Moodboard & Design Mocks
  // =========================================================================

  architectMockMoodboard: {
    id: 'architectMockMoodboard',
    name: 'Architect Mock Moodboard',
    description: 'Mock moodboard sections, images, and colors for design reference (DEPRECATED - now uses database)',
    tables: ['architect_moodboard_sections', 'architect_moodboard_images', 'architect_moodboard_colors'],
    lastUpdated: '2024-01-15',
    isActive: false, // Now uses database queries
    usedIn: [
      'src/hooks/useArchitectMoodboard.tsx', // Hook now uses database
      'src/components/Architect/MoodboardView.tsx',
    ],
    dependencies: ['architectMockProjects'],
    notes: 'DEPRECATED: Moodboard data now stored in architect_moodboard_* tables. Previously used mock data but now uses real database queries.',
  },

  architectMockMoodboardSections: {
    id: 'architectMockMoodboardSections',
    name: 'Architect Mock Moodboard Sections',
    description: 'Mock moodboard section categories (DEPRECATED - now uses database)',
    tables: ['architect_moodboard_sections'],
    lastUpdated: '2024-01-15',
    isActive: false, // Now uses database queries
    usedIn: [
      'src/hooks/useArchitectMoodboard.tsx', // Hook now uses database
      'src/components/Architect/MoodboardView.tsx',
    ],
    dependencies: [],
    notes: 'DEPRECATED: Sections now stored in architect_moodboard_sections table. Previously used mock data but now uses real database queries.',
  },

  architectMockMoodboardImages: {
    id: 'architectMockMoodboardImages',
    name: 'Architect Mock Moodboard Images',
    description: 'Mock images for moodboard (DEPRECATED - now uses database)',
    tables: ['architect_moodboard_images'],
    lastUpdated: '2024-01-15',
    isActive: false, // Now uses database queries
    usedIn: ['src/components/Architect/MoodboardView.tsx'], // Components now use database hooks
    dependencies: ['architectMockMoodboardSections'],
    notes: 'DEPRECATED: Images now stored in architect_moodboard_images table. Previously used mock data but now uses real database queries.',
  },

  architectMockMoodboardColors: {
    id: 'architectMockMoodboardColors',
    name: 'Architect Mock Moodboard Colors',
    description: 'Mock color palette for moodboard (DEPRECATED - now uses database)',
    tables: ['architect_moodboard_colors'],
    lastUpdated: '2024-01-15',
    isActive: false, // Now uses database queries
    usedIn: ['src/components/Architect/MoodboardView.tsx'], // Components now use database hooks
    dependencies: [],
    notes:
      'DEPRECATED: Colors now stored in architect_moodboard_colors table. Previously used mock data but now uses real database queries.',
  },

  // =========================================================================
  // Documentation & Diary Mocks

architectMockSiteDiary: {
  id: 'architectMockSiteDiary',
  name: 'Architect Mock Site Diary',
  description: 'Mock site diary entries with photos and notes (DEPRECATED - no longer used as fallback)',
  tables: ['architect_site_diary'],
  lastUpdated: '2024-01-15',
  isActive: false,
  usedIn: [],
  dependencies: [],
  notes: 'DEPRECATED: Mock data fallbacks have been removed from the codebase.',
},

architectMockDocuments: {
  id: 'architectMockDocuments',
  name: 'Architect Mock Documents',
  description: 'Mock project documents (drawings, specs, permits) (DEPRECATED - no longer used as fallback)',
  tables: ['project_documents'],
  lastUpdated: '2024-01-15',
  isActive: false,
  usedIn: [],
  dependencies: [],
  issues: ['Document types should match DOCUMENT_TYPE_TEMPLATES'],
  notes: 'DEPRECATED: Mock data fallbacks have been removed from the codebase.',
},

// =========================================================================
// Portal Mocks
// =========================================================================

architectMockPortalToken: {
  id: 'architectMockPortalToken',
  name: 'Architect Mock Portal Token',
  description: 'Mock authentication token for client portal access (DEPRECATED - now uses database)',
  tables: ['architect_client_portal_tokens'],
  lastUpdated: '2024-01-15',
  isActive: false,
  usedIn: [],
  dependencies: [],
  notes: 'DEPRECATED: Mock data fallbacks have been removed from the codebase.',
},

// =========================================================================
// Form & Template Mocks
// =========================================================================

architectMockTaskForms: {
  id: 'architectMockTaskForms',
  name: 'Architect Mock Task Forms',
  description: 'Mock form templates for architect task creation (DEPRECATED - no longer used as fallback)',
  tables: ['architect_task_forms'],
  lastUpdated: '2024-01-15',
  isActive: false,
  usedIn: [],
  dependencies: [],
  notes: 'DEPRECATED: Mock data fallbacks have been removed from the codebase.',
},

// =========================================================================
// Financial Mocks
// =========================================================================

architectMockBriefingDetails: {
  id: 'architectMockBriefingDetails',
  name: 'Architect Mock Briefing Details',
  description: 'Mock detailed briefing information (DEPRECATED - no longer used as fallback)',
  tables: [],
  lastUpdated: '2024-01-15',
  isActive: false,
  usedIn: [],
  dependencies: [],
  notes: 'DEPRECATED: Mock data fallbacks have been removed from the codebase.',
},

// =========================================================================
// Diary Entry Mocks
// =========================================================================
  // =========================================================================

   architectMockDiaryEntries: {
     id: 'architectMockDiaryEntries',
     name: 'Architect Mock Diary Entries',
     description: 'Mock site diary entries (DEPRECATED - now uses database)',
     tables: ['architect_site_diary'],
     lastUpdated: '2024-01-15',
     isActive: false, // Now uses database queries
     usedIn: ['src/components/Architect/SiteDiary.tsx'], // Components now use database hooks
     dependencies: ['architectMockProjects'],
     notes: 'DEPRECATED: Diary entries now stored in architect_site_diary table. Previously used mock data but now uses real database queries.',
   },
};

/**
 * Generate a usage report for mock data
 *
 * Lists all mock data and where it's used
 */
export function generateMockDataReport(): string {
  let report = '# Mock Data Usage Report\n\n';
  let activeCount = 0;
  let inactiveCount = 0;

  report += '## Summary\n\n';

  Object.values(MOCK_DATA_REGISTRY).forEach((entry) => {
    if (entry.isActive) {
      activeCount++;
    } else {
      inactiveCount++;
    }
  });

  report += `- **Active Mock Data**: ${activeCount}\n`;
  report += `- **Inactive Mock Data**: ${inactiveCount}\n`;
  report += `- **Total**: ${activeCount + inactiveCount}\n\n`;

  report += '## Active Mock Data\n\n';

  Object.values(MOCK_DATA_REGISTRY)
    .filter((entry) => entry.isActive)
    .forEach((entry) => {
      report += `### ${entry.name}\n`;
      report += `- **ID**: \`${entry.id}\`\n`;
      report += `- **Description**: ${entry.description}\n`;
      report += `- **Tables**: ${entry.tables.join(', ') || 'N/A'}\n`;
      if (entry.mocks) {
        report += `- **Mocks**: ${entry.mocks}\n`;
      }
      report += `- **Last Updated**: ${entry.lastUpdated}\n`;
      if (entry.usedIn.length > 0) {
        report += `- **Used In**:\n`;
        entry.usedIn.forEach((file) => {
          report += `  - ${file}\n`;
        });
      }
      if (entry.dependencies && entry.dependencies.length > 0) {
        report += `- **Dependencies**: ${entry.dependencies.join(', ')}\n`;
      }
      if (entry.issues && entry.issues.length > 0) {
        report += `- **Issues**: \n`;
        entry.issues.forEach((issue) => {
          report += `  - ⚠️ ${issue}\n`;
        });
      }
      report += '\n';
    });

  return report;
}

/**
 * Validate mock data consistency
 *
 * Checks for:
 * - Circular dependencies
 * - Missing dependencies
 * - Unused mock data
 *
 * @returns Array of validation errors (empty if valid)
 */
export function validateMockDataConsistency(): string[] {
  const errors: string[] = [];
  const registryIds = new Set(Object.keys(MOCK_DATA_REGISTRY));

  // Check for circular dependencies
  Object.values(MOCK_DATA_REGISTRY).forEach((entry) => {
    if (entry.dependencies) {
      entry.dependencies.forEach((dep) => {
        if (
          entry.dependencies?.includes(dep) &&
          MOCK_DATA_REGISTRY[dep]?.dependencies?.includes(entry.id)
        ) {
          errors.push(
            `Circular dependency: ${entry.id} <-> ${dep}`
          );
        }
      });
    }
  });

  // Check for missing dependencies
  Object.values(MOCK_DATA_REGISTRY).forEach((entry) => {
    if (entry.dependencies) {
      entry.dependencies.forEach((dep) => {
        if (!registryIds.has(dep)) {
          errors.push(
            `Missing dependency: ${entry.id} depends on ${dep} which doesn't exist`
          );
        }
      });
    }
  });

  return errors;
}
