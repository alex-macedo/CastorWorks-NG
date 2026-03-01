-- Create missing bulk update functions for sidebar sort orders

-- Bulk update option sort orders
CREATE OR REPLACE FUNCTION bulk_update_option_sort_orders(updates JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    update_record JSONB;
BEGIN
    FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
    LOOP
        UPDATE public.sidebar_option_permissions 
        SET sort_order = (update_record->>'sort_order')::INTEGER
        WHERE option_id = update_record->>'option_id';
    END LOOP;
END;
$$;

-- Bulk update tab sort orders
CREATE OR REPLACE FUNCTION bulk_update_tab_sort_orders(updates JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    update_record JSONB;
BEGIN
    FOR update_record IN SELECT * FROM jsonb_array_elements(updates)
    LOOP
        UPDATE public.sidebar_tab_permissions 
        SET sort_order = (update_record->>'sort_order')::INTEGER
        WHERE option_id = update_record->>'option_id'
          AND tab_id = update_record->>'tab_id';
    END LOOP;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.bulk_update_option_sort_orders TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_update_tab_sort_orders TO authenticated;
