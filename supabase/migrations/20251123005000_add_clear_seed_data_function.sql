-- Utility: clear seed data using security definer to bypass RLS safely

CREATE OR REPLACE FUNCTION public.clear_seed_data_records(protected_ids uuid[] DEFAULT '{}')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
  rec RECORD;
  affected INTEGER;
  tables_with_project_id TEXT[] := ARRAY[
    'project_financial_entries',
    'project_resources',
    'project_materials',
    'project_budget_items',
    'project_milestones',
    'project_phases',
    'project_activities',
    'project_purchase_requests',
    'purchase_request_items',
    'quote_requests',
    'quotes',
    'purchase_orders',
    'payment_transactions',
    'delivery_confirmations',
    'project_documents',
    'project_photos',
    'daily_logs',
    'time_logs',
    'site_issues',
    'quality_inspections',
    'project_calendar_events',
    'project_estimates',
    'project_assignments'
  ];
BEGIN
  -- Delete rows tracked in seed_data_registry (except protected)
  FOR rec IN
    SELECT entity_type, array_agg(entity_id) AS ids
    FROM seed_data_registry
    WHERE entity_type <> '_metadata'
      AND (protected_ids IS NULL OR NOT (entity_id = ANY(protected_ids)))
    GROUP BY entity_type
  LOOP
    EXECUTE format('DELETE FROM %I WHERE id = ANY($1)', rec.entity_type) USING rec.ids;
    GET DIAGNOSTICS affected = ROW_COUNT;
    deleted_count := deleted_count + COALESCE(affected, 0);
  END LOOP;

  DELETE FROM seed_data_registry
  WHERE entity_type <> '_metadata'
    AND (protected_ids IS NULL OR NOT (entity_id = ANY(protected_ids)));

  -- Delete project-scoped rows not in protected projects
  FOREACH rec IN ARRAY tables_with_project_id LOOP
    EXECUTE format(
      'DELETE FROM %I WHERE project_id IS NULL OR project_id <> ALL($1)',
      rec
    ) USING COALESCE(protected_ids, ARRAY[]::uuid[]);
    GET DIAGNOSTICS affected = ROW_COUNT;
    deleted_count := deleted_count + COALESCE(affected, 0);
  END LOOP;

  -- Delete projects themselves (excluding protected)
  DELETE FROM projects WHERE id <> ALL(COALESCE(protected_ids, ARRAY[]::uuid[]));
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + COALESCE(affected, 0);

  -- Delete remaining clients/suppliers/contractors not protected
  DELETE FROM clients WHERE id <> ALL(COALESCE(protected_ids, ARRAY[]::uuid[]));
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + COALESCE(affected, 0);

  DELETE FROM suppliers WHERE id <> ALL(COALESCE(protected_ids, ARRAY[]::uuid[]));
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + COALESCE(affected, 0);

  DELETE FROM contractors WHERE id <> ALL(COALESCE(protected_ids, ARRAY[]::uuid[]));
  GET DIAGNOSTICS affected = ROW_COUNT;
  deleted_count := deleted_count + COALESCE(affected, 0);

  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.clear_seed_data_records(uuid[]) TO authenticated;
