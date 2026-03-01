-- Migration: Add Admin Policies to All Tables
-- Description: Systematically adds admin INSERT and ALL policies to all tables with RLS enabled
-- Author: Claude Code
-- Date: 2025-11-28
-- Note: This ensures admins can seed and manage all data across the application

-- =====================================================
-- COMPREHENSIVE ADMIN POLICIES
-- =====================================================

-- This migration adds two policies to each table with RLS:
-- 1. "Admins can insert records" - Allows admins to insert any record
-- 2. "Admins can manage all records" - Allows admins full CRUD access

-- List of tables to add admin policies (based on seeding operations)
DO $$
DECLARE
  table_name TEXT;
  tables_to_process TEXT[] := ARRAY[
    'activity_templates',
    'admin_events',
    'ai_chat_messages',
    'ai_configurations',
    'ai_feedback',
    'ai_insights',
    'ai_recommendations',
    'ai_usage_logs',
    'app_settings',
    'approval_tokens',
    'architect_briefings',
    'architect_client_portal_tokens',
    'architect_meetings',
    'architect_moodboard_colors',
    'architect_moodboard_images',
    'architect_moodboard_sections',
    'architect_opportunities',
    'architect_pipeline_statuses',
    'architect_site_diary',
    'architect_task_comments',
    'architect_tasks',
    'calendar_events',
    'client_meetings',
    'client_portal_tokens',
    'client_tasks',
    'communication_attachments',
    'communication_logs',
    'communication_participants',
    'config_categories',
    'config_settings',
    'currencies',
    'clients',
    'suppliers',
    'contractors',
    'projects',
    'project_phases',
    'project_activities',
    'project_milestones',
    'project_resources',
    'project_materials',
    'project_budget_items',
    'project_financial_entries',
    'project_purchase_requests',
    'purchase_request_items',
    'quote_requests',
    'quotes',
    'purchase_orders',
    'delivery_confirmations',
    'payment_transactions',
    'time_logs',
    'daily_logs',
    'activity_resource_assignments',
    'site_issues',
    'quality_inspections',
    'project_documents',
    'project_photos',
    'roadmap_items',
    'sprints',
    'estimates',
    'project_calendar_events',
    'cost_predictions',
    'project_team_members',
    'schedule_events',
    'seed_data_registry'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables_to_process
  LOOP
    -- Check if table exists
    IF EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename = table_name
    ) THEN
      -- Drop existing admin policies if they exist
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS "Admins can insert records" ON %I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Admins can manage all records" ON %I', table_name);
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Could not drop policies for table %: %', table_name, SQLERRM;
      END;

      -- Create INSERT policy for admins
      BEGIN
        EXECUTE format(
          'CREATE POLICY "Admins can insert records" ON %I FOR INSERT WITH CHECK (has_role(auth.uid(), ''admin''))',
          table_name
        );
        RAISE NOTICE 'Created INSERT policy for table: %', table_name;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Could not create INSERT policy for table %: %', table_name, SQLERRM;
      END;

      -- Create ALL policy for admins (full CRUD access)
      BEGIN
        EXECUTE format(
          'CREATE POLICY "Admins can manage all records" ON %I FOR ALL USING (has_role(auth.uid(), ''admin''))',
          table_name
        );
        RAISE NOTICE 'Created ALL policy for table: %', table_name;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE 'Could not create ALL policy for table %: %', table_name, SQLERRM;
      END;
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping', table_name;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
-- This migration ensures that admin users have full access to all tables
-- for seeding, testing, and administrative operations while maintaining
-- RLS security for regular users.
