const DRAFT_KEY_PREFIX = 'project-draft-';
const DRAFT_EXPIRY_DAYS = 7;

export interface ProjectDraft {
  data: any;
  timestamp: number;
  step: number;
}

export const saveDraft = (data: any, step: number) => {
  const draft: ProjectDraft = {
    data,
    timestamp: Date.now(),
    step,
  };
  
  try {
    localStorage.setItem(`${DRAFT_KEY_PREFIX}current`, JSON.stringify(draft));
  } catch (error) {
    console.warn('Failed to save draft:', error);
  }
};

export const loadDraft = (): ProjectDraft | null => {
  try {
    const draftStr = localStorage.getItem(`${DRAFT_KEY_PREFIX}current`);
    if (!draftStr) return null;
    
    const draft: ProjectDraft = JSON.parse(draftStr);
    const daysSinceCreation = (Date.now() - draft.timestamp) / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreation > DRAFT_EXPIRY_DAYS) {
      clearDraft();
      return null;
    }
    
    return draft;
  } catch (error) {
    console.warn('Failed to load draft:', error);
    return null;
  }
};

export const clearDraft = () => {
  try {
    localStorage.removeItem(`${DRAFT_KEY_PREFIX}current`);
  } catch (error) {
    console.warn('Failed to clear draft:', error);
  }
};

export const hasDraft = (): boolean => {
  return loadDraft() !== null;
};
