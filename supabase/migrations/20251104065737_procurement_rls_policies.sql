-- Procurement Module RLS Policies
-- Story 0.1: RLS Policy Hardening & Validation for Procurement Module
-- Generated: 2025-11-04
-- Phase: Prerequisite for Epic 1-4
--
-- This migration creates comprehensive Row Level Security (RLS) policies for all
-- procurement tables to enforce tenant data isolation and prevent cross-project data leaks.
--
-- Tables covered: quote_requests, approval_tokens, purchase_orders, delivery_confirmations,
--                 delivery_photos, delivery_items, payment_transactions

BEGIN;

-- =====================================================================
-- SECTION 1: Helper Functions for Project Access Inheritance
-- =====================================================================

-- Get project_id from quote_request via purchase_request
-- Used by: quote_requests RLS policies
-- Pattern: Follows existing project_id_for_purchase_request pattern
DO $plpgsql$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'quote_requests' AND n.nspname = 'public'
  ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.project_id_for_quote_request(_request_id UUID)
      RETURNS UUID
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT pr.project_id
        FROM public.quote_requests qr
        JOIN public.project_purchase_requests pr ON pr.id = qr.purchase_request_id
        WHERE qr.id = _request_id;
      $body$;
    $fn$;
  ELSE
    RAISE NOTICE 'quote_requests table not found; skipping project_id_for_quote_request()';
  END IF;
END $plpgsql$;

-- Get project_id from purchase_order via purchase_request
-- Used by: purchase_orders RLS policies
-- Pattern: Follows existing project_id_for_purchase_request pattern
DO $plpgsql$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'purchase_orders' AND n.nspname = 'public'
  ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.project_id_for_purchase_order(_order_id UUID)
      RETURNS UUID
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT pr.project_id
        FROM public.purchase_orders po
        JOIN public.project_purchase_requests pr ON pr.id = po.purchase_request_id
        WHERE po.id = _order_id;
      $body$;
    $fn$;
  ELSE
    RAISE NOTICE 'purchase_orders table not found; skipping project_id_for_purchase_order()';
  END IF;
END $plpgsql$;

-- Get project_id from delivery_confirmation via purchase_order
-- Used by: delivery_confirmations, delivery_photos, delivery_items RLS policies
-- Pattern: Follows existing project_id_for_purchase_request pattern
DO $plpgsql$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'delivery_confirmations' AND n.nspname = 'public'
  ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.project_id_for_delivery_confirmation(_delivery_id UUID)
      RETURNS UUID
      LANGUAGE sql
      STABLE
      SECURITY DEFINER
      SET search_path = public
      AS $body$
        SELECT pr.project_id
        FROM public.delivery_confirmations dc
        JOIN public.purchase_orders po ON po.id = dc.purchase_order_id
        JOIN public.project_purchase_requests pr ON pr.id = po.purchase_request_id
        WHERE dc.id = _delivery_id;
      $body$;
    $fn$;
  ELSE
    RAISE NOTICE 'delivery_confirmations table not found; skipping project_id_for_delivery_confirmation()';
  END IF;
END $plpgsql$;

-- =====================================================================
-- SECTION 2: quote_requests RLS Policies
-- =====================================================================
-- Access Logic: Project members can view quote requests for their projects
--               Project managers/admins can manage (INSERT/UPDATE/DELETE)
-- Affected Roles: project_manager, admin, and project team members

DO $$
BEGIN
  IF to_regclass('public.quote_requests') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Project members can view quote requests" ON public.quote_requests;
    DROP POLICY IF EXISTS "Project managers can insert quote requests" ON public.quote_requests;
    DROP POLICY IF EXISTS "Project managers can update quote requests" ON public.quote_requests;
    DROP POLICY IF EXISTS "Project managers can delete quote requests" ON public.quote_requests;

    -- SELECT: Any project member can view quote requests for accessible projects
    CREATE POLICY "Project members can view quote requests"
      ON public.quote_requests
      FOR SELECT
      USING (
        purchase_request_id IN (
          SELECT pr.id FROM public.project_purchase_requests pr
          WHERE public.has_project_access(auth.uid(), pr.project_id)
        )
      );

    -- INSERT: Only project admins (PM/admin roles) can create quote requests
    CREATE POLICY "Project managers can insert quote requests"
      ON public.quote_requests
      FOR INSERT
      WITH CHECK (
        purchase_request_id IN (
          SELECT pr.id FROM public.project_purchase_requests pr
          WHERE public.has_project_admin_access(auth.uid(), pr.project_id)
        )
      );

    -- UPDATE: Only project admins can update quote requests
    CREATE POLICY "Project managers can update quote requests"
      ON public.quote_requests
      FOR UPDATE
      USING (
        purchase_request_id IN (
          SELECT pr.id FROM public.project_purchase_requests pr
          WHERE public.has_project_admin_access(auth.uid(), pr.project_id)
        )
      )
      WITH CHECK (
        purchase_request_id IN (
          SELECT pr.id FROM public.project_purchase_requests pr
          WHERE public.has_project_admin_access(auth.uid(), pr.project_id)
        )
      );

    -- DELETE: Only project admins can delete quote requests
    CREATE POLICY "Project managers can delete quote requests"
      ON public.quote_requests
      FOR DELETE
      USING (
        purchase_request_id IN (
          SELECT pr.id FROM public.project_purchase_requests pr
          WHERE public.has_project_admin_access(auth.uid(), pr.project_id)
        )
      );
  ELSE
    RAISE NOTICE 'quote_requests table not found; skipping quote_requests RLS policies';
  END IF;
