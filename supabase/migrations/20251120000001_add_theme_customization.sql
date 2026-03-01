-- ============================================================================
-- Theme Customization Module Migration
-- Created: 2025-11-20
-- Description: Add theme_customization JSONB column to company_settings table
-- ============================================================================

-- Add theme_customization column to company_settings table
ALTER TABLE company_settings
  ADD COLUMN IF NOT EXISTS theme_customization JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN company_settings.theme_customization IS 'JSONB object storing theme customization settings including colors, button styles, card styles, and typography. Structure: {colors: {primary, secondary, success, warning, destructive, accent, muted}, buttonStyle: {borderRadius, variant}, cardStyle: {borderRadius, shadow, borderWidth}, typography: {fontFamily, headingWeight}, enabled: boolean}';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_company_settings_theme_customization 
ON company_settings USING GIN (theme_customization);

