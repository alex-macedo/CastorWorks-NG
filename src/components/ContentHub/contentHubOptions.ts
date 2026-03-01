import type { ContentStatus, ContentType } from '@/types/contentHub';

export const CONTENT_TYPES: ContentType[] = ['news', 'article', 'document', 'faq'];

export const CONTENT_STATUSES: ContentStatus[] = [
  'draft',
  'pending_approval',
  'published',
  'archived',
];
