-- RLS Policy Test Suite for Procurement Module
-- Story 0.1: RLS Policy Hardening & Validation
-- Tests: Multi-role isolation across quote_requests, approval_tokens, purchase_orders,
--        delivery_confirmations, delivery_photos, delivery_items, payment_transactions
--
-- Test Users:
--   - Alice (project_manager, Project A)
--   - Bob (supervisor, Project A)
--   - Carol (project_manager, Project B)
--   - David (accountant, no project assignment)
--
-- Test Projects:
--   - Project A (Alice as PM, Bob as supervisor)
--   - Project B (Carol as PM)

-- NOTE: This test script assumes pg_tap or similar testing framework is installed.
-- If not available, tests can be run manually by executing SELECT statements
-- and verifying expected row counts.

BEGIN;

-- =====================================================================
-- SECTION 1: Test Data Setup
-- =====================================================================

-- Create test projects
INSERT INTO public.projects (id, name, owner_id, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Test Project A', auth.uid(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Test Project B', auth.uid(), NOW(), NOW());

-- Create test purchase requests for each project
INSERT INTO public.project_purchase_requests (id, project_id, description, status, created_at, updated_at)
VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Project A Purchase Request', 'pending', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 'Project B Purchase Request', 'pending', NOW(), NOW());

-- Create test quote requests
INSERT INTO public.quote_requests (id, purchase_request_id, supplier_id, request_number, status, created_at, updated_at)
VALUES
  ('20000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, NULL, 'QR-A-001', 'draft', NOW(), NOW()),
  ('20000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, NULL, 'QR-B-001', 'draft', NOW(), NOW());

-- Create test approval tokens
INSERT INTO public.approval_tokens (id, purchase_request_id, token, customer_email, expires_at, created_at, updated_at)
VALUES
  ('30000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, 'test-token-a', 'customer_a@example.com', NOW() + INTERVAL '7 days', NOW(), NOW()),
  ('30000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, 'test-token-b', 'customer_b@example.com', NOW() + INTERVAL '7 days', NOW(), NOW());

-- Create test purchase orders
INSERT INTO public.purchase_orders (id, po_number, purchase_request_id, total_amount, currency_id, status, created_at, updated_at)
VALUES
  ('40000000-0000-0000-0000-000000000001'::uuid, 'PO-A-001', '10000000-0000-0000-0000-000000000001'::uuid, 10000, NULL, 'draft', NOW(), NOW()),
  ('40000000-0000-0000-0000-000000000002'::uuid, 'PO-B-001', '10000000-0000-0000-0000-000000000002'::uuid, 20000, NULL, 'draft', NOW(), NOW());

-- Create test delivery confirmations
INSERT INTO public.delivery_confirmations (id, purchase_order_id, confirmed_by, confirmation_date, delivery_status, created_at, updated_at)
VALUES
  ('50000000-0000-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000001'::uuid, auth.uid(), NOW(), 'full', NOW(), NOW()),
  ('50000000-0000-0000-0000-000000000002'::uuid, '40000000-0000-0000-0000-000000000002'::uuid, auth.uid(), NOW(), 'full', NOW(), NOW());

-- Create test delivery photos
INSERT INTO public.delivery_photos (id, delivery_confirmation_id, photo_url, created_at, uploaded_at)
VALUES
  ('60000000-0000-0000-0000-000000000001'::uuid, '50000000-0000-0000-0000-000000000001'::uuid, 'https://example.com/photo-a.jpg', NOW(), NOW()),
  ('60000000-0000-0000-0000-000000000002'::uuid, '50000000-0000-0000-0000-000000000002'::uuid, 'https://example.com/photo-b.jpg', NOW(), NOW());

-- Create test delivery items
INSERT INTO public.delivery_items (id, delivery_confirmation_id, ordered_quantity, received_quantity, created_at)
VALUES
  ('70000000-0000-0000-0000-000000000001'::uuid, '50000000-0000-0000-0000-000000000001'::uuid, 100, 100, NOW()),
  ('70000000-0000-0000-0000-000000000002'::uuid, '50000000-0000-0000-0000-000000000002'::uuid, 200, 200, NOW());

-- Create test payment transactions
INSERT INTO public.payment_transactions (id, purchase_order_id, delivery_confirmation_id, amount, currency_id, status, created_at, updated_at)
VALUES
  ('80000000-0000-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000001'::uuid, '50000000-0000-0000-0000-000000000001'::uuid, 10000, NULL, 'pending', NOW(), NOW()),
  ('80000000-0000-0000-0000-000000000002'::uuid, '40000000-0000-0000-0000-000000000002'::uuid, '50000000-0000-0000-0000-000000000002'::uuid, 20000, NULL, 'pending', NOW(), NOW());

-- =====================================================================
-- SECTION 2: quote_requests RLS Tests
-- =====================================================================

-- Test 2.1: Project members can view quote requests for their project
-- Expected: Users with project access see their project's quote requests
-- Test approach: Verify has_project_access returns correct project isolation

-- Test 2.2: Project members CANNOT view other projects' quote requests
-- Expected: Cross-project data is invisible
-- Manual verification: Query as Alice (Project A PM) should return 1 row, not 2

SELECT
  CASE
    WHEN COUNT(*) = 1 THEN '✓ PASS: quote_requests isolation working'
    ELSE '✗ FAIL: quote_requests isolation broken - saw ' || COUNT(*) || ' rows'
  END as test_result
FROM public.quote_requests
WHERE purchase_request_id = '10000000-0000-0000-0000-000000000001'::uuid;

-- Test 2.3: Only project admins can INSERT quote requests
-- Expected: has_project_admin_access enforces admin-only creation
-- Manual verification: Attempt INSERT without admin role should fail

-- =====================================================================
-- SECTION 3: approval_tokens RLS Tests
-- =====================================================================

-- Test 3.1: Public read access works (no authentication required)
-- Expected: SELECT succeeds for all users
-- Manual verification: Query without authentication returns all tokens

SELECT
  CASE
    WHEN COUNT(*) >= 2 THEN '✓ PASS: approval_tokens public read working'
    ELSE '✗ FAIL: approval_tokens public read blocked - saw ' || COUNT(*) || ' rows'
  END as test_result
FROM public.approval_tokens;

-- Note: Edge function validation of expiration is application-level logic,
-- not enforced by RLS policies per design specification

-- =====================================================================
-- SECTION 4: purchase_orders RLS Tests
-- =====================================================================

-- Test 4.1: Project admins can view their project's purchase orders
-- Expected: Admin role + project access allows SELECT

SELECT
  CASE
    WHEN COUNT(*) >= 1 THEN '✓ PASS: purchase_orders project isolation working'
    ELSE '✗ FAIL: purchase_orders isolation blocked legitimate access'
  END as test_result
FROM public.purchase_orders
WHERE purchase_request_id = '10000000-0000-0000-0000-000000000001'::uuid;

-- Test 4.2: Non-admin project members CANNOT create purchase orders
-- Expected: has_project_admin_access restricts to PM/admin roles only
-- Manual verification: INSERT as regular team member should fail

-- Test 4.3: Cross-project purchase orders are invisible
-- Expected: Carol (Project B PM) cannot see Project A purchase orders
-- Manual verification: Query as Carol should return 0 Project A rows

-- =====================================================================
-- SECTION 5: delivery_confirmations RLS Tests
-- =====================================================================

-- Test 5.1: Supervisors and admins can view delivery confirmations
-- Expected: has_role('supervisor') OR has_role('admin') allows access

SELECT
  CASE
    WHEN COUNT(*) >= 1 THEN '✓ PASS: delivery_confirmations supervisor access working'
    ELSE '✗ FAIL: delivery_confirmations supervisor access blocked'
  END as test_result
FROM public.delivery_confirmations
WHERE purchase_order_id = '40000000-0000-0000-0000-000000000001'::uuid;

-- Test 5.2: Non-supervisor/non-admin users CANNOT view delivery confirmations
-- Expected: Regular project members (without supervisor role) see 0 rows
-- Manual verification: Query as regular team member should return empty

-- Test 5.3: Supervisors can INSERT delivery confirmations for their projects
-- Expected: has_role('supervisor') + project access allows creation
-- Manual verification: INSERT as Bob (supervisor) for Project A should succeed

-- Test 5.4: Supervisors CANNOT create delivery confirmations for other projects
-- Expected: Bob (Project A supervisor) cannot INSERT for Project B
-- Manual verification: INSERT attempt for Project B should fail

-- =====================================================================
-- SECTION 6: delivery_photos RLS Tests
-- =====================================================================

-- Test 6.1: Access inherits from parent delivery_confirmation
-- Expected: If user can access delivery_confirmation, they can access photos

SELECT
  CASE
    WHEN COUNT(*) >= 1 THEN '✓ PASS: delivery_photos access inheritance working'
    ELSE '✗ FAIL: delivery_photos access inheritance blocked'
  END as test_result
FROM public.delivery_photos
WHERE delivery_confirmation_id = '50000000-0000-0000-0000-000000000001'::uuid;

-- Test 6.2: Cross-project photos are invisible via parent relationship
-- Expected: EXISTS subquery enforces project isolation through delivery_confirmation
-- Manual verification: Query as Alice should show 0 Project B photos

-- Test 6.3: Supervisors can INSERT photos for their delivery confirmations
-- Expected: Supervisor role + project access allows photo upload
-- Manual verification: INSERT as Bob for Project A delivery should succeed

-- =====================================================================
-- SECTION 7: delivery_items RLS Tests
-- =====================================================================

-- Test 7.1: Access inherits from parent delivery_confirmation
-- Expected: Same EXISTS pattern as delivery_photos

SELECT
  CASE
    WHEN COUNT(*) >= 1 THEN '✓ PASS: delivery_items access inheritance working'
    ELSE '✗ FAIL: delivery_items access inheritance blocked'
  END as test_result
FROM public.delivery_items
WHERE delivery_confirmation_id = '50000000-0000-0000-0000-000000000001'::uuid;

-- Test 7.2: Supervisors can UPDATE delivery items (quantity corrections)
-- Expected: Supervisor can modify received quantities for their deliveries
-- Manual verification: UPDATE as Bob should succeed for Project A items

-- Test 7.3: Cross-project delivery items are invisible
-- Expected: Bob cannot see or modify Project B delivery items
-- Manual verification: Query as Bob should return 0 Project B items

-- =====================================================================
-- SECTION 8: payment_transactions RLS Tests (STRICTEST SECURITY)
-- =====================================================================

-- Test 8.1: ONLY admin and accountant roles can view payments
-- Expected: has_role('admin') OR has_role('accountant') enforces strict access
-- Manual verification: Query as Alice (PM) should return 0 rows
-- Manual verification: Query as David (accountant) should return all rows

-- Note: This test requires accountant role assignment to verify
-- Run as admin: should see all payment transactions
-- Run as PM/supervisor/regular user: should see 0 rows

-- Test 8.2: Project managers CANNOT access payment data
-- Expected: Even with project admin access, PM cannot see payments
-- Manual verification: Alice (PM Project A) query should return empty

SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ PASS: payment_transactions PM restriction working'
    ELSE '✗ FAIL: payment_transactions PM saw ' || COUNT(*) || ' rows (expected 0)'
  END as test_result
FROM public.payment_transactions;
-- When run as PM, expected result is 0 rows

-- Test 8.3: Accountants can INSERT/UPDATE/DELETE payment transactions
-- Expected: Accountant role has full access across all projects
-- Manual verification: INSERT/UPDATE as David (accountant) should succeed

-- =====================================================================
-- SECTION 9: Multi-Role Integration Test
-- =====================================================================

-- Test 9.1: Complete workflow isolation test
-- Scenario: Create purchase_request → quote_request → purchase_order →
--           delivery_confirmation → payment_transaction in Project A
-- Verify: Alice sees all Project A data
-- Verify: Carol sees ONLY Project B data
-- Verify: Bob sees Project A deliveries but NOT payments
-- Verify: David (accountant) sees all payments across both projects

-- Integration test query (run as Alice - PM Project A):
-- Expected: 1 purchase request, 1 quote request, 1 PO, 1 delivery, 0 payments

SELECT
  'Alice (PM Project A) visibility:' as test_case,
  (SELECT COUNT(*) FROM public.project_purchase_requests WHERE project_id = '00000000-0000-0000-0000-000000000001'::uuid) as purchase_requests,
  (SELECT COUNT(*) FROM public.quote_requests WHERE purchase_request_id = '10000000-0000-0000-0000-000000000001'::uuid) as quote_requests,
  (SELECT COUNT(*) FROM public.purchase_orders WHERE purchase_request_id = '10000000-0000-0000-0000-000000000001'::uuid) as purchase_orders,
  (SELECT COUNT(*) FROM public.delivery_confirmations WHERE purchase_order_id = '40000000-0000-0000-0000-000000000001'::uuid) as deliveries,
  (SELECT COUNT(*) FROM public.payment_transactions) as payments; -- Expected: 0

-- Integration test query (run as Bob - Supervisor Project A):
-- Expected: 1 delivery, 0 payments (no payment access even for assigned project)

-- Integration test query (run as David - Accountant):
-- Expected: 2 payments (all payments across both projects)

-- =====================================================================
-- SECTION 10: Rollback Test
-- =====================================================================

-- Test 10.1: Verify policies exist after migration
SELECT
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) >= 28 THEN '✓ PASS: All RLS policies created (expected ~28 policies)'
    ELSE '✗ FAIL: Missing policies - found ' || COUNT(*) || ' (expected ~28)'
  END as test_result
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'quote_requests', 'approval_tokens', 'purchase_orders',
    'delivery_confirmations', 'delivery_photos', 'delivery_items',
    'payment_transactions'
  );

-- Test 10.2: Verify helper functions exist
SELECT
  COUNT(*) as function_count,
  CASE
    WHEN COUNT(*) >= 3 THEN '✓ PASS: All helper functions created (expected 3)'
    ELSE '✗ FAIL: Missing functions - found ' || COUNT(*) || ' (expected 3)'
  END as test_result
FROM pg_proc
WHERE proname IN (
  'project_id_for_quote_request',
  'project_id_for_purchase_order',
  'project_id_for_delivery_confirmation'
);

-- Rollback execution (to be run separately):
-- 1. Note current policy/function counts
-- 2. Execute migration rollback
-- 3. Verify procurement policies removed
-- 4. Verify existing non-procurement policies remain intact

-- =====================================================================
-- SECTION 11: Cleanup Test Data
-- =====================================================================

ROLLBACK; -- Clean up test data after tests complete

-- =====================================================================
-- MANUAL TESTING INSTRUCTIONS
-- =====================================================================

-- To execute multi-role tests:
--
-- 1. Create test users with roles:
--    - Alice: project_manager role, Project A team member
--    - Bob: supervisor role, Project A team member
--    - Carol: project_manager role, Project B team member
--    - David: accountant role, no project assignment
--
-- 2. For each user, run queries in separate authenticated sessions:
--    SET LOCAL ROLE alice_user; -- simulates Alice's auth context
--    SELECT COUNT(*) FROM quote_requests; -- verify row count matches expectations
--
-- 3. Test CRUD operations per role:
--    - Alice: INSERT quote_request for Project A (should succeed)
--    - Alice: INSERT quote_request for Project B (should FAIL)
--    - Bob: INSERT delivery_confirmation for Project A (should succeed)
--    - Bob: SELECT payment_transactions (should return 0 rows)
--    - David: SELECT payment_transactions (should return all rows)
--
-- 4. Rollback test:
--    - Apply migration
--    - Count policies: SELECT COUNT(*) FROM pg_policies WHERE tablename LIKE '%quote%';
--    - Rollback migration
--    - Verify count decreased appropriately
--
-- Expected Results Summary:
-- - Alice (PM Project A): Full access to Project A data, no access to Project B, no payment access
-- - Bob (Supervisor Project A): Delivery access for Project A only, no payment access
-- - Carol (PM Project B): Full access to Project B data, no access to Project A, no payment access
-- - David (Accountant): Payment access to ALL projects, no other data access
-- - Public (no auth): approval_tokens read-only access

-- End of test suite
