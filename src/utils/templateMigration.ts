/**
 * Utility functions for migrating legacy activity templates to offset-based format
 */

interface LegacyActivity {
  sequence: number;
  name: string;
  defaultDays: number;
}

interface OffsetActivity {
  sequence: number;
  description: string;
  startOffset: number;
  endOffset: number;
  duration: number;
  isMilestone?: boolean;
}

/**
 * Convert legacy defaultDays-based template to offset-based format
 * 
 * Activities are scheduled sequentially, with each activity starting
 * immediately after the previous one ends (using workdays).
 * 
 * Example:
 * - Activity 1: defaultDays=12 → startOffset=0, endOffset=11, duration=12
 * - Activity 2: defaultDays=10 → startOffset=12, endOffset=21, duration=10
 * - Activity 3: defaultDays=5  → startOffset=22, endOffset=26, duration=5
 * 
 * @param activities - Legacy activities with defaultDays
 * @returns Offset-based activities with startOffset/endOffset/duration
 */
export function convertLegacyTemplateToOffset(
  activities: LegacyActivity[]
): OffsetActivity[] {
  const sortedActivities = [...activities].sort((a, b) => a.sequence - b.sequence);
  
  let currentOffset = 0;
  
  return sortedActivities.map((activity) => {
    const startOffset = currentOffset;
    const duration = activity.defaultDays;
    const endOffset = startOffset + duration - 1;
    
    // Next activity starts after this one ends
    currentOffset = endOffset + 1;
    
    return {
      sequence: activity.sequence,
      description: activity.name,
      startOffset,
      endOffset,
      duration,
      isMilestone: duration === 1, // Single-day activities are milestones
    };
  });
}

/**
 * Batch convert multiple legacy templates
 * 
 * @param templates - Array of templates with activities array
 * @returns Templates with converted activities
 */
export function convertLegacyTemplates<T extends { activities: LegacyActivity[] }>(
  templates: T[]
): Array<Omit<T, 'activities'> & { activities: OffsetActivity[] }> {
  return templates.map(template => ({
    ...template,
    activities: convertLegacyTemplateToOffset(template.activities),
  }));
}

/**
 * Example usage:
 * 
 * ```typescript
 * const legacyTemplate = {
 *   template_name: "Construction Schedule",
 *   activities: [
 *     { sequence: 1, name: "Foundation", defaultDays: 12 },
 *     { sequence: 2, name: "Framing", defaultDays: 20 },
 *     { sequence: 3, name: "Inspection", defaultDays: 1 },
 *   ]
 * };
 * 
 * const offsetTemplate = {
 *   ...legacyTemplate,
 *   activities: convertLegacyTemplateToOffset(legacyTemplate.activities)
 * };
 * 
 * // Result:
 * // activities: [
 * //   { sequence: 1, description: "Foundation", startOffset: 0, endOffset: 11, duration: 12 },
 * //   { sequence: 2, description: "Framing", startOffset: 12, endOffset: 31, duration: 20 },
 * //   { sequence: 3, description: "Inspection", startOffset: 32, endOffset: 32, duration: 1, isMilestone: true },
 * // ]
 * ```
 */
