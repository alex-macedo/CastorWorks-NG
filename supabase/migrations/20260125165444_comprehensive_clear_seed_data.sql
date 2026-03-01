-- ============================================================================
-- Comprehensive Clear Seed Data Function
-- ============================================================================
-- Migration: 20260125165444
-- Description: Comprehensive seed data cleanup using seed_data_registry as source of truth
-- Fixes: project_task_statuses deletion issue by temporarily disabling trigger
-- Excludes: Configuration, permissions, roadmap* (except roadmap_items/sprints), templates
-- ============================================================================

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.clear_seed_data_records(uuid[]);

CREATE OR REPLACE FUNCTION public.clear_seed_data_records(proj_ids uuid[] DEFAULT ARRAY[]::uuid[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
  affected INTEGER;
  registry_rec RECORD;
  entity_ids uuid[];
  protected_set uuid[];
  current_entity_type TEXT;
  should_exclude BOOLEAN;
  i INTEGER;
  
  -- Deletion order: Children first, then parents, respecting FK constraints
  -- This order ensures we delete in the correct sequence
  deletion_order TEXT[] := ARRAY[
    -- Level 1: Deepest children (comments, attachments, participants)
    'photo_comments', 'message_attachments', 'conversation_participants', 'chat_messages',
    'communication_attachments', 'communication_participants', 'meeting_action_items',
    'meeting_decisions', 'meeting_agendas', 'meeting_attendees', 'quote_approvals',
    'delivery_confirmations', 'payment_transactions', 'scenario_activities',
    'estimate_files', 'invoice_conversations', 'payment_reminders', 'folder_client_access',
    'document_permissions', 'document_version_history', 'document_activity_log',
    
    -- Level 2: Intermediate children (items, requests, quotes)
    'purchase_request_items', 'quote_requests', 'quotes', 'project_photos', 'project_documents',
    'activity_resource_assignments', 'project_activities', 'project_milestones',
    'project_resources', 'project_materials', 'project_budget_items', 'project_financial_entries',
    'project_phases', 'project_income', 'project_expenses', 'project_purchase_requests',
    'purchase_orders', 'time_logs', 'daily_logs', 'site_issues', 'quality_inspections',
    'project_calendar_events', 'cost_predictions', 'opportunity_briefings', 'opportunity_meetings',
    'opportunities', 'project_team_members', 'schedule_events', 'client_tasks', 'client_meetings',
    'communication_logs', 'chat_conversations', 'outbound_campaigns', 'campaign_recipients',
    'campaign_logs', 'project_estimates', 'project_folders', 'notifications', 'notification_preferences',
    'invoices', 'contacts', 'recurring_expense_patterns', 'proposals', 'schedule_scenarios',
    'project_wbs_nodes', 'project_budgets', 'roadmap_items', 'sprints', 'exchange_rates',
    
    -- Level 3: Base entities (projects handled separately in Step 2)
    'clients', 'suppliers', 'contractors'
  ];
BEGIN
  -- Build protected IDs set
  protected_set := COALESCE(proj_ids, ARRAY[]::uuid[]);

  -- ============================================================================
  -- Step 0: Disable trigger BEFORE any deletions to prevent project_task_statuses error
  -- ============================================================================
  
  -- Disable the trigger that prevents deleting the only default status
  -- This must happen BEFORE we delete projects (which cascade to project_task_statuses)
  BEGIN
    ALTER TABLE project_task_statuses DISABLE TRIGGER prevent_delete_only_default_status;
  EXCEPTION
    WHEN OTHERS THEN
      -- Trigger might not exist, continue
      NULL;
  END;

  -- ============================================================================
  -- Step 1: Delete in correct order (children first, then parents)
  -- NOTE: 'projects' is NOT in deletion_order - it's handled separately in Step 2
  -- ============================================================================
  
  -- Delete each entity type in the predefined order
  FOREACH current_entity_type IN ARRAY deletion_order
  LOOP
    -- Check if this entity type should be excluded
    should_exclude := FALSE;
    
    -- Check exact matches and patterns for excluded types
    IF current_entity_type IN (
      'app_settings', 'config_categories', 'config_settings', 'config_translations', 'config_values',
      'ai_provider_configs', 'company_profiles', 'company_settings', 'cost_codes', 'cost_codes_with_fallback',
      'currencies', 'folder_templates', 'integration_settings', 'notification_reminder_settings',
      'office_phases', 'phase_templates', 'project_wbs_template_items', 'project_wbs_templates',
      'sidebar_option_permissions', 'sidebar_tab_permissions', 'project_task_statuses',
      'roadmap_phases', 'roadmap_tasks', 'roadmap_task_updates', 'roadmap_item_attachments',
      'roadmap_item_comments', 'roadmap_item_upvotes', 'roadmap_suggestions', 'sprint_items_snapshot',
      'activity_templates', 'budget_template_cost_codes', 'budget_template_items',
      'budget_template_phases', 'budget_templates', 'sinapi_items', 'sinapi_templates',
      'admin_events', 'approval_tokens', 'ai_usage_logs', 'reminder_logs', 'seed_data_registry'
    ) THEN
      should_exclude := TRUE;
    END IF;
    
    -- Check pattern matches (tax_%, inss_%)
    IF current_entity_type LIKE 'tax_%' OR current_entity_type LIKE 'inss_%' THEN
      should_exclude := TRUE;
    END IF;
    
    -- Skip excluded types (but keep roadmap_items and sprints)
    IF should_exclude THEN
      CONTINUE;
    END IF;
    
    -- Get IDs from registry for this entity type
    SELECT array_agg(registry.entity_id) INTO entity_ids
    FROM seed_data_registry registry
    WHERE registry.entity_type = current_entity_type
      AND NOT (registry.entity_id = ANY(protected_set));
    
    -- Delete records if any exist
    IF entity_ids IS NOT NULL AND array_length(entity_ids, 1) > 0 THEN
      BEGIN
        -- Use dynamic SQL to delete from the table
        EXECUTE format('DELETE FROM %I WHERE id = ANY($1)', current_entity_type) USING entity_ids;
        GET DIAGNOSTICS affected = ROW_COUNT;
        deleted_count := deleted_count + COALESCE(affected, 0);
      EXCEPTION
        WHEN undefined_table THEN
          -- Table doesn't exist, skip it
          NULL;
        WHEN insufficient_privilege THEN
          -- RLS or permission issue, skip it
          NULL;
        WHEN OTHERS THEN
          -- Other errors, log but continue
          RAISE WARNING 'Error deleting from %: %', current_entity_type, SQLERRM;
      END;
    END IF;
  END LOOP;

  -- ============================================================================
  -- Step 2: Delete projects (CASCADE will delete project_task_statuses automatically)
  -- Trigger is already disabled in Step 0
  -- ============================================================================
  
  -- Delete projects (CASCADE will delete project_task_statuses automatically)
  SELECT array_agg(entity_id) INTO entity_ids
  FROM seed_data_registry
  WHERE entity_type = 'projects'
    AND NOT (entity_id = ANY(protected_set));
  
  IF entity_ids IS NOT NULL AND array_length(entity_ids, 1) > 0 THEN
    BEGIN
      DELETE FROM projects WHERE id = ANY(entity_ids);
      GET DIAGNOSTICS affected = ROW_COUNT;
      deleted_count := deleted_count + COALESCE(affected, 0);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Error deleting projects: %', SQLERRM;
    END;
  END IF;

  -- Re-enable the trigger after project deletion
  BEGIN
    ALTER TABLE project_task_statuses ENABLE TRIGGER prevent_delete_only_default_status;
  EXCEPTION
    WHEN OTHERS THEN
      -- Trigger might not exist, continue
      NULL;
  END;

  -- ============================================================================
  -- Step 3: Re-enable trigger after project deletion
  -- ============================================================================
  
  -- Re-enable the trigger after project deletion
  BEGIN
    ALTER TABLE project_task_statuses ENABLE TRIGGER prevent_delete_only_default_status;
  EXCEPTION
    WHEN OTHERS THEN
      -- Trigger might not exist, continue
      NULL;
  END;

  -- ============================================================================
  -- Step 4: Delete any remaining entities from registry (catch-all)
  -- ============================================================================
  
  -- Delete any remaining entity types not in the predefined order
  FOR registry_rec IN
    SELECT DISTINCT registry.entity_type
    FROM seed_data_registry registry
    WHERE registry.entity_type <> '_metadata'
      AND registry.entity_type <> ALL(deletion_order)
      AND registry.entity_type NOT IN (
        'app_settings', 'config_categories', 'config_settings', 'config_translations', 'config_values',
        'ai_provider_configs', 'company_profiles', 'company_settings', 'cost_codes', 'cost_codes_with_fallback',
        'currencies', 'folder_templates', 'integration_settings', 'notification_reminder_settings',
        'office_phases', 'phase_templates', 'project_wbs_template_items', 'project_wbs_templates',
        'sidebar_option_permissions', 'sidebar_tab_permissions', 'project_task_statuses',
        'roadmap_phases', 'roadmap_tasks', 'roadmap_task_updates', 'roadmap_item_attachments',
        'roadmap_item_comments', 'roadmap_item_upvotes', 'roadmap_suggestions', 'sprint_items_snapshot',
        'activity_templates', 'budget_template_cost_codes', 'budget_template_items',
        'budget_template_phases', 'budget_templates', 'sinapi_items', 'sinapi_templates',
        'admin_events', 'approval_tokens', 'ai_usage_logs', 'reminder_logs', 'seed_data_registry'
      )
      AND registry.entity_type NOT LIKE 'tax_%'
      AND registry.entity_type NOT LIKE 'inss_%'
  LOOP
    current_entity_type := registry_rec.entity_type;
    
    -- Get IDs from registry for this entity type
    SELECT array_agg(registry2.entity_id) INTO entity_ids
    FROM seed_data_registry registry2
    WHERE registry2.entity_type = current_entity_type
      AND NOT (registry2.entity_id = ANY(protected_set));
    
    -- Delete records if any exist
    IF entity_ids IS NOT NULL AND array_length(entity_ids, 1) > 0 THEN
      BEGIN
        EXECUTE format('DELETE FROM %I WHERE id = ANY($1)', current_entity_type) USING entity_ids;
        GET DIAGNOSTICS affected = ROW_COUNT;
        deleted_count := deleted_count + COALESCE(affected, 0);
      EXCEPTION
        WHEN undefined_table THEN
          NULL;
        WHEN insufficient_privilege THEN
          NULL;
        WHEN OTHERS THEN
          RAISE WARNING 'Error deleting from %: %', current_entity_type, SQLERRM;
      END;
    END IF;
  END LOOP;

  -- ============================================================================
  -- Step 5: Clean up seed_data_registry (except metadata and protected records)
  -- ============================================================================
  
  DELETE FROM seed_data_registry
  WHERE entity_type <> '_metadata'
    AND NOT (entity_id = ANY(protected_set));
  
  GET DIAGNOSTICS affected = ROW_COUNT;
  
  -- ============================================================================
  -- Step 6: Final cleanup - delete any remaining orphaned records
  -- ============================================================================
  
  -- Clean up any clients/suppliers that no longer have projects
  BEGIN
    DELETE FROM clients
    WHERE id NOT IN (SELECT DISTINCT client_id FROM projects WHERE client_id IS NOT NULL)
      AND NOT (id = ANY(protected_set));
    
    GET DIAGNOSTICS affected = ROW_COUNT;
    deleted_count := deleted_count + COALESCE(affected, 0);
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN deleted_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.clear_seed_data_records(uuid[]) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.clear_seed_data_records(uuid[]) IS 
  'Comprehensive seed data cleanup using seed_data_registry as source of truth. 
   Excludes configuration, permissions, roadmap* (except roadmap_items/sprints), and templates.
   Fixes project_task_statuses deletion by temporarily disabling trigger.';