END $$;

-- =====================================================================
-- SECTION 3: approval_tokens RLS Policies
-- =====================================================================
-- Access Logic: Public read access for token validation
--               Edge functions handle expiration validation in application logic
-- Affected Roles: Public (no authentication required for SELECT)
-- Security Note: No row-level restriction - edge functions validate expiration

DO $$
BEGIN
  IF to_regclass('public.approval_tokens') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public can read approval tokens" ON public.approval_tokens;

    -- SELECT: Scope reads to project members with access to the parent purchase request
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'approval_tokens'
        AND policyname = 'Project members can read approval tokens'
    ) THEN
      CREATE POLICY "Project members can read approval tokens"
        ON public.approval_tokens
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.project_purchase_requests pr
            WHERE pr.id = purchase_request_id
              AND public.has_project_access(auth.uid(), pr.project_id)
          )
        );
    END IF;
  ELSE
    RAISE NOTICE 'approval_tokens table not found; skipping approval_token policies';
  END IF;
END $$;

-- =====================================================================
-- SECTION 4: purchase_orders RLS Policies
-- =====================================================================
-- Access Logic: Project admin access (project_manager, admin roles)
--               Only authorized project managers can create/manage purchase orders
-- Affected Roles: project_manager, admin

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'purchase_orders' AND n.nspname = 'public'
  ) THEN
    DROP POLICY IF EXISTS "Project managers can view purchase orders" ON public.purchase_orders;
    DROP POLICY IF EXISTS "Project managers can insert purchase orders" ON public.purchase_orders;
    DROP POLICY IF EXISTS "Project managers can update purchase orders" ON public.purchase_orders;
    DROP POLICY IF EXISTS "Project managers can delete purchase orders" ON public.purchase_orders;

    CREATE POLICY "Project managers can view purchase orders"
      ON public.purchase_orders
      FOR SELECT
      USING (
        purchase_request_id IN (
          SELECT pr.id FROM public.project_purchase_requests pr
          WHERE public.has_project_admin_access(auth.uid(), pr.project_id)
        )
      );

    CREATE POLICY "Project managers can insert purchase orders"
      ON public.purchase_orders
      FOR INSERT
      WITH CHECK (
        purchase_request_id IN (
          SELECT pr.id FROM public.project_purchase_requests pr
          WHERE public.has_project_admin_access(auth.uid(), pr.project_id)
        )
      );

    CREATE POLICY "Project managers can update purchase orders"
      ON public.purchase_orders
      FOR UPDATE
      USING (
        purchase_request_id IN (
          SELECT pr.id FROM public.project_purchase_requests pr
          WHERE public.has_project_admin_access(auth.uid(), pr.project_id)
        )
      )
      WITH CHECK (
        purchase_request_id IN (
          SELECT pr.id FROM public.project_purchase_requests pr
          WHERE public.has_project_admin_access(auth.uid(), pr.project_id)
        )
      );

    CREATE POLICY "Project managers can delete purchase orders"
      ON public.purchase_orders
      FOR DELETE
      USING (
        purchase_request_id IN (
          SELECT pr.id FROM public.project_purchase_requests pr
          WHERE public.has_project_admin_access(auth.uid(), pr.project_id)
        )
      );
  ELSE
    RAISE NOTICE 'purchase_orders table not found; skipping purchase_orders RLS policies';
  END IF;
END $$;

