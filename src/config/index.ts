/**
 * Configuration Module Exports
 *
 * Central export point for all configuration, templates, and defaults
 * used throughout the demo data seeding system.
 */

// Export all templates
export * from './seedDataTemplates';

// Export all defaults
export * from './seedDataDefaults';

// Export user assignment helper
export { getSystemUsersForAssignment } from './userAssignmentHelper';

// Export mock data registry and utilities
export * from './mockDataRegistry';
