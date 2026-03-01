-- WhatsApp Evolution API - Roadmap Items Only
-- Sprint: 2026-05
-- Created: 2026-02-08
-- 
-- This migration inserts roadmap_items for tracking WhatsApp integration tasks
--
-- Apply with:
--   scp -i ~/.ssh/castorworks_deploy supabase/migrations/20260208_whatsapp_roadmap_items.sql castorworks:/tmp/
--   ssh -i ~/.ssh/castorworks_deploy castorworks "docker exec -i supabase-db psql -U postgres -d postgres < /tmp/20260208_whatsapp_roadmap_items.sql"

BEGIN;

DO $$
DECLARE
  v_sprint_id UUID;
  v_admin_id UUID;
  v_existing_count INTEGER;
BEGIN
  -- Get sprint ID using correct column name
  SELECT id INTO v_sprint_id 
  FROM public.sprints 
  WHERE sprint_identifier = '2026-05' 
  LIMIT 1;
  
  IF v_sprint_id IS NULL THEN
    RAISE NOTICE 'Sprint 2026-05 not found, creating it...';
    INSERT INTO public.sprints (
      sprint_identifier, year, week_number, title, description, 
      status, start_date, end_date
    ) VALUES (
      '2026-05', 2026, 5, 'Sprint 2026-05', 
      'February 2026 Sprint including WhatsApp Evolution API Integration', 
      'open', '2026-02-01', '2026-02-28'
    ) RETURNING id INTO v_sprint_id;
  END IF;
  
  RAISE NOTICE 'Using sprint ID: %', v_sprint_id;
  
  -- Get first admin user for created_by field
  SELECT id INTO v_admin_id FROM auth.users LIMIT 1;
  
  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'No users found, skipping roadmap_items creation';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Using admin ID: %', v_admin_id;
  
  -- Check if tasks already exist
  SELECT COUNT(*) INTO v_existing_count 
  FROM public.roadmap_items 
  WHERE title LIKE 'WA-%' OR title LIKE '%WhatsApp%Evolution%';
  
  IF v_existing_count > 0 THEN
    RAISE NOTICE 'WhatsApp Integration tasks already exist (% found), skipping...', v_existing_count;
    RETURN;
  END IF;
  
  -- ============================================================
  -- INSERT ROADMAP ITEMS
  -- Using correct enum values:
  --   status: backlog, next_up, in_progress, blocked, done
  --   priority: low, medium, high, urgent
  --   category: feature, bug_fix, integration, refinement
  --   estimated_effort: small, medium, large, xlarge
  -- ============================================================
  
  -- PARENT TASK: WhatsApp Integration Initiative
  INSERT INTO public.roadmap_items (
    sprint_id, title, description, status, priority, category, 
    estimated_effort, due_date, created_by
  ) VALUES (
    v_sprint_id,
    'WhatsApp Integration with Evolution API',
    E'# WhatsApp Integration Initiative\n\n## Overview\nIntegrate Evolution API for WhatsApp messaging capabilities in CastorWorks.\n\n## Phases\n1. Infrastructure Setup (2-3 days)\n2. Core Integration (3-4 days)\n3. Notification System (4-5 days)\n4. Advanced Features (5-7 days)\n5. Polish & Testing (2-3 days)\n\n## Total Estimated Effort: 80 hours\n\n## Reference\nSee docs/plans/castorworks-whatsapp-evolutionapi.md for full documentation.',
    'next_up'::roadmap_status,
    'high'::roadmap_priority,
    'integration'::roadmap_category,
    'xlarge'::roadmap_effort,
    '2026-02-25',
    v_admin_id
  );
  
  -- ============================================================
  -- PHASE 1: Infrastructure Setup Tasks
  -- ============================================================
  INSERT INTO public.roadmap_items (
    sprint_id, title, description, status, priority, category, 
    estimated_effort, due_date, created_by
  ) VALUES
  (v_sprint_id, 'WA-1.1: Deploy Evolution API Docker Container', 
   E'## Task: Deploy Evolution API Container\n\nDeploy the Evolution API Docker container on castorworks.cloud server.\n\n### Deliverables\n- docker/docker-compose.evolution.yml\n- Environment variables configured\n- Container running on port 8080\n\n### Status: COMPLETE', 
   'done'::roadmap_status, 'urgent'::roadmap_priority, 'integration'::roadmap_category,
   'small'::roadmap_effort, '2026-02-10', v_admin_id),
   
  (v_sprint_id, 'WA-1.2: Configure Nginx Reverse Proxy', 
   E'## Task: Configure Nginx Reverse Proxy\n\nSetup nginx reverse proxy for whatsapp.castorworks.cloud subdomain.\n\n### Deliverables\n- docker/nginx-whatsapp.conf\n- SSL certificate obtained\n- WebSocket support configured\n\n### Status: COMPLETE', 
   'done'::roadmap_status, 'urgent'::roadmap_priority, 'integration'::roadmap_category,
   'small'::roadmap_effort, '2026-02-10', v_admin_id),
   
  (v_sprint_id, 'WA-1.3: Create WhatsApp Database Schema', 
   E'## Task: Create Database Migration\n\nCreate Evolution API database tables with RLS policies.\n\n### Tables Created\n- evolution_instances\n- evolution_messages\n- evolution_message_templates\n- evolution_contacts\n- evolution_approval_requests\n- evolution_groups\n- evolution_notification_queue\n\n### Status: COMPLETE', 
   'done'::roadmap_status, 'urgent'::roadmap_priority, 'integration'::roadmap_category,
   'medium'::roadmap_effort, '2026-02-10', v_admin_id),
   
  (v_sprint_id, 'WA-1.4: Deploy WhatsApp Edge Functions', 
   E'## Task: Deploy Edge Functions\n\nCreate and deploy Supabase Edge Functions for Evolution API.\n\n### Functions to Create\n- evolution-webhook - Receive Evolution API webhooks\n- evolution-send - Send messages via Evolution API\n- evolution-connect - Manage instance connection\n\n### Acceptance Criteria\n- [ ] Edge functions created in supabase/functions/\n- [ ] Webhook function handles all event types\n- [ ] Send function supports text, media, location', 
   'next_up'::roadmap_status, 'urgent'::roadmap_priority, 'integration'::roadmap_category,
   'medium'::roadmap_effort, '2026-02-11', v_admin_id);
  
  -- ============================================================
  -- PHASE 2: Core Integration Tasks
  -- ============================================================
  INSERT INTO public.roadmap_items (
    sprint_id, title, description, status, priority, category, 
    estimated_effort, due_date, created_by
  ) VALUES
  (v_sprint_id, 'WA-2.1: Create WhatsApp React Hooks', 
   E'## Task: Create React Hooks\n\nCreate React hooks for Evolution API integration.\n\n### Hooks to Create\n- useEvolutionInstance - Instance status and connection\n- useEvolutionMessages - Message history and sending\n- useEvolutionTemplates - Template management\n- useEvolutionContacts - Contact management\n- useEvolutionApprovals - Approval workflow\n\n### Files\n- src/hooks/useEvolutionInstance.tsx\n- src/hooks/useEvolutionMessages.tsx\n- src/hooks/useEvolutionTemplates.tsx', 
   'backlog'::roadmap_status, 'high'::roadmap_priority, 'feature'::roadmap_category,
   'medium'::roadmap_effort, '2026-02-12', v_admin_id),
   
  (v_sprint_id, 'WA-2.2: Create WhatsApp Settings Admin Page', 
   E'## Task: Create WhatsApp Settings Page\n\nCreate admin settings page for WhatsApp configuration.\n\n### Features\n1. Instance connection status display\n2. QR code display for pairing\n3. Connection/disconnection controls\n4. Template management interface\n5. Contact opt-in management\n\n### File\n- src/pages/Admin/WhatsAppSettings.tsx', 
   'backlog'::roadmap_status, 'high'::roadmap_priority, 'feature'::roadmap_category,
   'large'::roadmap_effort, '2026-02-13', v_admin_id),
   
  (v_sprint_id, 'WA-2.3: Implement QR Code Connection Flow', 
   E'## Task: Implement QR Code Connection Flow\n\nImplement the full QR code pairing flow for WhatsApp connection.\n\n### Flow\n1. User clicks Connect WhatsApp\n2. Edge function creates Evolution API instance\n3. QR code returned and displayed\n4. User scans with WhatsApp app\n5. Webhook receives connection confirmation\n6. UI updates to show connected status', 
   'backlog'::roadmap_status, 'high'::roadmap_priority, 'feature'::roadmap_category,
   'medium'::roadmap_effort, '2026-02-13', v_admin_id),
   
  (v_sprint_id, 'WA-2.4: Test Basic Send and Receive Messages', 
   E'## Task: Test Basic Send/Receive\n\nVerify basic message sending and receiving functionality.\n\n### Test Cases\n1. Send text message to phone number\n2. Receive text message from phone\n3. Send image with caption\n4. Send document\n5. Send location', 
   'backlog'::roadmap_status, 'high'::roadmap_priority, 'integration'::roadmap_category,
   'small'::roadmap_effort, '2026-02-14', v_admin_id);
  
  -- ============================================================
  -- PHASE 3: Notification System Tasks
  -- ============================================================
  INSERT INTO public.roadmap_items (
    sprint_id, title, description, status, priority, category, 
    estimated_effort, due_date, created_by
  ) VALUES
  (v_sprint_id, 'WA-3.1: Implement Notification Template System', 
   E'## Task: Implement Notification Templates\n\nCreate a template system with variable substitution.\n\n### Template Categories\n- project_update - Project status changes\n- po_approval - Purchase order approvals\n- daily_log - Daily log notifications\n- invoice - Invoice and payment notifications\n- reminder - General reminders\n- alert - Weather and emergency alerts', 
   'backlog'::roadmap_status, 'high'::roadmap_priority, 'feature'::roadmap_category,
   'medium'::roadmap_effort, '2026-02-15', v_admin_id),
   
  (v_sprint_id, 'WA-3.2: Create Notification Trigger System', 
   E'## Task: Create Notification Trigger System\n\nCreate a system to automatically trigger WhatsApp notifications based on events.\n\n### Triggers\n1. Project status change -> Notify stakeholders\n2. New daily log -> Notify project team\n3. PO created -> Notify approvers\n4. Invoice generated -> Notify client\n5. Milestone completed -> Notify all', 
   'backlog'::roadmap_status, 'high'::roadmap_priority, 'feature'::roadmap_category,
   'large'::roadmap_effort, '2026-02-16', v_admin_id),
   
  (v_sprint_id, 'WA-3.3: Build WhatsApp Approval Workflow', 
   E'## Task: Build Approval Workflow\n\nImplement approval workflows via WhatsApp replies.\n\n### Flow\n1. System sends approval request message with code\n2. User replies with APPROVE/REJECT + code\n3. Webhook receives and validates reply\n4. System processes approval\n5. Confirmation message sent\n\n### Approval Types\n- Purchase Order approval\n- Change Order approval\n- Milestone sign-off\n- Document approval', 
   'backlog'::roadmap_status, 'high'::roadmap_priority, 'feature'::roadmap_category,
   'large'::roadmap_effort, '2026-02-17', v_admin_id),
   
  (v_sprint_id, 'WA-3.4: Add Daily Log Photo Sharing', 
   E'## Task: Add Daily Log Photo Sharing\n\nAutomatically share daily log photos with project stakeholders via WhatsApp.\n\n### Features\n- Auto-share when daily log saved\n- Include caption with description\n- Send to project group or individuals\n- Include portal link', 
   'backlog'::roadmap_status, 'medium'::roadmap_priority, 'feature'::roadmap_category,
   'small'::roadmap_effort, '2026-02-17', v_admin_id);
  
  -- ============================================================
  -- PHASE 4: Advanced Features Tasks
  -- ============================================================
  INSERT INTO public.roadmap_items (
    sprint_id, title, description, status, priority, category, 
    estimated_effort, due_date, created_by
  ) VALUES
  (v_sprint_id, 'WA-4.1: Implement Project Team Group Creation', 
   E'## Task: Project Team Group Creation\n\nAutomatically create WhatsApp groups for project teams.\n\n### Features\n- Create group on project creation\n- Add team members automatically\n- Set group name and description\n- Update group when team changes\n- Post announcements to group', 
   'backlog'::roadmap_status, 'medium'::roadmap_priority, 'feature'::roadmap_category,
   'large'::roadmap_effort, '2026-02-19', v_admin_id),
   
  (v_sprint_id, 'WA-4.2: Implement Automated Status Updates', 
   E'## Task: Automated Status Updates\n\nSend automated project status updates via WhatsApp.\n\n### Update Types\n- Weekly progress summary\n- Milestone completions\n- Budget alerts\n- Schedule changes\n- Weather impacts', 
   'backlog'::roadmap_status, 'medium'::roadmap_priority, 'feature'::roadmap_category,
   'medium'::roadmap_effort, '2026-02-20', v_admin_id),
   
  (v_sprint_id, 'WA-4.3: Implement Payment Notifications', 
   E'## Task: Payment Notifications\n\nSend payment-related notifications via WhatsApp.\n\n### Notification Types\n- Invoice generated (with PDF)\n- Payment due reminder\n- Payment received confirmation\n- Overdue payment alert\n- PIX/payment link included', 
   'backlog'::roadmap_status, 'medium'::roadmap_priority, 'feature'::roadmap_category,
   'small'::roadmap_effort, '2026-02-21', v_admin_id),
   
  (v_sprint_id, 'WA-4.4: Integrate Weather Alerts', 
   E'## Task: Weather Alerts Integration\n\nSend weather alerts to project teams via WhatsApp.\n\n### Features\n- Severe weather warnings\n- Rain forecasts\n- Temperature extremes\n- Location-based alerts', 
   'backlog'::roadmap_status, 'low'::roadmap_priority, 'feature'::roadmap_category,
   'small'::roadmap_effort, '2026-02-22', v_admin_id);
  
  -- ============================================================
  -- PHASE 5: Polish & Testing Tasks
  -- ============================================================
  INSERT INTO public.roadmap_items (
    sprint_id, title, description, status, priority, category, 
    estimated_effort, due_date, created_by
  ) VALUES
  (v_sprint_id, 'WA-5.1: Create E2E Tests for WhatsApp Integration', 
   E'## Task: E2E Testing\n\nCreate comprehensive E2E tests for WhatsApp integration.\n\n### Test Scenarios\n1. Admin connects WhatsApp instance\n2. Send text message flow\n3. Receive message and process\n4. Approval workflow complete\n5. Template management CRUD\n6. Contact opt-in/opt-out', 
   'backlog'::roadmap_status, 'high'::roadmap_priority, 'integration'::roadmap_category,
   'large'::roadmap_effort, '2026-02-23', v_admin_id),
   
  (v_sprint_id, 'WA-5.2: Optimize WhatsApp Integration Performance', 
   E'## Task: Performance Optimization\n\nOptimize WhatsApp integration for performance and reliability.\n\n### Areas\n- Message queue for reliability\n- Batch message sending\n- Connection pooling\n- Cache optimization\n- Error retry logic', 
   'backlog'::roadmap_status, 'medium'::roadmap_priority, 'refinement'::roadmap_category,
   'medium'::roadmap_effort, '2026-02-24', v_admin_id),
   
  (v_sprint_id, 'WA-5.3: Create WhatsApp Integration Documentation', 
   E'## Task: Create Documentation\n\nCreate comprehensive documentation for WhatsApp integration.\n\n### Documents\n1. Admin setup guide\n2. User guide for notifications\n3. API reference for developers\n4. Troubleshooting guide', 
   'backlog'::roadmap_status, 'high'::roadmap_priority, 'refinement'::roadmap_category,
   'medium'::roadmap_effort, '2026-02-24', v_admin_id),
   
  (v_sprint_id, 'WA-5.4: Create WhatsApp User Guide', 
   E'## Task: Create User Guide\n\nCreate end-user guide for WhatsApp features.\n\n### Topics\n1. How to connect WhatsApp\n2. Managing notifications\n3. Approval commands\n4. Opting in/out\n5. Troubleshooting', 
   'backlog'::roadmap_status, 'medium'::roadmap_priority, 'refinement'::roadmap_category,
   'small'::roadmap_effort, '2026-02-25', v_admin_id);
  
  RAISE NOTICE 'SUCCESS: Created 21 WhatsApp Integration roadmap_items in Sprint 2026-05';
END $$;

COMMIT;