-- =====================================================================
-- SECTION 5: delivery_confirmations RLS Policies
-- =====================================================================
-- Access Logic: Supervisors and admins can create/read delivery confirmations
--               Access scoped to assigned projects via purchase_order relationship
-- Affected Roles: supervisor, admin

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'delivery_confirmations' AND n.nspname = 'public'
  ) THEN
    DROP POLICY IF EXISTS "Supervisors can view delivery confirmations" ON public.delivery_confirmations;
    DROP POLICY IF EXISTS "Supervisors can create delivery confirmations" ON public.delivery_confirmations;

    CREATE POLICY "Supervisors can view delivery confirmations"
      ON public.delivery_confirmations
      FOR SELECT
      USING (
        (public.has_role(auth.uid(), 'supervisor'::app_role) OR
         public.has_role(auth.uid(), 'admin'::app_role))
        AND
        purchase_order_id IN (
          SELECT po.id FROM public.purchase_orders po
          JOIN public.project_purchase_requests pr ON pr.id = po.purchase_request_id
          WHERE public.has_project_access(auth.uid(), pr.project_id)
        )
      );

    CREATE POLICY "Supervisors can create delivery confirmations"
      ON public.delivery_confirmations
      FOR INSERT
      WITH CHECK (
        (public.has_role(auth.uid(), 'supervisor'::app_role) OR
         public.has_role(auth.uid(), 'admin'::app_role))
        AND
        purchase_order_id IN (
          SELECT po.id FROM public.purchase_orders po
          JOIN public.project_purchase_requests pr ON pr.id = po.purchase_request_id
          WHERE public.has_project_access(auth.uid(), pr.project_id)
        )
      );
  ELSE
    RAISE NOTICE 'delivery_confirmations table not found; skipping delivery_confirmations policies';
  END IF;
END $$;

-- =====================================================================
-- SECTION 6: delivery_photos RLS Policies
-- =====================================================================
-- Access Logic: Inherit access from parent delivery_confirmation
--               If user can access delivery_confirmation, they can access photos
-- Affected Roles: Same as delivery_confirmations (supervisor, admin, project members)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'delivery_photos' AND n.nspname = 'public'
  ) THEN
    DROP POLICY IF EXISTS "Project members can view delivery photos" ON public.delivery_photos;
    DROP POLICY IF EXISTS "Supervisors can insert delivery photos" ON public.delivery_photos;
    DROP POLICY IF EXISTS "Supervisors can delete delivery photos" ON public.delivery_photos;

    -- SELECT: Inherit access from parent delivery_confirmation via EXISTS subquery
    CREATE POLICY "Project members can view delivery photos"
      ON public.delivery_photos
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.delivery_confirmations dc
          WHERE dc.id = delivery_confirmation_id
            AND (
              (public.has_role(auth.uid(), 'supervisor'::app_role) OR
               public.has_role(auth.uid(), 'admin'::app_role))
              AND
              dc.purchase_order_id IN (
                SELECT po.id FROM public.purchase_orders po
                JOIN public.project_purchase_requests pr ON pr.id = po.purchase_request_id
                WHERE public.has_project_access(auth.uid(), pr.project_id)
              )
            )
        )
      );

    -- INSERT: Supervisors and admins can upload photos for their delivery confirmations
    CREATE POLICY "Supervisors can insert delivery photos"
      ON public.delivery_photos
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.delivery_confirmations dc
          WHERE dc.id = delivery_confirmation_id
            AND (
              (public.has_role(auth.uid(), 'supervisor'::app_role) OR
               public.has_role(auth.uid(), 'admin'::app_role))
              AND
              dc.purchase_order_id IN (
                SELECT po.id FROM public.purchase_orders po
                JOIN public.project_purchase_requests pr ON pr.id = po.purchase_request_id
                WHERE public.has_project_access(auth.uid(), pr.project_id)
              )
            )
        )
      );

    -- DELETE: Supervisors and admins can delete photos for their delivery confirmations
    CREATE POLICY "Supervisors can delete delivery photos"
      ON public.delivery_photos
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM public.delivery_confirmations dc
          WHERE dc.id = delivery_confirmation_id
            AND (
              (public.has_role(auth.uid(), 'supervisor'::app_role) OR
               public.has_role(auth.uid(), 'admin'::app_role))
              AND
              dc.purchase_order_id IN (
                SELECT po.id FROM public.purchase_orders po
                JOIN public.project_purchase_requests pr ON pr.id = po.purchase_request_id
                WHERE public.has_project_access(auth.uid(), pr.project_id)
              )
            )
        )
      );
  ELSE
    RAISE NOTICE 'delivery_photos table not found; skipping delivery_photos policies';
  END IF;
END $$;

