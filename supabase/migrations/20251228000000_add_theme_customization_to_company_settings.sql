-- Add theme_customization column to company_settings table
-- This column stores DualModeTheme structure with light and dark mode customizations
-- Structure: { light: ThemeCustomization, dark: ThemeCustomization, activeMode: 'light' | 'dark' }

ALTER TABLE public.company_settings
ADD COLUMN theme_customization JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.company_settings.theme_customization IS 
'Stores DualModeTheme structure containing independent light and dark mode customizations. 
Structure: { light: ThemeCustomization, dark: ThemeCustomization, activeMode: "light" | "dark" }';
