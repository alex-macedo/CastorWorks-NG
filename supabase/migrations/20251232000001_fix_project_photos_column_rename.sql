-- Fix project_photos column name from display_order to sort_order
-- The migration 20251231225514_rename_display_order_to_sort_order.sql missed this table

ALTER TABLE project_photos RENAME COLUMN display_order TO sort_order;