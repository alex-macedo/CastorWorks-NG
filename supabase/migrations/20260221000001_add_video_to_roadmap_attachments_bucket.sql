-- Add video MIME types to the roadmap-attachments bucket so screen recordings can be uploaded.
-- Applied live via scripts/fix-bucket-mime-types.cjs on 2026-02-21.
-- This migration keeps the schema in sync for future db resets.

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  -- Documents & images (existing)
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  -- Video (added for bug screen recordings)
  'video/webm',
  'video/mp4',
  'video/ogg',
  'video/quicktime'
]::text[]
WHERE id = 'roadmap-attachments';
