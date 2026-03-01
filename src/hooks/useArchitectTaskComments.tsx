// TEMPORARILY DISABLED - Referenced table doesn't exist yet
export const useArchitectTaskComments = () => ({
  comments: [],
  isLoading: false,
  error: null,
  addComment: { mutate: () => {}, mutateAsync: async () => ({}) },
  deleteComment: { mutate: () => {}, mutateAsync: async () => {} },
});
