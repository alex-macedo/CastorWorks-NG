-- Update clear_seed_data_records to clean dependent tables lacking project_id

CREATE OR REPLACE FUNCTION public.clear_seed_data_records(protected_ids uuid[] DEFAULT '{}')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
  affected INTEGER;
  proj_ids uuid[];
BEGIN
  proj_ids := COALESCE(protected_ids, ARRAY[]::uuid[]);

  -- Remove seed registry entries (except protected)
  DELETE FROM seed_data_registry
  WHERE entity_type <> '_metadata'
    AND (proj_ids IS NULL OR NOT (entity_id = ANY(proj_ids)));
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + COALESCE(affected, 0);

  -- Delete purchase request items / quote requests / quotes via project purchase requests
  DELETE FROM quotes
  WHERE purchase_request_item_id IN (
    SELECT pri.id
    FROM purchase_request_items pri
    JOIN project_purchase_requests ppr ON ppr.id = pri.purchase_request_id
    WHERE NOT (ppr.project_id = ANY(proj_ids))
  );
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + COALESCE(affected, 0);

  DELETE FROM quote_requests
  WHERE purchase_request_id IN (
    SELECT id FROM project_purchase_requests WHERE NOT (project_id = ANY(proj_ids))
  );
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + COALESCE(affected, 0);

  DELETE FROM purchase_request_items
  WHERE purchase_request_id IN (
    SELECT id FROM project_purchase_requests WHERE NOT (project_id = ANY(proj_ids))
  );
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + COALESCE(affected, 0);

  DELETE FROM project_purchase_requests
  WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + COALESCE(affected, 0);

  -- Delete purchase orders and dependent records
  DELETE FROM payment_transactions WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + COALESCE(affected, 0);

  DELETE FROM delivery_confirmations
  WHERE purchase_order_id IN (
    SELECT id FROM purchase_orders WHERE NOT (project_id = ANY(proj_ids))
  );
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + COALESCE(affected, 0);

  DELETE FROM purchase_orders WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + COALESCE(affected, 0);

  -- Project-scoped tables
  DELETE FROM project_financial_entries WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM project_resources WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM project_materials WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM project_budget_items WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM project_milestones WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM project_phases WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM project_activities WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);

  DELETE FROM project_documents WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM project_photos WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM daily_logs WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM time_logs WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM site_issues WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM quality_inspections WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM project_calendar_events WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM project_estimates WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM project_assignments WHERE NOT (project_id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);

  -- Delete projects not protected
  DELETE FROM projects WHERE NOT (id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + COALESCE(affected, 0);

  -- Delete remaining clients/suppliers/contractors not protected
  DELETE FROM clients WHERE NOT (id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM suppliers WHERE NOT (id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);
  DELETE FROM contractors WHERE NOT (id = ANY(proj_ids));
  GET DIAGNOSTICS affected = ROW_COUNT; deleted_count := deleted_count + COALESCE(affected, 0);

  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_seed_data_records(uuid[]) TO authenticated;
