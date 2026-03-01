-- Allow "User Review" status on roadmap items.
-- If roadmap_items.status is still the roadmap_status enum (20260221100000 not applied),
-- this adds the missing value so moving an issue to "User Review" no longer errors.
-- If the column was already converted to TEXT by 20260221100000, this is harmless.

ALTER TYPE roadmap_status ADD VALUE IF NOT EXISTS 'user_review';
