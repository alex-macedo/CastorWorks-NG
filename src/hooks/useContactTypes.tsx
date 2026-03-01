import { useMemo, useCallback } from 'react';
import { useAppSettings, ContactTypeConfig } from './useAppSettings';

/**
 * Default contact types used when none are configured in settings
 * These match the database migration defaults
 */
const DEFAULT_CONTACT_TYPES: ContactTypeConfig[] = [
  { id: 'contractor', label: 'Contractor', color: '#f59e0b' },
  { id: 'subcontractor', label: 'Subcontractor', color: '#10b981' },
  { id: 'supplier', label: 'Supplier', color: '#3b82f6' },
  { id: 'architect', label: 'Architect', color: '#8b5cf6' },
  { id: 'engineer', label: 'Engineer', color: '#14b8a6' },
  { id: 'client', label: 'Client', color: '#06b6d4' },
  { id: 'consultant', label: 'Consultant', color: '#f97316' },
  { id: 'inspector', label: 'Inspector', color: '#84cc16' },
  { id: 'other', label: 'Other', color: '#6b7280' },
];

/**
 * Hook to access and manage contact types from app settings
 *
 * @returns {Object} Contact types data and utilities
 * - contactTypes: Array of configured contact type options
 * - isLoading: Whether settings are still loading
 * - getContactTypeById: Function to find a contact type by ID
 * - getContactTypeLabel: Function to get display label for a contact type ID
 * - getContactTypeColor: Function to get color for a contact type ID
 * - updateContactTypes: Function to update the contact types configuration
 */
export const useContactTypes = () => {
  const { settings, isLoading, updateSettings } = useAppSettings();

  const contactTypes = useMemo(() => {
    // Use configured types from settings, or fall back to defaults
    if (settings?.contact_types && Array.isArray(settings.contact_types) && settings.contact_types.length > 0) {
      return settings.contact_types;
    }
    return DEFAULT_CONTACT_TYPES;
  }, [settings?.contact_types]);

  /**
   * Find a contact type configuration by ID
   */
  const getContactTypeById = useMemo(() => {
    return (id: string | null | undefined): ContactTypeConfig | undefined => {
      if (!id) return undefined;
      return contactTypes.find((type) => type.id === id);
    };
  }, [contactTypes]);

  /**
   * Get the display label for a contact type ID
   * Returns the ID itself if not found (graceful fallback)
   */
  const getContactTypeLabel = useMemo(() => {
    return (id: string | null | undefined): string => {
      if (!id) return '';
      const type = contactTypes.find((t) => t.id === id);
      return type?.label || id;
    };
  }, [contactTypes]);

  /**
   * Get the color for a contact type ID
   * Returns a neutral gray if not found
   */
  const getContactTypeColor = useMemo(() => {
    return (id: string | null | undefined): string => {
      if (!id) return '#6b7280';
      const type = contactTypes.find((t) => t.id === id);
      return type?.color || '#6b7280';
    };
  }, [contactTypes]);

  /**
   * Update the contact types configuration
   */
  const updateContactTypes = useCallback((newTypes: ContactTypeConfig[]) => {
    updateSettings.mutate({ contact_types: newTypes });
  }, [updateSettings]);

  return useMemo(() => ({
    contactTypes,
    isLoading,
    getContactTypeById,
    getContactTypeLabel,
    getContactTypeColor,
    updateContactTypes,
    isUpdating: updateSettings.isPending,
  }), [contactTypes, isLoading, getContactTypeById, getContactTypeLabel, getContactTypeColor, updateContactTypes, updateSettings.isPending]);
};

export { DEFAULT_CONTACT_TYPES };
export type { ContactTypeConfig };
