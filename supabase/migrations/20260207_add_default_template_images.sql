-- Add default images to existing templates
-- This migration sets default placeholder images for templates that don't have images yet

BEGIN;

-- Update budget templates with default image
UPDATE budget_templates
SET image_url = '/images/templates/budget-template.jpg'
WHERE image_url IS NULL;

-- Update phase templates with default image
UPDATE phase_templates
SET image_url = '/images/templates/phase-template.jpg'
WHERE image_url IS NULL;

-- Update activity templates with default image
UPDATE activity_templates
SET image_url = '/images/templates/activity-template.jpg'
WHERE image_url IS NULL;

-- Update project WBS templates with default image
UPDATE project_wbs_templates
SET image_url = '/images/templates/wbs-template.jpg'
WHERE image_url IS NULL;

COMMIT;