-- =====================================================================
-- SECTION 7: delivery_items RLS Policies
-- =====================================================================
-- Access Logic: Inherit access from parent delivery_confirmation
--               Track per-item quantities in delivery process
-- Affected Roles: Same as delivery_confirmations (supervisor, admin)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'delivery_items' AND n.nspname = 'public'
  ) THEN
    DROP POLICY IF EXISTS "Supervisors can view delivery items" ON public.delivery_items;
    DROP POLICY IF EXISTS "Supervisors can insert delivery items" ON public.delivery_items;
    DROP POLICY IF EXISTS "Supervisors can update delivery items" ON public.delivery_items;

    CREATE POLICY "Supervisors can view delivery items"
      ON public.delivery_items
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.delivery_confirmations dc
          WHERE dc.id = delivery_confirmation_id
            AND (
              (public.has_role(auth.uid(), 'supervisor'::app_role) OR
               public.has_role(auth.uid(), 'admin'::app_role))
              AND
              dc.purchase_order_id IN (
                SELECT po.id FROM public.purchase_orders po
                JOIN public.project_purchase_requests pr ON pr.id = po.purchase_request_id
                WHERE public.has_project_access(auth.uid(), pr.project_id)
              )
            )
        )
      );

    CREATE POLICY "Supervisors can insert delivery items"
      ON public.delivery_items
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.delivery_confirmations dc
          WHERE dc.id = delivery_confirmation_id
            AND (
              (public.has_role(auth.uid(), 'supervisor'::app_role) OR
               public.has_role(auth.uid(), 'admin'::app_role))
              AND
              dc.purchase_order_id IN (
                SELECT po.id FROM public.purchase_orders po
                JOIN public.project_purchase_requests pr ON pr.id = po.purchase_request_id
                WHERE public.has_project_access(auth.uid(), pr.project_id)
              )
            )
        )
      );

    CREATE POLICY "Supervisors can update delivery items"
      ON public.delivery_items
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.delivery_confirmations dc
          WHERE dc.id = delivery_confirmation_id
            AND (
              (public.has_role(auth.uid(), 'supervisor'::app_role) OR
               public.has_role(auth.uid(), 'admin'::app_role))
              AND
              dc.purchase_order_id IN (
                SELECT po.id FROM public.purchase_orders po
                JOIN public.project_purchase_requests pr ON pr.id = po.purchase_request_id
                WHERE public.has_project_access(auth.uid(), pr.project_id)
              )
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.delivery_confirmations dc
          WHERE dc.id = delivery_confirmation_id
            AND (
              (public.has_role(auth.uid(), 'supervisor'::app_role) OR
               public.has_role(auth.uid(), 'admin'::app_role))
              AND
              dc.purchase_order_id IN (
                SELECT po.id FROM public.purchase_orders po
                JOIN public.project_purchase_requests pr ON pr.id = po.purchase_request_id
                WHERE public.has_project_access(auth.uid(), pr.project_id)
              )
            )
        )
      );
  ELSE
    RAISE NOTICE 'delivery_items table not found; skipping delivery_items policies';
  END IF;
END $$;

-- NOTE: No DELETE policy for delivery_items
-- Rationale: Delivery item records are part of the permanent audit trail and should not
-- be deleted once created. Quantity corrections are handled via UPDATE policy above.
-- This differs from delivery_photos which can be deleted (photos are supplementary evidence,
-- not core transaction data). If deletion is needed, it must be done via direct database
-- access by database administrators with appropriate justification and logging.

-- =====================================================================
-- SECTION 8: payment_transactions RLS Policies
-- =====================================================================
-- Access Logic: Dual access control
--   - Finance roles (admin, accountant) can access all payments
--   - Project members can view payments for their projects
-- Affected Roles: admin, accountant (full access), project members (read-only their projects)
-- Security Note: Payment data is restricted to project members and finance roles

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'payment_transactions' AND n.nspname = 'public'
  ) THEN
    DROP POLICY IF EXISTS "Accountants can manage payments" ON public.payment_transactions;
    DROP POLICY IF EXISTS "Project members can view payments" ON public.payment_transactions;

    -- Finance roles (admin/accountant) can manage all payments
    CREATE POLICY "Finance roles can manage all payments"
      ON public.payment_transactions
      FOR ALL
      USING (
        public.has_role(auth.uid(), 'admin'::app_role) OR
        public.has_role(auth.uid(), 'accountant'::app_role)
      )
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::app_role) OR
        public.has_role(auth.uid(), 'accountant'::app_role)
      );

    -- Project members can view payments for their projects
    CREATE POLICY "Project members can view project payments"
      ON public.payment_transactions
      FOR SELECT
      USING (
        public.has_project_access(auth.uid(), project_id)
      );

  ELSE
    RAISE NOTICE 'payment_transactions table not found; skipping payment_transactions policies';
  END IF;
END $$;

-- =====================================================================
-- SECTION 9: Review Existing RLS Policies (suppliers, quotes)
-- =====================================================================
-- Note: Reviewed existing RLS policies for suppliers and quotes tables.
--       Current policies are sufficient for procurement workflow.
--       No enhancements required at this time.
--
-- suppliers table: Has appropriate project access via purchase requests
-- quotes table: Has appropriate project access via purchase requests
--
-- If future enhancements are needed, they should be added in separate migrations
-- to maintain clear audit trail and rollback capability.

COMMIT;
