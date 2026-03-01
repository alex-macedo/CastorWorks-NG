import { useSprints } from './useSprints';

// Releases are now based on closed sprints
export const useReleases = () => {
  const { data: sprints, isLoading } = useSprints();
  const releases = sprints?.filter(s => s.status === 'closed').map(sprint => ({
    id: sprint.id,
    version: sprint.sprint_identifier,
    title: sprint.title,
    description: sprint.description,
    releaseDate: sprint.closed_at,
    releaseNotes: sprint.release_notes,
  })) || [];
  
  return { releases, isLoading };
};

// These hooks are deprecated - use sprint hooks instead
export const useCreateRelease = () => {
  console.warn('useCreateRelease is deprecated. Use useCreateSprint instead.');
  return { mutateAsync: async () => {}, isPending: false };
};

export const useUpdateRelease = () => {
  console.warn('useUpdateRelease is deprecated. Use sprint hooks instead.');
  return { mutateAsync: async () => {}, isPending: false };
};

export const useDeleteRelease = () => {
  console.warn('useDeleteRelease is deprecated. Use sprint hooks instead.');
  return { mutateAsync: async () => {}, isPending: false };
};

export const useAssignItemToRelease = () => {
  console.warn('useAssignItemToRelease is deprecated. Use useAssignItemToSprint instead.');
  return { mutateAsync: async () => {}, isPending: false };
};

export const useUnassignItemFromRelease = () => {
  console.warn('useUnassignItemFromRelease is deprecated. Use useAssignItemToSprint instead.');
  return { mutateAsync: async () => {}, isPending: false };
};

export const useRoadmapItemRelease = (itemId: string) => {
  console.warn('useRoadmapItemRelease is deprecated. Check sprint_id on roadmap items instead.');
  return { release: null, isLoading: false };
};
