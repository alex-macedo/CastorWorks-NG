-- Fix foreign key constraint issue in clear_seed_data_records function
-- The issue: purchase_orders has a foreign key to quotes, so we must delete
-- purchase_orders BEFORE deleting quotes. Current order was wrong.

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.clear_seed_data_records(uuid[]);

CREATE OR REPLACE FUNCTION public.clear_seed_data_records(proj_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Delete purchase orders FIRST (before quotes, due to FK constraint)
  DELETE FROM purchase_orders
  WHERE purchase_request_id IN (
    SELECT id FROM project_purchase_requests WHERE NOT (project_id = ANY(proj_ids))
  );

  -- Now safe to delete quotes (no longer referenced by purchase_orders)
  DELETE FROM quotes
  WHERE purchase_request_item_id IN (
    SELECT pri.id
    FROM purchase_request_items pri
    JOIN project_purchase_requests ppr ON ppr.id = pri.request_id
    WHERE NOT (ppr.project_id = ANY(proj_ids))
  );

  -- Delete delivery confirmations (references purchase_orders indirectly via project)
  DELETE FROM delivery_confirmations
  WHERE project_id NOT IN (SELECT id FROM projects WHERE id = ANY(proj_ids));

  -- Delete payment transactions
  DELETE FROM payment_transactions
  WHERE project_id NOT IN (SELECT id FROM projects WHERE id = ANY(proj_ids));

  -- Delete quote requests for purchase requests not in protected projects
  DELETE FROM quote_requests
  WHERE purchase_request_id IN (
    SELECT id FROM project_purchase_requests WHERE NOT (project_id = ANY(proj_ids))
  );

  -- Delete purchase request items for purchase requests not in protected projects
  DELETE FROM purchase_request_items
  WHERE request_id IN (
    SELECT id FROM project_purchase_requests WHERE NOT (project_id = ANY(proj_ids))
  );

  -- Delete project purchase requests not in protected projects
  DELETE FROM project_purchase_requests WHERE NOT (project_id = ANY(proj_ids));

  -- Delete time logs not in protected projects
  DELETE FROM time_logs WHERE NOT (project_id = ANY(proj_ids));

  -- Delete daily logs not in protected projects
  DELETE FROM daily_logs WHERE NOT (project_id = ANY(proj_ids));

  -- Delete project budget items not in protected projects
  DELETE FROM project_budget_items WHERE NOT (project_id = ANY(proj_ids));

  -- Delete project financial entries not in protected projects
  DELETE FROM project_financial_entries WHERE NOT (project_id = ANY(proj_ids));

  -- Delete project materials not in protected projects
  DELETE FROM project_materials WHERE NOT (project_id = ANY(proj_ids));

  -- Delete project resources not in protected projects
  DELETE FROM project_resources WHERE NOT (project_id = ANY(proj_ids));

  -- Delete activity resource assignments for activities not in protected projects
  DELETE FROM activity_resource_assignments
  WHERE activity_id IN (
    SELECT id FROM project_activities WHERE NOT (project_id = ANY(proj_ids))
  );

  -- Delete project activities not in protected projects
  DELETE FROM project_activities WHERE NOT (project_id = ANY(proj_ids));

  -- Delete project milestones not in protected projects
  DELETE FROM project_milestones WHERE NOT (project_id = ANY(proj_ids));

  -- Delete project phases not in protected projects
  DELETE FROM project_phases WHERE NOT (project_id = ANY(proj_ids));

  -- Delete projects not in protected list
  DELETE FROM projects WHERE NOT (id = ANY(proj_ids));

  -- Delete clients that no longer have any projects
  DELETE FROM clients
  WHERE id NOT IN (SELECT DISTINCT client_id FROM projects WHERE client_id IS NOT NULL);

  RAISE NOTICE 'Seed data cleared successfully, protected projects: %', array_length(proj_ids, 1);
END;
$function$;

-- Verify the function was updated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'clear_seed_data_records'
  ) THEN
    RAISE NOTICE 'Function clear_seed_data_records has been updated successfully';
  ELSE
    RAISE WARNING 'Function clear_seed_data_records was not found';
  END IF;
END $$;
