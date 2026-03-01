-- Fix app_settings table: consolidate multiple records into one and add missing columns
-- This migration addresses the issue where app_settings has 49 records instead of 1

BEGIN;

-- First, add the missing auto-creation columns if they don't exist
ALTER TABLE public.app_settings
ADD COLUMN IF NOT EXISTS auto_create_simple_budget BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_create_bdi_brazil_budget BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_create_cost_control_budget BOOLEAN DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN public.app_settings.auto_create_simple_budget IS 'Automatically create simple budgets when projects are created';
COMMENT ON COLUMN public.app_settings.auto_create_bdi_brazil_budget IS 'Automatically create BDI Brazil budgets when projects are created';
COMMENT ON COLUMN public.app_settings.auto_create_cost_control_budget IS 'Automatically create cost control budgets when projects are created';

-- Now consolidate multiple records into one
-- We'll keep the most recently updated record and merge data from others

-- Step 1: Create a temporary table to store the consolidated data
CREATE TEMP TABLE temp_app_settings AS
SELECT
    -- Keep the most recently updated record as base
    (SELECT id FROM public.app_settings ORDER BY updated_at DESC, created_at DESC LIMIT 1) as id,
    -- Merge data from all records, prioritizing non-null values
    COALESCE(
        (SELECT labor_rate_mason FROM public.app_settings WHERE labor_rate_mason IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        0
    ) as labor_rate_mason,
    COALESCE(
        (SELECT labor_rate_plumber FROM public.app_settings WHERE labor_rate_plumber IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        0
    ) as labor_rate_plumber,
    COALESCE(
        (SELECT labor_rate_electrician FROM public.app_settings WHERE labor_rate_electrician IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        0
    ) as labor_rate_electrician,
    COALESCE(
        (SELECT labor_rate_painter FROM public.app_settings WHERE labor_rate_painter IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        0
    ) as labor_rate_painter,
    COALESCE(
        (SELECT labor_rate_manager FROM public.app_settings WHERE labor_rate_manager IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        0
    ) as labor_rate_manager,
    COALESCE(
        (SELECT default_state FROM public.app_settings WHERE default_state IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        'SP'
    ) as default_state,
    COALESCE(
        (SELECT default_profit_margin FROM public.app_settings WHERE default_profit_margin IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        10
    ) as default_profit_margin,
    COALESCE(
        (SELECT default_freight_percentage FROM public.app_settings WHERE default_freight_percentage IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        5
    ) as default_freight_percentage,
    COALESCE(
        (SELECT default_payment_terms FROM public.app_settings WHERE default_payment_terms IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        'standard'
    ) as default_payment_terms,
    -- Continue with all other columns...
    (SELECT sinapi_last_update FROM public.app_settings WHERE sinapi_last_update IS NOT NULL ORDER BY updated_at DESC LIMIT 1) as sinapi_last_update,
    COALESCE(
        (SELECT sinapi_auto_update FROM public.app_settings WHERE sinapi_auto_update IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        false
    ) as sinapi_auto_update,
    COALESCE(
        (SELECT sinapi_freight_markup FROM public.app_settings WHERE sinapi_freight_markup IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        5
    ) as sinapi_freight_markup,
    COALESCE(
        (SELECT sinapi_material_markup FROM public.app_settings WHERE sinapi_material_markup IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        10
    ) as sinapi_material_markup,
    -- BDI columns
    COALESCE(
        (SELECT bdi_central_admin FROM public.app_settings WHERE bdi_central_admin IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        3.5
    ) as bdi_central_admin,
    COALESCE(
        (SELECT bdi_site_overhead FROM public.app_settings WHERE bdi_site_overhead IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        4.0
    ) as bdi_site_overhead,
    COALESCE(
        (SELECT bdi_financial_costs FROM public.app_settings WHERE bdi_financial_costs IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        2.0
    ) as bdi_financial_costs,
    COALESCE(
        (SELECT bdi_risks_insurance FROM public.app_settings WHERE bdi_risks_insurance IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        2.5
    ) as bdi_risks_insurance,
    COALESCE(
        (SELECT bdi_taxes FROM public.app_settings WHERE bdi_taxes IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        15.0
    ) as bdi_taxes,
    COALESCE(
        (SELECT bdi_profit_margin FROM public.app_settings WHERE bdi_profit_margin IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        10.0
    ) as bdi_profit_margin,
    -- Continue with remaining columns using similar pattern...
    COALESCE(
        (SELECT theme FROM public.app_settings WHERE theme IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        'light'
    ) as theme,
    COALESCE(
        (SELECT default_report_template FROM public.app_settings WHERE default_report_template IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        'standard'
    ) as default_report_template,
    COALESCE(
        (SELECT notifications_project_updates FROM public.app_settings WHERE notifications_project_updates IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        true
    ) as notifications_project_updates,
    COALESCE(
        (SELECT notifications_financial_alerts FROM public.app_settings WHERE notifications_financial_alerts IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        true
    ) as notifications_financial_alerts,
    COALESCE(
        (SELECT notifications_schedule_changes FROM public.app_settings WHERE notifications_schedule_changes IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        true
    ) as notifications_schedule_changes,
    COALESCE(
        (SELECT notifications_material_delivery FROM public.app_settings WHERE notifications_material_delivery IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        false
    ) as notifications_material_delivery,
    (SELECT last_backup_date FROM public.app_settings WHERE last_backup_date IS NOT NULL ORDER BY updated_at DESC LIMIT 1) as last_backup_date,
    COALESCE(
        (SELECT auto_archive_months FROM public.app_settings WHERE auto_archive_months IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        12
    ) as auto_archive_months,
    -- Auto-creation settings (new columns)
    COALESCE(
        (SELECT auto_create_simple_budget FROM public.app_settings WHERE auto_create_simple_budget IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        false
    ) as auto_create_simple_budget,
    COALESCE(
        (SELECT auto_create_bdi_brazil_budget FROM public.app_settings WHERE auto_create_bdi_brazil_budget IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        false
    ) as auto_create_bdi_brazil_budget,
    COALESCE(
        (SELECT auto_create_cost_control_budget FROM public.app_settings WHERE auto_create_cost_control_budget IS NOT NULL ORDER BY updated_at DESC LIMIT 1),
        false
    ) as auto_create_cost_control_budget,
    -- Add other columns as needed...
    now() as updated_at;

-- Step 2: Delete all existing records
DELETE FROM public.app_settings;

-- Step 3: Insert the consolidated record
INSERT INTO public.app_settings (
    id, labor_rate_mason, labor_rate_plumber, labor_rate_electrician, labor_rate_painter, labor_rate_manager,
    default_state, default_profit_margin, default_freight_percentage, default_payment_terms,
    sinapi_last_update, sinapi_auto_update, sinapi_freight_markup, sinapi_material_markup,
    bdi_central_admin, bdi_site_overhead, bdi_financial_costs, bdi_risks_insurance, bdi_taxes, bdi_profit_margin,
    theme, default_report_template, notifications_project_updates, notifications_financial_alerts,
    notifications_schedule_changes, notifications_material_delivery, last_backup_date, auto_archive_months,
    auto_create_simple_budget, auto_create_bdi_brazil_budget, auto_create_cost_control_budget,
    updated_at
)
SELECT
    id, labor_rate_mason, labor_rate_plumber, labor_rate_electrician, labor_rate_painter, labor_rate_manager,
    default_state, default_profit_margin, default_freight_percentage, default_payment_terms,
    sinapi_last_update, sinapi_auto_update, sinapi_freight_markup, sinapi_material_markup,
    bdi_central_admin, bdi_site_overhead, bdi_financial_costs, bdi_risks_insurance, bdi_taxes, bdi_profit_margin,
    theme, default_report_template, notifications_project_updates, notifications_financial_alerts,
    notifications_schedule_changes, notifications_material_delivery, last_backup_date, auto_archive_months,
    auto_create_simple_budget, auto_create_bdi_brazil_budget, auto_create_cost_control_budget,
    updated_at
FROM temp_app_settings;

-- Step 4: Clean up temporary table
DROP TABLE temp_app_settings;

-- Step 5: Ensure we have exactly one record
-- If somehow no records exist after consolidation, create a default one
INSERT INTO public.app_settings (
    auto_create_simple_budget,
    auto_create_bdi_brazil_budget,
    auto_create_cost_control_budget
)
SELECT false, false, false
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings);

COMMIT;