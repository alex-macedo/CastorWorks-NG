-- Add contact_types configuration to app_settings
-- Enables configurable contact type dropdown in Contact List
-- Managed via Settings > Business Settings

BEGIN;

-- Add contact_types column as JSONB array with default construction-industry types
ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS contact_types JSONB DEFAULT '[
  {"id": "contractor", "label": "Contractor", "color": "#f59e0b"},
  {"id": "subcontractor", "label": "Subcontractor", "color": "#10b981"},
  {"id": "supplier", "label": "Supplier", "color": "#3b82f6"},
  {"id": "architect", "label": "Architect", "color": "#8b5cf6"},
  {"id": "engineer", "label": "Engineer", "color": "#14b8a6"},
  {"id": "client", "label": "Client", "color": "#06b6d4"},
  {"id": "consultant", "label": "Consultant", "color": "#f97316"},
  {"id": "inspector", "label": "Inspector", "color": "#84cc16"},
  {"id": "other", "label": "Other", "color": "#6b7280"}
]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.app_settings.contact_types IS 'Configurable contact type options for the Contact List. Each entry has id (unique key), label (display name), and color (hex code for badges).';

COMMIT;
